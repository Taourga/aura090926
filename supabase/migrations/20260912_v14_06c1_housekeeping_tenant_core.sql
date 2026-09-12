-- AURA V1.4 / LOT 2F — Tenant guards for housekeeping core RPCs

create or replace function public.housekeeping_skip_room(p_room text,p_date date)
returns boolean language sql stable security definer set search_path=public
as $$
 with ctx as (select public.current_facility_id() fid, public.current_facility_timezone() tz)
 select exists(
   select 1 from public.patient_stays s join public.permission_requests p on p.stay_id=s.id and p.facility_id=s.facility_id, ctx
   where s.facility_id=ctx.fid and s.room_number=p_room and p.status in ('approved','departed','returned')
   and (coalesce(p.returned_at,p.return_at) at time zone ctx.tz)::date=p_date
   and coalesce(p.returned_at,p.return_at)-coalesce(p.departed_at,p.departure_at)>=interval '24 hours'
   and (s.ended_at is null or (s.ended_at at time zone ctx.tz)::date>=p_date)
 ) and not exists(
   select 1 from public.patient_stays s, ctx where s.facility_id=ctx.fid and s.room_number=p_room and ((s.started_at at time zone ctx.tz)::date=p_date or (coalesce(s.ended_at,s.planned_discharge_at) at time zone ctx.tz)::date=p_date)
 ) and not exists(
   select 1 from public.planned_admissions a, ctx where a.facility_id=ctx.fid and a.room_number=p_room and a.cancelled_at is null and (a.expected_at at time zone ctx.tz)::date=p_date
 )
$$;

create or replace function public.housekeeping_prepare(p_date date)
returns void language plpgsql security definer set search_path=public
as $$
declare v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone();
begin
 if p_date<>(now() at time zone v_tz)::date then return; end if;
 insert into public.housekeeping_tasks(facility_id,service_date,area,target,kind,period,eligible)
 select v_facility,p_date,'floor-'||floor,number,'room','morning',not public.housekeeping_skip_room(number,p_date) from public.clinic_rooms where facility_id=v_facility
 union all select v_facility,p_date,'lift-'||n,'Ascenseur '||n,'lift',p,true from generate_series(1,3) n cross join unnest(array['morning','noon','evening']) p
 union all select v_facility,p_date,'floor-'||n,'Toilettes étage '||n,'toilet',p,true from generate_series(0,3) n cross join unnest(array['morning','noon','evening']) p
 on conflict(facility_id,service_date,target,period) do nothing;
 update public.housekeeping_tasks set eligible=not public.housekeeping_skip_room(target,p_date) where facility_id=v_facility and service_date=p_date and kind='room' and completed_at is null;
end $$;

create or replace function public.housekeeping_save_roster(p_date date,p_floors uuid[],p_lifts uuid[])
returns void language plpgsql security definer set search_path=public
as $$
declare i integer; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone();
begin
 if coalesce(public.current_role()::text,'') not in ('governance','admin') then raise exception 'Action réservée au gouvernant'; end if;
 if p_date is null or p_date<(now() at time zone v_tz)::date then raise exception 'Les affectations passées sont conservées'; end if;
 if coalesce(cardinality(p_floors),0)<>8 or coalesce(cardinality(p_lifts),0)<>3 then raise exception 'Deux personnes par étage et une par ascenseur sont requises'; end if;
 if (select count(distinct a) from unnest(p_floors) a)<>8 then raise exception 'Les huit postes d’étage doivent être attribués à huit agents différents'; end if;
 if exists(select 1 from unnest(p_floors||p_lifts) a where a is null or not exists(select 1 from public.facility_memberships fm join public.profiles p on p.id=fm.user_id where fm.facility_id=v_facility and fm.user_id=a and fm.active=true and fm.role='technical'::public.app_role and p.active=true)) then raise exception 'Sélectionnez des agents techniques actifs de cet établissement'; end if;
 perform pg_advisory_xact_lock(hashtext('housekeeping-roster:'||v_facility::text));
 insert into public.housekeeping_rosters(facility_id,service_date,created_by) values(v_facility,p_date,auth.uid()) on conflict(facility_id,service_date) do update set created_by=auth.uid(),created_at=now();
 delete from public.housekeeping_assignments where facility_id=v_facility and service_date=p_date;
 for i in 1..8 loop insert into public.housekeeping_assignments(facility_id,service_date,area,slot,agent_id) values(v_facility,p_date,'floor-'||((i-1)/2),((i-1)%2+1)::smallint,p_floors[i]); end loop;
 for i in 1..3 loop insert into public.housekeeping_assignments(facility_id,service_date,area,slot,agent_id) values(v_facility,p_date,'lift-'||i,1,p_lifts[i]); end loop;
 perform public.write_audit('housekeeping_roster_saved','housekeeping',null,jsonb_build_object('date',p_date,'floors',p_floors,'lifts',p_lifts));
end $$;

create or replace function public.housekeeping_complete(p_task uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare t public.housekeeping_tasks%rowtype; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone(); d date:=(now() at time zone v_tz)::date; h integer:=extract(hour from now() at time zone v_tz); roster_date date;
begin
 if coalesce(public.current_role()::text,'')<>'technical' then raise exception 'Pointage réservé au personnel technique'; end if;
 perform public.housekeeping_prepare(d);
 select * into t from public.housekeeping_tasks where id=p_task and facility_id=v_facility for update;
 if not found or t.service_date<>d or not t.eligible then raise exception 'Cette tâche ne peut pas être validée aujourd’hui'; end if;
 select max(service_date) into roster_date from public.housekeeping_rosters where facility_id=v_facility and service_date<=d;
 if not exists(select 1 from public.housekeeping_assignments a where a.facility_id=v_facility and a.service_date=roster_date and a.area=t.area and a.agent_id=auth.uid()) then raise exception 'Cette zone ne vous est pas affectée'; end if;
 if t.completed_at is not null then return; end if;
 if (t.period='noon' and h<12) or (t.period='evening' and h<18) then raise exception 'Ce passage ne peut pas être pointé à l’avance (midi : 12 h, soir : 18 h)'; end if;
 update public.housekeeping_tasks set completed_at=clock_timestamp(),completed_by=auth.uid(),completed_name=(select full_name from public.profiles where id=auth.uid()) where id=t.id and facility_id=v_facility;
 perform public.write_audit('cleaning_completed','housekeeping_task',t.id,jsonb_build_object('target',t.target,'period',t.period));
end $$;
