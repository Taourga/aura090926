-- AURA V1.4 / LOT 2E — Tenant guards for admissions, permissions, visits and audit

create or replace function public.current_facility_timezone()
returns text language sql stable security definer set search_path=public
as $$ select coalesce((select f.timezone from public.facilities f where f.id=public.current_facility_id() and f.active=true),'Europe/Paris') $$;
grant execute on function public.current_facility_timezone() to authenticated;

create or replace function public.audit(p_event text,p_type text,p_id uuid)
returns void language plpgsql security definer set search_path=public
as $$ begin insert into public.audit_events(facility_id,actor_id,event_type,entity_type,entity_id) values(public.current_facility_id(),auth.uid(),p_event,p_type,p_id); end $$;

create or replace function public.write_audit(p_event text,p_entity_type text,p_entity_id uuid,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public
as $$ begin insert into public.audit_events(facility_id,actor_id,event_type,entity_type,entity_id,metadata) values(public.current_facility_id(),auth.uid(),p_event,p_entity_type,p_entity_id,coalesce(p_metadata,'{}'::jsonb)); end $$;

create or replace function public.plan_admission(p_patient uuid,p_room text,p_expected text)
returns void language plpgsql security definer set search_path=public
as $$
declare expected timestamptz; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone();
begin
 if coalesce(public.current_role()::text,'') not in ('reception','admin') then raise exception 'Action réservée aux admissions (accueil)'; end if;
 expected:=p_expected::timestamp at time zone v_tz;
 if expected is null or expected<now() then raise exception 'Choisissez une entrée future'; end if;
 if not exists(select 1 from public.facility_memberships fm join public.profiles p on p.id=fm.user_id where fm.facility_id=v_facility and fm.user_id=p_patient and fm.active=true and fm.role='patient'::public.app_role and p.active=true) then raise exception 'Patient invalide'; end if;
 if exists(select 1 from public.patient_stays where facility_id=v_facility and patient_id=p_patient and ended_at is null) then raise exception 'Ce patient possède déjà un séjour actif'; end if;
 perform 1 from public.clinic_rooms where facility_id=v_facility and number=p_room for update;
 if not found then raise exception 'Chambre invalide'; end if;
 if exists(select 1 from public.patient_stays where facility_id=v_facility and room_number=p_room and ended_at is null and (planned_discharge_at is null or planned_discharge_at>expected)) or exists(select 1 from public.planned_admissions where facility_id=v_facility and room_number=p_room and stay_id is null and cancelled_at is null) then raise exception 'Chambre déjà occupée ou réservée sur cette période'; end if;
 insert into public.planned_admissions(facility_id,patient_id,room_number,expected_at,created_by) values(v_facility,p_patient,p_room,expected,auth.uid());
 perform public.write_audit('admission_planned','patient',p_patient,jsonb_build_object('room',p_room,'expected_at',expected));
end $$;

create or replace function public.manage_admission(p_id uuid,p_action text)
returns void language plpgsql security definer set search_path=public
as $$
declare a public.planned_admissions%rowtype; new_stay uuid; v_facility uuid:=public.current_facility_id();
begin
 if coalesce(public.current_role()::text,'') not in ('reception','admin') then raise exception 'Action réservée aux admissions'; end if;
 select * into a from public.planned_admissions where id=p_id and facility_id=v_facility for update;
 if not found or a.cancelled_at is not null or a.stay_id is not null then raise exception 'Admission déjà traitée'; end if;
 if p_action='cancel' then update public.planned_admissions set cancelled_at=now() where id=p_id and facility_id=v_facility;
 elsif p_action='arrive' then
  perform 1 from public.clinic_rooms where facility_id=v_facility and number=a.room_number for update;
  if exists(select 1 from public.patient_stays where facility_id=v_facility and room_number=a.room_number and ended_at is null) then raise exception 'La chambre n’a pas encore été libérée'; end if;
  insert into public.patient_stays(facility_id,patient_id,room_number,started_at,ward_id)
  values(v_facility,a.patient_id,a.room_number,now(),(select w.id from public.wards w where w.facility_id=v_facility and w.floor=case left(a.room_number,1) when '0' then 'RDC' when '1' then '1er étage' when '2' then '2e étage' else '3e étage' end limit 1)) returning id into new_stay;
  update public.planned_admissions set stay_id=new_stay where id=p_id and facility_id=v_facility;
 else raise exception 'Action invalide'; end if;
 perform public.write_audit('admission_'||p_action,'admission',p_id);
end $$;

create or replace function public.plan_discharge(p_stay uuid,p_expected text,p_confirm boolean default false)
returns void language plpgsql security definer set search_path=public
as $$
declare s public.patient_stays%rowtype; expected timestamptz; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone();
begin
 if coalesce(public.current_role()::text,'') not in ('nurse','admin') then raise exception 'Action réservée aux infirmiers'; end if;
 select * into s from public.patient_stays where id=p_stay and facility_id=v_facility for update;
 if not found or s.ended_at is not null then raise exception 'Séjour déjà clôturé ou introuvable'; end if;
 if p_confirm then update public.patient_stays set ended_at=now() where id=p_stay and facility_id=v_facility;
 else expected:=nullif(p_expected,'')::timestamp at time zone v_tz; if expected is not null and (expected<=s.started_at or expected<now()) then raise exception 'La sortie prévue doit être future et postérieure à l’entrée'; end if; update public.patient_stays set planned_discharge_at=expected where id=p_stay and facility_id=v_facility; end if;
 perform public.write_audit('discharge_updated','patient_stay',p_stay,jsonb_build_object('expected_at',expected,'confirmed',p_confirm));
end $$;

create or replace function public.submit_permission_request(p_departure_at timestamptz,p_return_at timestamptz,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public
as $$ declare v_stay_id uuid; v_permission_id uuid; v_facility uuid:=public.current_facility_id(); begin
 if public.current_role()<>'patient'::public.app_role then raise exception 'Seul un patient peut créer une demande'; end if;
 if p_departure_at<now()+interval '48 hours' then raise exception 'Une permission doit être demandée au moins 48 heures avant le départ souhaité'; end if;
 if p_return_at<=p_departure_at then raise exception 'Le retour doit être postérieur au départ'; end if;
 select id into v_stay_id from public.patient_stays where facility_id=v_facility and patient_id=auth.uid() and ended_at is null limit 1;
 if v_stay_id is null then raise exception 'Aucun séjour actif n''a été trouvé'; end if;
 insert into public.permission_requests(facility_id,patient_id,stay_id,departure_at,return_at,reason,status) values(v_facility,auth.uid(),v_stay_id,p_departure_at,p_return_at,nullif(trim(p_reason),''),'waiting') returning id into v_permission_id;
 perform public.write_audit('permission_submitted','permission_request',v_permission_id,jsonb_build_object('departure_at',p_departure_at,'return_at',p_return_at)); return v_permission_id;
end $$;

create or replace function public.review_permission_request(p_permission_id uuid,p_decision text,p_comment text default null)
returns public.permission_status language plpgsql security definer set search_path=public
as $$ declare r public.permission_requests%rowtype; ro public.app_role; st public.permission_status; v_facility uuid:=public.current_facility_id(); begin
 ro:=public.current_role(); if ro not in ('doctor'::public.app_role,'manager'::public.app_role) or p_decision not in ('approved','refused') then raise exception 'Action non autorisee'; end if;
 select * into r from public.permission_requests where id=p_permission_id and facility_id=v_facility for update;
 if not found or r.status not in ('submitted'::public.permission_status,'waiting'::public.permission_status) then raise exception 'Permission non modifiable'; end if;
 if ro='doctor'::public.app_role then if r.doctor_decision is not null then raise exception 'Decision deja enregistree'; end if; update public.permission_requests set doctor_decision=p_decision::public.review_decision,doctor_decided_by=auth.uid(),doctor_decided_at=now(),doctor_comment=nullif(trim(p_comment),'') where id=p_permission_id and facility_id=v_facility;
 else if r.manager_decision is not null then raise exception 'Decision deja enregistree'; end if; update public.permission_requests set manager_decision=p_decision::public.review_decision,manager_decided_by=auth.uid(),manager_decided_at=now(),manager_comment=nullif(trim(p_comment),'') where id=p_permission_id and facility_id=v_facility; end if;
 select case when doctor_decision='refused'::public.review_decision or manager_decision='refused'::public.review_decision then 'refused'::public.permission_status when doctor_decision='approved'::public.review_decision and manager_decision='approved'::public.review_decision then 'approved'::public.permission_status else 'waiting'::public.permission_status end into st from public.permission_requests where id=p_permission_id and facility_id=v_facility;
 update public.permission_requests set status=st where id=p_permission_id and facility_id=v_facility; perform public.audit('permission_reviewed','permission_request',p_permission_id); return st;
end $$;

create or replace function public.record_permission_movement(p_permission_id uuid,p_action text)
returns public.permission_status language plpgsql security definer set search_path=public
as $$ declare r public.permission_requests%rowtype; v_facility uuid:=public.current_facility_id(); begin
 if public.current_role()<>'reception'::public.app_role then raise exception 'Action reservee a accueil'; end if;
 select * into r from public.permission_requests where id=p_permission_id and facility_id=v_facility for update;
 if not found then raise exception 'Permission introuvable'; end if;
 if p_action='depart' and r.status='approved'::public.permission_status then update public.permission_requests set status='departed',departed_at=now(),departed_by=auth.uid() where id=p_permission_id and facility_id=v_facility; update public.patient_stays set presence='out' where id=r.stay_id and facility_id=v_facility; perform public.audit('patient_departed','permission_request',p_permission_id); return 'departed'::public.permission_status;
 elsif p_action='return' and r.status='departed'::public.permission_status then update public.permission_requests set status='returned',returned_at=now(),returned_by=auth.uid() where id=p_permission_id and facility_id=v_facility; update public.patient_stays set presence='present' where id=r.stay_id and facility_id=v_facility; perform public.audit('patient_returned','permission_request',p_permission_id); return 'returned'::public.permission_status;
 else raise exception 'Mouvement invalide'; end if;
end $$;

create or replace function public.submit_visit_notification(p_starts_at timestamptz,p_ends_at timestamptz,p_visitor_one_name text,p_visitor_two_name text default null)
returns uuid language plpgsql security definer set search_path=public
as $$ declare v_stay_id uuid; v_visit_id uuid; v_start_local timestamp; v_end_local timestamp; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone(); begin
 if public.current_role()<>'patient'::public.app_role then raise exception 'Seul un patient peut prévenir l''accueil d''une visite'; end if;
 if nullif(trim(p_visitor_one_name),'') is null then raise exception 'Le nom du premier visiteur est obligatoire'; end if;
 if p_ends_at<=p_starts_at or p_ends_at>p_starts_at+interval '1 hour' then raise exception 'Une visite est limitée à une heure'; end if;
 v_start_local:=p_starts_at at time zone v_tz; v_end_local:=p_ends_at at time zone v_tz;
 if v_start_local::date<>v_end_local::date or v_start_local::time<time '13:00' or v_end_local::time>time '17:00' then raise exception 'Les visites sont possibles entre 13 h et 17 h, sur un seul créneau d''une heure maximum'; end if;
 if exists(select 1 from public.visit_notifications where facility_id=v_facility and patient_id=auth.uid() and (scheduled_start at time zone v_tz)::date=v_start_local::date and status<>'cancelled'::public.visit_status) then raise exception 'Une seule visite d''une heure maximum est autorisée par patient et par jour'; end if;
 select id into v_stay_id from public.patient_stays where facility_id=v_facility and patient_id=auth.uid() and ended_at is null limit 1;
 if v_stay_id is null then raise exception 'Aucun séjour actif n''a été trouvé'; end if;
 insert into public.visit_notifications(facility_id,patient_id,scheduled_start,scheduled_end,visitor_one_name,visitor_two_name) values(v_facility,auth.uid(),p_starts_at,p_ends_at,trim(p_visitor_one_name),nullif(trim(p_visitor_two_name),'')) returning id into v_visit_id;
 perform public.write_audit('visit_notification_submitted','visit_notification',v_visit_id,jsonb_build_object('scheduled_start',p_starts_at)); return v_visit_id;
end $$;

create or replace function public.record_visit_movement(p_visit_id uuid,p_action text)
returns public.visit_status language plpgsql security definer set search_path=public
as $$ declare v_visit public.visit_notifications%rowtype; v_facility uuid:=public.current_facility_id(); begin
 if public.current_role()<>'reception'::public.app_role then raise exception 'Action réservée à l''accueil'; end if;
 select * into v_visit from public.visit_notifications where id=p_visit_id and facility_id=v_facility for update;
 if not found then raise exception 'Visite introuvable'; end if;
 if p_action='arrive' then if v_visit.status<>'scheduled'::public.visit_status then raise exception 'Cette entrée ne peut plus être enregistrée'; end if; update public.visit_notifications set status='arrived',arrived_at=now(),arrived_by=auth.uid() where id=p_visit_id and facility_id=v_facility; perform public.write_audit('visitor_arrived','visit_notification',p_visit_id,'{}'::jsonb); return 'arrived'::public.visit_status;
 elsif p_action='depart' then if v_visit.status<>'arrived'::public.visit_status then raise exception 'L''entrée doit être enregistrée avant le départ'; end if; update public.visit_notifications set status='departed',departed_at=now(),departed_by=auth.uid() where id=p_visit_id and facility_id=v_facility; perform public.write_audit('visitor_departed','visit_notification',p_visit_id,'{}'::jsonb); return 'departed'::public.visit_status; end if;
 raise exception 'Action de visite invalide';
end $$;
