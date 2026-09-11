-- AURA V1.1 : présences, visites et règle de demande de permission à J-2.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() <> 'patient'::public.app_role, false)
$$;

do $$ begin
  create type public.attendance_status as enum ('scheduled', 'present', 'absent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.visit_status as enum ('scheduled', 'arrived', 'departed', 'cancelled');
exception when duplicate_object then null; end $$;

alter table public.appointments
  add column if not exists attendance_status public.attendance_status not null default 'scheduled',
  add column if not exists attendance_marked_at timestamptz,
  add column if not exists attendance_marked_by uuid references public.profiles(id) on delete set null;

alter table public.activity_enrollments
  add column if not exists attendance_status public.attendance_status not null default 'scheduled',
  add column if not exists attendance_marked_at timestamptz,
  add column if not exists attendance_marked_by uuid references public.profiles(id) on delete set null;

create table if not exists public.visit_notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  visitor_one_name text not null check (char_length(trim(visitor_one_name)) >= 2),
  visitor_two_name text,
  status public.visit_status not null default 'scheduled',
  arrived_at timestamptz,
  arrived_by uuid references public.profiles(id) on delete set null,
  departed_at timestamptz,
  departed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start),
  check (scheduled_end <= scheduled_start + interval '1 hour'),
  check (departed_at is null or arrived_at is not null),
  unique(patient_id, scheduled_start)
);

create index if not exists visit_notifications_patient_idx on public.visit_notifications(patient_id, scheduled_start desc);
create index if not exists visit_notifications_reception_idx on public.visit_notifications(status, scheduled_start);

drop trigger if exists visit_notifications_updated_at on public.visit_notifications;
create trigger visit_notifications_updated_at before update on public.visit_notifications for each row execute function public.set_updated_at();

-- La vérification côté serveur est complétée ici afin de ne pas pouvoir contourner la règle depuis l'interface.
create or replace function public.submit_permission_request(p_departure_at timestamptz, p_return_at timestamptz, p_reason text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_stay_id uuid; v_permission_id uuid;
begin
  if public.current_role() <> 'patient'::public.app_role then raise exception 'Seul un patient peut créer une demande'; end if;
  if p_departure_at < now() + interval '48 hours' then raise exception 'Une permission doit être demandée au moins 48 heures avant le départ souhaité'; end if;
  if p_return_at <= p_departure_at then raise exception 'Le retour doit être postérieur au départ'; end if;
  select id into v_stay_id from public.patient_stays where patient_id = auth.uid() and ended_at is null limit 1;
  if v_stay_id is null then raise exception 'Aucun séjour actif n''a été trouvé'; end if;
  insert into public.permission_requests(patient_id, stay_id, departure_at, return_at, reason, status)
  values (auth.uid(), v_stay_id, p_departure_at, p_return_at, nullif(trim(p_reason), ''), 'waiting') returning id into v_permission_id;
  perform public.write_audit('permission_submitted', 'permission_request', v_permission_id, jsonb_build_object('departure_at', p_departure_at, 'return_at', p_return_at));
  return v_permission_id;
end; $$;

create or replace function public.mark_appointment_attendance(p_appointment_id uuid, p_status public.attendance_status)
returns void
language plpgsql security definer set search_path = public as $$
declare v_appointment public.appointments%rowtype;
begin
  if p_status not in ('present'::public.attendance_status, 'absent'::public.attendance_status) then raise exception 'Statut de présence invalide'; end if;
  select * into v_appointment from public.appointments where id = p_appointment_id for update;
  if not found then raise exception 'Rendez-vous introuvable'; end if;
  if v_appointment.creator_id <> auth.uid() and public.current_role() <> 'admin'::public.app_role then raise exception 'Seul l''intervenant ayant créé le rendez-vous peut enregistrer la présence'; end if;
  update public.appointments set attendance_status = p_status, attendance_marked_at = now(), attendance_marked_by = auth.uid() where id = p_appointment_id;
  perform public.write_audit('appointment_attendance_marked', 'appointment', p_appointment_id, jsonb_build_object('status', p_status));
end; $$;

create or replace function public.mark_activity_attendance(p_enrollment_id uuid, p_status public.attendance_status)
returns void
language plpgsql security definer set search_path = public as $$
declare v_enrollment public.activity_enrollments%rowtype;
begin
  if public.current_role() not in ('doctor'::public.app_role, 'manager'::public.app_role, 'psychologist'::public.app_role, 'provider'::public.app_role, 'governance'::public.app_role, 'coach'::public.app_role, 'admin'::public.app_role) then raise exception 'Rôle non autorisé'; end if;
  if p_status not in ('present'::public.attendance_status, 'absent'::public.attendance_status) then raise exception 'Statut de présence invalide'; end if;
  select * into v_enrollment from public.activity_enrollments where id = p_enrollment_id for update;
  if not found then raise exception 'Inscription introuvable'; end if;
  update public.activity_enrollments set attendance_status = p_status, attendance_marked_at = now(), attendance_marked_by = auth.uid() where id = p_enrollment_id;
  perform public.write_audit('activity_attendance_marked', 'activity_enrollment', p_enrollment_id, jsonb_build_object('status', p_status));
end; $$;

create or replace function public.submit_visit_notification(p_starts_at timestamptz, p_ends_at timestamptz, p_visitor_one_name text, p_visitor_two_name text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_stay_id uuid; v_visit_id uuid; v_start_local timestamp; v_end_local timestamp;
begin
  if public.current_role() <> 'patient'::public.app_role then raise exception 'Seul un patient peut prévenir l''accueil d''une visite'; end if;
  if nullif(trim(p_visitor_one_name), '') is null then raise exception 'Le nom du premier visiteur est obligatoire'; end if;
  if p_ends_at <= p_starts_at or p_ends_at > p_starts_at + interval '1 hour' then raise exception 'Une visite est limitée à une heure'; end if;
  v_start_local := p_starts_at at time zone 'Europe/Paris';
  v_end_local := p_ends_at at time zone 'Europe/Paris';
  if v_start_local::date <> v_end_local::date or v_start_local::time < time '13:00' or v_end_local::time > time '17:00' then raise exception 'Les visites sont possibles entre 13 h et 17 h, sur un seul créneau d''une heure maximum'; end if;
  if exists (select 1 from public.visit_notifications where patient_id = auth.uid() and (scheduled_start at time zone 'Europe/Paris')::date = v_start_local::date and status <> 'cancelled'::public.visit_status) then raise exception 'Une seule visite d''une heure maximum est autorisée par patient et par jour'; end if;
  select id into v_stay_id from public.patient_stays where patient_id = auth.uid() and ended_at is null limit 1;
  if v_stay_id is null then raise exception 'Aucun séjour actif n''a été trouvé'; end if;
  insert into public.visit_notifications(patient_id, scheduled_start, scheduled_end, visitor_one_name, visitor_two_name)
  values (auth.uid(), p_starts_at, p_ends_at, trim(p_visitor_one_name), nullif(trim(p_visitor_two_name), '')) returning id into v_visit_id;
  perform public.write_audit('visit_notification_submitted', 'visit_notification', v_visit_id, jsonb_build_object('scheduled_start', p_starts_at));
  return v_visit_id;
end; $$;

create or replace function public.record_visit_movement(p_visit_id uuid, p_action text)
returns public.visit_status
language plpgsql security definer set search_path = public as $$
declare v_visit public.visit_notifications%rowtype;
begin
  if public.current_role() <> 'reception'::public.app_role then raise exception 'Action réservée à l''accueil'; end if;
  select * into v_visit from public.visit_notifications where id = p_visit_id for update;
  if not found then raise exception 'Visite introuvable'; end if;
  if p_action = 'arrive' then
    if v_visit.status <> 'scheduled'::public.visit_status then raise exception 'Cette entrée ne peut plus être enregistrée'; end if;
    update public.visit_notifications set status = 'arrived', arrived_at = now(), arrived_by = auth.uid() where id = p_visit_id;
    perform public.write_audit('visitor_arrived', 'visit_notification', p_visit_id, '{}'::jsonb);
    return 'arrived'::public.visit_status;
  elsif p_action = 'depart' then
    if v_visit.status <> 'arrived'::public.visit_status then raise exception 'L''entrée doit être enregistrée avant le départ'; end if;
    update public.visit_notifications set status = 'departed', departed_at = now(), departed_by = auth.uid() where id = p_visit_id;
    perform public.write_audit('visitor_departed', 'visit_notification', p_visit_id, '{}'::jsonb);
    return 'departed'::public.visit_status;
  end if;
  raise exception 'Action de visite invalide';
end; $$;

alter table public.visit_notifications enable row level security;

drop policy if exists "profiles self or authorized staff read" on public.profiles;
create policy "profiles self or staff read patients" on public.profiles for select to authenticated using (
  id = auth.uid() or public.current_role() = 'admin'::public.app_role or (public.is_staff() and role = 'patient'::public.app_role)
);

drop policy if exists "patient and staff read enrollments" on public.activity_enrollments;
create policy "patient and staff read enrollments" on public.activity_enrollments for select to authenticated using (
  patient_id = auth.uid() or public.is_staff()
);

create policy "patient reads own visits" on public.visit_notifications for select to authenticated using (patient_id = auth.uid());
create policy "reception reads visits" on public.visit_notifications for select to authenticated using (public.current_role() = 'reception'::public.app_role or public.current_role() = 'admin'::public.app_role);

grant select on public.visit_notifications to authenticated;
revoke all on function public.mark_appointment_attendance(uuid, public.attendance_status) from public;
revoke all on function public.mark_activity_attendance(uuid, public.attendance_status) from public;
revoke all on function public.submit_visit_notification(timestamptz, timestamptz, text, text) from public;
revoke all on function public.record_visit_movement(uuid, text) from public;
grant execute on function public.mark_appointment_attendance(uuid, public.attendance_status) to authenticated;
grant execute on function public.mark_activity_attendance(uuid, public.attendance_status) to authenticated;
grant execute on function public.submit_visit_notification(timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.record_visit_movement(uuid, text) to authenticated;

-- Démonstration : une visite passée et une visite à venir pour chaque patient actif.
with demo_patients as (select id from public.profiles where role = 'patient'::public.app_role and active = true)
insert into public.visit_notifications (patient_id, scheduled_start, scheduled_end, visitor_one_name, visitor_two_name, status, arrived_at, departed_at)
select id,
  ((date_trunc('day', now() at time zone 'Europe/Paris') - interval '2 days' + interval '14 hours') at time zone 'Europe/Paris'),
  ((date_trunc('day', now() at time zone 'Europe/Paris') - interval '2 days' + interval '15 hours') at time zone 'Europe/Paris'),
  'Claire Martin', 'Julien Martin', 'departed'::public.visit_status,
  ((date_trunc('day', now() at time zone 'Europe/Paris') - interval '2 days' + interval '14 hours 5 minutes') at time zone 'Europe/Paris'),
  ((date_trunc('day', now() at time zone 'Europe/Paris') - interval '2 days' + interval '14 hours 55 minutes') at time zone 'Europe/Paris')
from demo_patients
on conflict (patient_id, scheduled_start) do nothing;

with demo_patients as (select id from public.profiles where role = 'patient'::public.app_role and active = true)
insert into public.visit_notifications (patient_id, scheduled_start, scheduled_end, visitor_one_name, visitor_two_name)
select id,
  ((date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day 15 hours') at time zone 'Europe/Paris'),
  ((date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day 16 hours') at time zone 'Europe/Paris'),
  'Sophie Martin', 'Nicolas Martin'
from demo_patients
on conflict (patient_id, scheduled_start) do nothing;
