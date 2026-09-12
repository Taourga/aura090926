-- AURA V1.4 / LOT 3B — Configurable workflows and feature flags

create or replace function public.submit_permission_request(p_departure_at timestamptz,p_return_at timestamptz,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_stay_id uuid; v_permission_id uuid; v_facility uuid:=public.current_facility_id(); v_notice integer:=public.current_facility_setting_int('permissions.min_notice_hours',48);
begin
 if not public.facility_feature_enabled('permissions') then raise exception 'Le module Permissions est désactivé pour cet établissement'; end if;
 if public.current_role()<>'patient'::public.app_role then raise exception 'Seul un patient peut créer une demande'; end if;
 if p_departure_at<now()+make_interval(hours=>v_notice) then raise exception 'Une permission doit être demandée au moins % heures avant le départ souhaité',v_notice; end if;
 if p_return_at<=p_departure_at then raise exception 'Le retour doit être postérieur au départ'; end if;
 select id into v_stay_id from public.patient_stays where facility_id=v_facility and patient_id=auth.uid() and ended_at is null limit 1;
 if v_stay_id is null then raise exception 'Aucun séjour actif n''a été trouvé'; end if;
 insert into public.permission_requests(facility_id,patient_id,stay_id,departure_at,return_at,reason,status) values(v_facility,auth.uid(),v_stay_id,p_departure_at,p_return_at,nullif(trim(p_reason),''),'waiting') returning id into v_permission_id;
 perform public.write_audit('permission_submitted','permission_request',v_permission_id,jsonb_build_object('departure_at',p_departure_at,'return_at',p_return_at,'notice_hours',v_notice));
 return v_permission_id;
end $$;

create or replace function public.submit_visit_notification(p_starts_at timestamptz,p_ends_at timestamptz,p_visitor_one_name text,p_visitor_two_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_stay_id uuid; v_visit_id uuid; v_start_local timestamp; v_end_local timestamp; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone(); v_start time:=public.current_facility_setting_text('visits.start_time','13:00')::time; v_end time:=public.current_facility_setting_text('visits.end_time','17:00')::time; v_duration integer:=public.current_facility_setting_int('visits.max_duration_minutes',60); v_max_visitors integer:=public.current_facility_setting_int('visits.max_visitors',2); v_max_per_day integer:=public.current_facility_setting_int('visits.max_per_day',1); v_count integer;
begin
 if not public.facility_feature_enabled('visits') then raise exception 'Le module Visites est désactivé pour cet établissement'; end if;
 if public.current_role()<>'patient'::public.app_role then raise exception 'Seul un patient peut prévenir l''accueil d''une visite'; end if;
 if nullif(trim(p_visitor_one_name),'') is null then raise exception 'Le nom du premier visiteur est obligatoire'; end if;
 if v_max_visitors<2 and nullif(trim(p_visitor_two_name),'') is not null then raise exception 'Un seul visiteur est autorisé pour cet établissement'; end if;
 if p_ends_at<=p_starts_at or p_ends_at>p_starts_at+make_interval(mins=>v_duration) then raise exception 'La visite est limitée à % minutes',v_duration; end if;
 v_start_local:=p_starts_at at time zone v_tz; v_end_local:=p_ends_at at time zone v_tz;
 if v_start_local::date<>v_end_local::date or v_start_local::time<v_start or v_end_local::time>v_end then raise exception 'Les visites sont autorisées entre % et %',to_char(v_start,'HH24:MI'),to_char(v_end,'HH24:MI'); end if;
 select count(*) into v_count from public.visit_notifications where facility_id=v_facility and patient_id=auth.uid() and (scheduled_start at time zone v_tz)::date=v_start_local::date and status<>'cancelled'::public.visit_status;
 if v_count>=v_max_per_day then raise exception 'Le nombre maximal de visites pour cette journée est atteint'; end if;
 select id into v_stay_id from public.patient_stays where facility_id=v_facility and patient_id=auth.uid() and ended_at is null limit 1;
 if v_stay_id is null then raise exception 'Aucun séjour actif n''a été trouvé'; end if;
 insert into public.visit_notifications(facility_id,patient_id,scheduled_start,scheduled_end,visitor_one_name,visitor_two_name) values(v_facility,auth.uid(),p_starts_at,p_ends_at,trim(p_visitor_one_name),nullif(trim(p_visitor_two_name),'')) returning id into v_visit_id;
 perform public.write_audit('visit_notification_submitted','visit_notification',v_visit_id,jsonb_build_object('scheduled_start',p_starts_at,'max_duration_minutes',v_duration));
 return v_visit_id;
end $$;

create or replace function public.enroll_in_activity(p_activity_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.activities%rowtype; n integer; e uuid; v_facility uuid:=public.current_facility_id();
begin
 if not public.facility_feature_enabled('activities') then raise exception 'Le module Activités est désactivé pour cet établissement'; end if;
 if public.current_role()<>'patient'::public.app_role then raise exception 'Action réservée au patient'; end if;
 select * into a from public.activities where id=p_activity_id and facility_id=v_facility for update;
 if not found then raise exception 'Activité indisponible'; end if;
 select count(*) into n from public.activity_enrollments where facility_id=v_facility and activity_id=p_activity_id;
 if not a.active or a.starts_at<=now() or n>=a.capacity then raise exception 'Activité indisponible'; end if;
 insert into public.activity_enrollments(facility_id,activity_id,patient_id) values(v_facility,p_activity_id,auth.uid()) returning id into e;
 perform public.audit('activity_enrolled','activity',p_activity_id);
 return e;
end $$;

create or replace function public.send_clinical_message(p_recipient_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_sender_role public.app_role; v_recipient_role public.app_role; v_message_id uuid; v_facility uuid:=public.current_facility_id();
begin
 if not public.facility_feature_enabled('messaging') then raise exception 'Le module Messagerie est désactivé pour cet établissement'; end if;
 v_sender_role:=public.current_role();
 select fm.role into v_recipient_role from public.facility_memberships fm join public.profiles p on p.id=fm.user_id where fm.facility_id=v_facility and fm.user_id=p_recipient_id and fm.active=true and p.active=true;
 if not ((v_sender_role='doctor'::public.app_role and v_recipient_role='nurse'::public.app_role) or (v_sender_role='nurse'::public.app_role and v_recipient_role='doctor'::public.app_role)) then raise exception 'La messagerie est réservée aux échanges entre médecins et infirmiers'; end if;
 if nullif(trim(p_body),'') is null or char_length(trim(p_body))>2000 then raise exception 'Le message doit contenir entre 1 et 2 000 caractères'; end if;
 insert into public.clinical_messages(facility_id,sender_id,recipient_id,body) values(v_facility,auth.uid(),p_recipient_id,trim(p_body)) returning id into v_message_id;
 perform public.write_audit('clinical_message_sent','clinical_message',v_message_id,jsonb_build_object('recipient_id',p_recipient_id));
 return v_message_id;
end $$;

create or replace function public.housekeeping_prepare(p_date date)
returns void language plpgsql security definer set search_path=public as $$
declare v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone();
begin
 if not public.facility_feature_enabled('housekeeping') then return; end if;
 if p_date<>(now() at time zone v_tz)::date then return; end if;
 insert into public.housekeeping_tasks(facility_id,service_date,area,target,kind,period,eligible)
 select v_facility,p_date,'floor-'||floor,number,'room','morning',not public.housekeeping_skip_room(number,p_date) from public.clinic_rooms where facility_id=v_facility
 union all select v_facility,p_date,'lift-'||n,'Ascenseur '||n,'lift',p,true from generate_series(1,3) n cross join unnest(array['morning','noon','evening']) p
 union all select v_facility,p_date,'floor-'||n,'Toilettes étage '||n,'toilet',p,true from generate_series(0,3) n cross join unnest(array['morning','noon','evening']) p
 on conflict(facility_id,service_date,target,period) do nothing;
 update public.housekeeping_tasks set eligible=not public.housekeeping_skip_room(target,p_date) where facility_id=v_facility and service_date=p_date and kind='room' and completed_at is null;
end $$;

create or replace function public.housekeeping_save_roster(p_date date,p_floors uuid[],p_lifts uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare i integer; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone();
begin
 if not public.facility_feature_enabled('housekeeping') then raise exception 'Le module Hôtellerie est désactivé pour cet établissement'; end if;
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
returns void language plpgsql security definer set search_path=public as $$
declare t public.housekeeping_tasks%rowtype; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone(); d date:=(now() at time zone v_tz)::date; h integer:=extract(hour from now() at time zone v_tz); roster_date date; lunch_h integer:=extract(hour from public.current_facility_setting_text('meals.lunch_time','12:00')::time); dinner_h integer:=extract(hour from public.current_facility_setting_text('meals.dinner_time','19:00')::time);
begin
 if not public.facility_feature_enabled('housekeeping') then raise exception 'Le module Hôtellerie est désactivé pour cet établissement'; end if;
 if coalesce(public.current_role()::text,'')<>'technical' then raise exception 'Pointage réservé au personnel technique'; end if;
 perform public.housekeeping_prepare(d);
 select * into t from public.housekeeping_tasks where id=p_task and facility_id=v_facility for update;
 if not found or t.service_date<>d or not t.eligible then raise exception 'Cette tâche ne peut pas être validée aujourd’hui'; end if;
 select max(service_date) into roster_date from public.housekeeping_rosters where facility_id=v_facility and service_date<=d;
 if not exists(select 1 from public.housekeeping_assignments a where a.facility_id=v_facility and a.service_date=roster_date and a.area=t.area and a.agent_id=auth.uid()) then raise exception 'Cette zone ne vous est pas affectée'; end if;
 if t.completed_at is not null then return; end if;
 if (t.period='noon' and h<lunch_h) or (t.period='evening' and h<dinner_h-1) then raise exception 'Ce passage ne peut pas être pointé à l avance'; end if;
 update public.housekeeping_tasks set completed_at=clock_timestamp(),completed_by=auth.uid(),completed_name=(select full_name from public.profiles where id=auth.uid()) where id=t.id and facility_id=v_facility;
 perform public.write_audit('cleaning_completed','housekeeping_task',t.id,jsonb_build_object('target',t.target,'period',t.period));
end $$;

create or replace function public.housekeeping_dashboard(p_date date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r text:=coalesce(public.current_role()::text,''); roster_date date; result jsonb; meals_json jsonb; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone(); snapshot_at timestamptz; breakfast time:=public.current_facility_setting_text('meals.breakfast_time','08:00')::time; lunch time:=public.current_facility_setting_text('meals.lunch_time','12:00')::time; dinner time:=public.current_facility_setting_text('meals.dinner_time','19:00')::time;
begin
 if not public.facility_feature_enabled('housekeeping') then raise exception 'Le module Hôtellerie est désactivé pour cet établissement'; end if;
 if r not in ('governance','technical','admin') then raise exception 'Accès non autorisé'; end if;
 if p_date is null then raise exception 'Date requise'; end if;
 perform public.housekeeping_prepare(p_date);
 select max(service_date) into roster_date from public.housekeeping_rosters where facility_id=v_facility and service_date<=p_date;
 snapshot_at:=case when p_date=(now() at time zone v_tz)::date then now() else (p_date+time '12:00') at time zone v_tz end;
 if r='technical' then meals_json:='[]'::jsonb; else
   select coalesce(jsonb_agg(jsonb_build_object('hour',x.h,'count',x.cnt) order by x.h),'[]'::jsonb) into meals_json
   from (select m.h,(select count(distinct pp.patient_id) from (
     select s.patient_id from public.patient_stays s where s.facility_id=v_facility and s.started_at<=(p_date+m.h) at time zone v_tz and (coalesce(s.ended_at,s.planned_discharge_at) is null or coalesce(s.ended_at,s.planned_discharge_at)>(p_date+m.h) at time zone v_tz) and not exists(select 1 from public.permission_requests p where p.facility_id=v_facility and p.stay_id=s.id and p.status in ('approved','departed','returned') and coalesce(p.departed_at,p.departure_at)<=(p_date+m.h) at time zone v_tz and coalesce(p.returned_at,p.return_at)>(p_date+m.h) at time zone v_tz)
     union select a.patient_id from public.planned_admissions a where a.facility_id=v_facility and a.cancelled_at is null and a.stay_id is null and a.expected_at<=(p_date+m.h) at time zone v_tz
   ) pp) as cnt from (values(breakfast),(lunch),(dinner)) m(h)) x;
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
