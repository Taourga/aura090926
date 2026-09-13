-- AURA Demo — interactive permission calendar, edit/cancel and 24 h maximum.
-- Existing demo data was normalized before this migration so all rows satisfy the new rule.

alter table public.permission_requests drop constraint if exists permission_requests_max_24h;
alter table public.permission_requests add constraint permission_requests_max_24h
  check (return_at > departure_at and return_at <= departure_at + interval '24 hours');

create or replace function public.permission_window_available(
  p_patient_id uuid,
  p_departure_at timestamptz,
  p_return_at timestamptz,
  p_exclude_id uuid default null
) returns boolean
language sql stable security definer set search_path=public as $$
  select not exists (
    select 1 from public.permission_requests pr
    where pr.patient_id=p_patient_id
      and pr.facility_id=public.current_facility_id()
      and pr.status in ('submitted','waiting','approved','departed')
      and (p_exclude_id is null or pr.id<>p_exclude_id)
      and tstzrange(pr.departure_at,pr.return_at,'[)') && tstzrange(p_departure_at,p_return_at,'[)')
  );
$$;

create or replace function public.update_my_permission_request(
  p_permission_id uuid,
  p_departure_at timestamptz,
  p_return_at timestamptz,
  p_reason text default null
) returns public.permission_status
language plpgsql security definer set search_path=public as $$
declare
  r public.permission_requests%rowtype;
  v_notice integer:=public.current_facility_setting_int('permissions.min_notice_hours',48);
  v_facility uuid:=public.current_facility_id();
begin
  if public.current_role()<>'patient'::public.app_role then raise exception 'Action réservée au patient'; end if;
  select * into r from public.permission_requests where id=p_permission_id and patient_id=auth.uid() and facility_id=v_facility for update;
  if not found then raise exception 'Permission introuvable'; end if;
  if r.status not in ('submitted'::public.permission_status,'waiting'::public.permission_status) then raise exception 'Seule une demande en attente peut être modifiée'; end if;
  if p_return_at<=p_departure_at or p_return_at>p_departure_at+interval '24 hours' then raise exception 'Une permission doit durer au maximum 24 heures'; end if;
  if p_departure_at<now()+make_interval(hours=>v_notice) then raise exception 'La demande doit respecter le délai minimum de % heures',v_notice; end if;
  if not public.permission_window_available(auth.uid(),p_departure_at,p_return_at,p_permission_id) then raise exception 'Une autre permission chevauche déjà ce créneau'; end if;
  update public.permission_requests set
    departure_at=p_departure_at, return_at=p_return_at, reason=nullif(trim(p_reason),''),
    doctor_decision=null, doctor_decided_by=null, doctor_decided_at=null, doctor_comment=null,
    manager_decision=null, manager_decided_by=null, manager_decided_at=null, manager_comment=null,
    status='waiting', updated_at=now()
  where id=p_permission_id;
  perform public.write_audit('permission_updated','permission_request',p_permission_id,jsonb_build_object('departure_at',p_departure_at,'return_at',p_return_at));
  return 'waiting'::public.permission_status;
end $$;

create or replace function public.cancel_my_permission_request(p_permission_id uuid)
returns public.permission_status
language plpgsql security definer set search_path=public as $$
declare
  r public.permission_requests%rowtype;
  v_facility uuid:=public.current_facility_id();
begin
  if public.current_role()<>'patient'::public.app_role then raise exception 'Action réservée au patient'; end if;
  select * into r from public.permission_requests where id=p_permission_id and patient_id=auth.uid() and facility_id=v_facility for update;
  if not found then raise exception 'Permission introuvable'; end if;
  if r.status not in ('submitted'::public.permission_status,'waiting'::public.permission_status,'approved'::public.permission_status) then raise exception 'Cette permission ne peut plus être annulée'; end if;
  if r.departed_at is not null or r.departure_at<=now() then raise exception 'Une permission déjà commencée ne peut pas être annulée'; end if;
  update public.permission_requests set status='cancelled',updated_at=now() where id=p_permission_id;
  perform public.write_audit('permission_cancelled','permission_request',p_permission_id,jsonb_build_object('previous_status',r.status));
  return 'cancelled'::public.permission_status;
end $$;

create or replace function public.submit_permission_request(p_departure_at timestamptz, p_return_at timestamptz, p_reason text default null)
returns uuid
language plpgsql security definer set search_path=public as $$
declare
  v_stay_id uuid;
  v_permission_id uuid;
  v_facility uuid:=public.current_facility_id();
  v_notice integer:=public.current_facility_setting_int('permissions.min_notice_hours',48);
begin
  if not public.facility_feature_enabled('permissions') then raise exception 'Le module Permissions est désactivé pour cet établissement'; end if;
  if public.current_role()<>'patient'::public.app_role then raise exception 'Seul un patient peut créer une demande'; end if;
  if p_departure_at<now()+make_interval(hours=>v_notice) then raise exception 'Une permission doit être demandée au moins % heures avant le départ souhaité',v_notice; end if;
  if p_return_at<=p_departure_at or p_return_at>p_departure_at+interval '24 hours' then raise exception 'Une permission doit durer au maximum 24 heures'; end if;
  if not public.permission_window_available(auth.uid(),p_departure_at,p_return_at,null) then raise exception 'Une autre permission chevauche déjà ce créneau'; end if;
  select id into v_stay_id from public.patient_stays where facility_id=v_facility and patient_id=auth.uid() and ended_at is null limit 1;
  if v_stay_id is null then raise exception 'Aucun séjour actif n''a été trouvé'; end if;
  insert into public.permission_requests(facility_id,patient_id,stay_id,departure_at,return_at,reason,status)
  values(v_facility,auth.uid(),v_stay_id,p_departure_at,p_return_at,nullif(trim(p_reason),''),'waiting')
  returning id into v_permission_id;
  perform public.write_audit('permission_submitted','permission_request',v_permission_id,jsonb_build_object('departure_at',p_departure_at,'return_at',p_return_at,'notice_hours',v_notice));
  return v_permission_id;
end $$;

grant execute on function public.update_my_permission_request(uuid,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.cancel_my_permission_request(uuid) to authenticated;
grant execute on function public.permission_window_available(uuid,timestamptz,timestamptz,uuid) to authenticated;
