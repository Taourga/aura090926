-- AURA V1.3 : messagerie clinique privée et prévention des conflits de planning.

create table if not exists public.clinical_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete restrict,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists clinical_messages_conversation_idx
  on public.clinical_messages(sender_id, recipient_id, created_at desc);
create index if not exists clinical_messages_unread_idx
  on public.clinical_messages(recipient_id, created_at desc) where read_at is null;

alter table public.clinical_messages enable row level security;

drop policy if exists "participants read clinical messages" on public.clinical_messages;
create policy "participants read clinical messages" on public.clinical_messages
  for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create or replace function public.clinical_message_contacts()
returns table(id uuid, full_name text, role public.app_role)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role
  from public.profiles p
  where p.active = true
    and p.id <> auth.uid()
    and (
      (public.current_role() = 'doctor'::public.app_role and p.role = 'nurse'::public.app_role)
      or (public.current_role() = 'nurse'::public.app_role and p.role = 'doctor'::public.app_role)
    )
  order by p.full_name
$$;

create or replace function public.send_clinical_message(p_recipient_id uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_sender_role public.app_role; v_recipient_role public.app_role; v_message_id uuid;
begin
  v_sender_role := public.current_role();
  select role into v_recipient_role from public.profiles where id = p_recipient_id and active = true;
  if not (
    (v_sender_role = 'doctor'::public.app_role and v_recipient_role = 'nurse'::public.app_role)
    or (v_sender_role = 'nurse'::public.app_role and v_recipient_role = 'doctor'::public.app_role)
  ) then raise exception 'La messagerie est réservée aux échanges entre médecins et infirmiers'; end if;
  if nullif(trim(p_body), '') is null or char_length(trim(p_body)) > 2000 then
    raise exception 'Le message doit contenir entre 1 et 2 000 caractères';
  end if;
  insert into public.clinical_messages(sender_id, recipient_id, body)
  values (auth.uid(), p_recipient_id, trim(p_body)) returning id into v_message_id;
  perform public.write_audit('clinical_message_sent', 'clinical_message', v_message_id, jsonb_build_object('recipient_id', p_recipient_id));
  return v_message_id;
end; $$;

create or replace function public.mark_clinical_messages_read(p_sender_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if public.current_role() not in ('doctor'::public.app_role, 'nurse'::public.app_role) then
    raise exception 'Rôle non autorisé';
  end if;
  update public.clinical_messages set read_at = now()
  where recipient_id = auth.uid() and sender_id = p_sender_id and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

create or replace function public.create_appointment_checked(
  p_patient_id uuid, p_title text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_location text default null, p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if public.current_role() not in ('doctor'::public.app_role, 'manager'::public.app_role, 'psychologist'::public.app_role, 'provider'::public.app_role) then
    raise exception 'Rôle non autorisé';
  end if;
  if p_ends_at <= p_starts_at or nullif(trim(p_title), '') is null then raise exception 'Horaires ou intitulé invalides'; end if;
  if not exists (select 1 from public.profiles where id = p_patient_id and role = 'patient'::public.app_role and active = true) then
    raise exception 'Patient actif introuvable';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_patient_id::text));
  if exists (select 1 from public.appointments where patient_id = p_patient_id and cancelled_at is null and starts_at < p_ends_at and ends_at > p_starts_at) then
    raise exception 'Conflit : le patient a déjà un rendez-vous sur ce créneau';
  end if;
  if exists (select 1 from public.permission_requests where patient_id = p_patient_id and status in ('approved'::public.permission_status, 'departed'::public.permission_status) and departure_at < p_ends_at and return_at > p_starts_at) then
    raise exception 'Conflit : le patient est en permission sur ce créneau';
  end if;
  if exists (
    select 1 from public.activity_enrollments e join public.activities a on a.id = e.activity_id
    where e.patient_id = p_patient_id and a.active = true and a.starts_at < p_ends_at and a.ends_at > p_starts_at
  ) then raise exception 'Conflit : le patient est inscrit à une activité sur ce créneau'; end if;
  if exists (select 1 from public.appointments where creator_id = auth.uid() and cancelled_at is null and starts_at < p_ends_at and ends_at > p_starts_at) then
    raise exception 'Conflit : vous avez déjà un rendez-vous sur ce créneau';
  end if;
  if public.current_role() = 'doctor'::public.app_role and exists (
    select 1 from public.doctor_schedule_blocks where doctor_id = auth.uid() and starts_at < p_ends_at and ends_at > p_starts_at
  ) then raise exception 'Conflit : ce créneau est réservé par un rendez-vous externe'; end if;
  insert into public.appointments(patient_id, creator_id, title, starts_at, ends_at, location, notes)
  values (p_patient_id, auth.uid(), trim(p_title), p_starts_at, p_ends_at, nullif(trim(p_location), ''), nullif(trim(p_notes), ''))
  returning id into v_id;
  perform public.write_audit('appointment_created', 'appointment', v_id, jsonb_build_object('patient_id', p_patient_id));
  return v_id;
end; $$;

grant select on public.clinical_messages to authenticated;
revoke insert, update, delete on public.clinical_messages from authenticated;
revoke all on function public.clinical_message_contacts() from public, anon;
revoke all on function public.send_clinical_message(uuid, text) from public, anon;
revoke all on function public.mark_clinical_messages_read(uuid) from public, anon;
revoke all on function public.create_appointment_checked(uuid, text, timestamptz, timestamptz, text, text) from public, anon;
grant execute on function public.clinical_message_contacts() to authenticated;
grant execute on function public.send_clinical_message(uuid, text) to authenticated;
grant execute on function public.mark_clinical_messages_read(uuid) to authenticated;
grant execute on function public.create_appointment_checked(uuid, text, timestamptz, timestamptz, text, text) to authenticated;

alter function public.set_updated_at() set search_path = public;

