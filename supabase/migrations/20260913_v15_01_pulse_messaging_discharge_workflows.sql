alter table public.clinical_messages add column if not exists priority smallint not null default 1;
alter table public.clinical_messages drop constraint if exists clinical_messages_priority_check;
alter table public.clinical_messages add constraint clinical_messages_priority_check check (priority between 1 and 3);

alter table public.patient_stays add column if not exists discharge_planned_by uuid references public.profiles(id) on delete set null;
alter table public.patient_stays add column if not exists discharge_planned_at timestamptz;

create or replace function public.clinical_message_contacts()
returns table(id uuid, full_name text, role public.app_role)
language sql stable security definer set search_path='public'
as $$
  select p.id,p.full_name,fm.role
  from public.profiles p
  join public.facility_memberships fm on fm.user_id=p.id
    and fm.facility_id=public.current_facility_id() and fm.active=true
  where p.active=true and p.id<>auth.uid()
    and public.current_role() in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'governance'::public.app_role)
    and fm.role in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'governance'::public.app_role)
  order by case fm.role when 'manager'::public.app_role then 1 when 'doctor'::public.app_role then 2 when 'nurse'::public.app_role then 3 when 'governance'::public.app_role then 4 else 9 end, p.full_name
$$;

drop function if exists public.send_clinical_message(uuid,text);
create function public.send_clinical_message(p_recipient_id uuid, p_body text, p_priority integer default 1)
returns uuid language plpgsql security definer set search_path='public'
as $$
declare v_sender_role public.app_role; v_recipient_role public.app_role; v_message_id uuid; v_facility uuid:=public.current_facility_id();
begin
  if not public.facility_feature_enabled('messaging') then raise exception 'Le module Messagerie est désactivé pour cet établissement'; end if;
  v_sender_role:=public.current_role();
  if v_sender_role not in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'governance'::public.app_role) then raise exception 'Rôle non autorisé'; end if;
  select fm.role into v_recipient_role from public.facility_memberships fm join public.profiles p on p.id=fm.user_id
    where fm.facility_id=v_facility and fm.user_id=p_recipient_id and fm.active=true and p.active=true;
  if v_recipient_role not in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'governance'::public.app_role) then raise exception 'Destinataire non autorisé'; end if;
  if p_recipient_id=auth.uid() then raise exception 'Vous ne pouvez pas vous écrire à vous-même'; end if;
  if p_priority not between 1 and 3 then raise exception 'Le niveau d’importance doit être compris entre 1 et 3'; end if;
  if nullif(trim(p_body),'') is null or char_length(trim(p_body))>2000 then raise exception 'Le message doit contenir entre 1 et 2 000 caractères'; end if;
  insert into public.clinical_messages(facility_id,sender_id,recipient_id,body,priority)
  values(v_facility,auth.uid(),p_recipient_id,trim(p_body),p_priority) returning id into v_message_id;
  perform public.write_audit('clinical_message_sent','clinical_message',v_message_id,jsonb_build_object('recipient_id',p_recipient_id,'priority',p_priority));
  return v_message_id;
end $$;
grant execute on function public.send_clinical_message(uuid,text,integer) to authenticated;

create or replace function public.mark_clinical_messages_read(p_sender_id uuid)
returns integer language plpgsql security definer set search_path='public'
as $$
declare v_count integer; v_facility uuid:=public.current_facility_id();
begin
  if public.current_role() not in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'governance'::public.app_role) then raise exception 'Rôle non autorisé'; end if;
  update public.clinical_messages set read_at=now()
  where facility_id=v_facility and recipient_id=auth.uid() and sender_id=p_sender_id and read_at is null;
  get diagnostics v_count=row_count; return v_count;
end $$;

create or replace function public.plan_discharge(p_stay uuid, p_expected text, p_confirm boolean default false)
returns void language plpgsql security definer set search_path='public'
as $$
declare s public.patient_stays%rowtype; expected timestamptz; v_facility uuid:=public.current_facility_id(); v_tz text:=public.current_facility_timezone();
begin
  if coalesce(public.current_role()::text,'') not in ('doctor','nurse','admin') then raise exception 'Action réservée aux médecins et infirmiers'; end if;
  select * into s from public.patient_stays where id=p_stay and facility_id=v_facility for update;
  if not found or s.ended_at is not null then raise exception 'Séjour déjà clôturé ou introuvable'; end if;
  if p_confirm then
    update public.patient_stays set ended_at=now(), updated_at=now() where id=p_stay and facility_id=v_facility;
  else
    expected:=nullif(p_expected,'')::timestamp at time zone v_tz;
    if expected is not null and (expected<=s.started_at or expected<now()) then raise exception 'La sortie prévue doit être future et postérieure à l’entrée'; end if;
    update public.patient_stays set planned_discharge_at=expected, discharge_planned_by=case when expected is null then null else auth.uid() end, discharge_planned_at=case when expected is null then null else now() end, updated_at=now()
    where id=p_stay and facility_id=v_facility;
  end if;
  perform public.write_audit('discharge_updated','patient_stay',p_stay,jsonb_build_object('expected_at',expected,'confirmed',p_confirm));
end $$;

create or replace function public.discharge_planning_board()
returns table(stay_id uuid, patient_name text, room_number text, started_at timestamptz, planned_discharge_at timestamptz, presence text, planned_by_name text)
language plpgsql stable security definer set search_path='public'
as $$
begin
  if public.current_role() not in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'governance'::public.app_role,'technical'::public.app_role,'admin'::public.app_role,'reception'::public.app_role) then raise exception 'Rôle non autorisé'; end if;
  return query
  select s.id,p.full_name,s.room_number,s.started_at,s.planned_discharge_at,s.presence,planner.full_name
  from public.patient_stays s
  join public.profiles p on p.id=s.patient_id
  left join public.profiles planner on planner.id=s.discharge_planned_by
  where s.facility_id=public.current_facility_id() and s.ended_at is null
  order by s.planned_discharge_at nulls last,s.room_number;
end $$;
grant execute on function public.discharge_planning_board() to authenticated;
