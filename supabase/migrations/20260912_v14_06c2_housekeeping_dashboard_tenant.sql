-- AURA V1.4 / LOT 2G — Tenant-safe housekeeping dashboard

create or replace function public.housekeeping_dashboard(p_date date)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
 r text:=coalesce(public.current_role()::text,'');
 roster_date date;
 result jsonb;
 meals_json jsonb;
 v_facility uuid:=public.current_facility_id();
 v_tz text:=public.current_facility_timezone();
 snapshot_at timestamptz;
begin
 if r not in ('governance','technical','admin') then raise exception 'Accès non autorisé'; end if;
 if p_date is null then raise exception 'Date requise'; end if;
 perform public.housekeeping_prepare(p_date);
 select max(service_date) into roster_date from public.housekeeping_rosters where facility_id=v_facility and service_date<=p_date;
 snapshot_at:=case when p_date=(now() at time zone v_tz)::date then now() else (p_date+time '12:00') at time zone v_tz end;

 if r='technical' then
   meals_json:='[]'::jsonb;
 else
   select coalesce(jsonb_agg(jsonb_build_object('hour',x.h,'count',x.cnt) order by x.h),'[]'::jsonb)
   into meals_json
   from (
     select m.h,
       (select count(distinct pp.patient_id)
        from (
          select s.patient_id
          from public.patient_stays s
          where s.facility_id=v_facility
            and s.started_at<=(p_date+m.h) at time zone v_tz
            and (coalesce(s.ended_at,s.planned_discharge_at) is null or coalesce(s.ended_at,s.planned_discharge_at)>(p_date+m.h) at time zone v_tz)
            and not exists(
              select 1 from public.permission_requests p
              where p.facility_id=v_facility and p.stay_id=s.id
                and p.status in ('approved','departed','returned')
                and coalesce(p.departed_at,p.departure_at)<=(p_date+m.h) at time zone v_tz
                and coalesce(p.returned_at,p.return_at)>(p_date+m.h) at time zone v_tz
            )
          union
          select a.patient_id
          from public.planned_admissions a
          where a.facility_id=v_facility and a.cancelled_at is null and a.stay_id is null
            and a.expected_at<=(p_date+m.h) at time zone v_tz
        ) pp) as cnt
     from (values(time '08:00'),(time '12:00'),(time '19:00')) m(h)
   ) x;
 end if;

 select jsonb_build_object(
 'rosterDate',roster_date,
 'agents',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name) order by p.full_name) from public.profiles p join public.facility_memberships fm on fm.user_id=p.id where fm.facility_id=v_facility and fm.active=true and fm.role='technical'::public.app_role and p.active=true and (r<>'technical' or p.id=auth.uid())),'[]'::jsonb),
 'assignments',coalesce((select jsonb_agg(jsonb_build_object('area',a.area,'slot',a.slot,'agent_id',a.agent_id,'name',p.full_name)) from public.housekeeping_assignments a join public.profiles p on p.id=a.agent_id where a.facility_id=v_facility and a.service_date=roster_date and (r<>'technical' or a.agent_id=auth.uid())),'[]'::jsonb),
 'tasks',coalesce((select jsonb_agg(to_jsonb(t) order by t.area,t.target,case t.period when 'morning' then 1 when 'noon' then 2 else 3 end) from public.housekeeping_tasks t where t.facility_id=v_facility and t.service_date=p_date and t.eligible and (r<>'technical' or exists(select 1 from public.housekeeping_assignments a where a.facility_id=v_facility and a.service_date=roster_date and a.area=t.area and a.agent_id=auth.uid()))),'[]'::jsonb),
 'rooms',case when r='technical' then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('number',c.number,'floor',c.floor,'occupied',exists(select 1 from public.patient_stays s where s.facility_id=v_facility and s.room_number=c.number and s.started_at<=snapshot_at and (s.ended_at is null or s.ended_at>snapshot_at)),'entry',(select min(a.expected_at) from public.planned_admissions a where a.facility_id=v_facility and a.room_number=c.number and a.stay_id is null and a.cancelled_at is null),'exit',(select min(s.planned_discharge_at) from public.patient_stays s where s.facility_id=v_facility and s.room_number=c.number and s.ended_at is null),'skip',public.housekeeping_skip_room(c.number,p_date)) order by c.number) from public.clinic_rooms c where c.facility_id=v_facility),'[]'::jsonb) end,
 'meals',meals_json,
 'unmappedRooms',case when r='technical' then 0 else (select count(*) from public.patient_stays s where s.facility_id=v_facility and s.ended_at is null and not exists(select 1 from public.clinic_rooms c where c.facility_id=v_facility and c.number=s.room_number)) end
 ) into result;
 return result;
end $$;
