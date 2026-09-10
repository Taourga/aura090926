-- AURA - schéma Supabase initial
-- À exécuter une fois dans l'éditeur SQL Supabase, avec un compte propriétaire du projet.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('patient', 'doctor', 'manager', 'reception', 'psychologist', 'governance', 'coach', 'nurse', 'admin', 'provider');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.permission_status as enum ('submitted', 'waiting', 'approved', 'refused', 'cancelled', 'departed', 'returned');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.review_decision as enum ('approved', 'refused');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  role public.app_role not null default 'patient',
  active boolean not null default true,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wards (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  floor text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.patient_stays (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  ward_id uuid references public.wards(id) on delete set null,
  room_number text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  presence text not null default 'present' check (presence in ('present', 'out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create unique index if not exists one_active_stay_per_patient on public.patient_stays(patient_id) where ended_at is null;

create table if not exists public.permission_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  stay_id uuid not null references public.patient_stays(id) on delete restrict,
  departure_at timestamptz not null,
  return_at timestamptz not null,
  reason text,
  status public.permission_status not null default 'waiting',
  doctor_decision public.review_decision,
  doctor_decided_by uuid references public.profiles(id) on delete set null,
  doctor_decided_at timestamptz,
  doctor_comment text,
  manager_decision public.review_decision,
  manager_decided_by uuid references public.profiles(id) on delete set null,
  manager_decided_at timestamptz,
  manager_comment text,
  departed_at timestamptz,
  departed_by uuid references public.profiles(id) on delete set null,
  returned_at timestamptz,
  returned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (return_at > departure_at),
  check ((departed_at is null and returned_at is null) or departed_at is not null),
  check (returned_at is null or returned_at >= departed_at)
);
create index if not exists permission_requests_patient_idx on public.permission_requests(patient_id, departure_at desc);
create index if not exists permission_requests_status_idx on public.permission_requests(status, departure_at);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  capacity integer not null default 1 check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists activities_starts_idx on public.activities(active, starts_at);

create table if not exists public.activity_enrollments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(activity_id, patient_id)
);
create index if not exists activity_enrollments_activity_idx on public.activity_enrollments(activity_id);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  creator_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  notes text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists appointments_patient_idx on public.appointments(patient_id, starts_at);
create index if not exists appointments_starts_idx on public.appointments(starts_at);

create table if not exists public.information_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  published boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner')),
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_date, meal)
);

create table if not exists public.sport_room_schedules (
  id uuid primary key default gen_random_uuid(),
  schedule_date date not null unique,
  opens_at time not null default '09:00',
  closes_at time not null default '12:00',
  note text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists stays_updated_at on public.patient_stays;
create trigger stays_updated_at before update on public.patient_stays for each row execute function public.set_updated_at();
drop trigger if exists permissions_updated_at on public.permission_requests;
create trigger permissions_updated_at before update on public.permission_requests for each row execute function public.set_updated_at();
drop trigger if exists activities_updated_at on public.activities;
create trigger activities_updated_at before update on public.activities for each row execute function public.set_updated_at();
drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
drop trigger if exists information_updated_at on public.information_posts;
create trigger information_updated_at before update on public.information_posts for each row execute function public.set_updated_at();
drop trigger if exists menus_updated_at on public.menu_items;
create trigger menus_updated_at before update on public.menu_items for each row execute function public.set_updated_at();
drop trigger if exists sport_room_schedules_updated_at on public.sport_room_schedules;
create trigger sport_room_schedules_updated_at before update on public.sport_room_schedules for each row execute function public.set_updated_at();

-- Un profil patient est créé automatiquement après la création d'un compte Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Fonctions de rôle utilisées par les règles RLS. SECURITY DEFINER évite une récursion des politiques sur profiles.
create or replace function public.current_role()
returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() <> 'patient'::public.app_role, false)
$$;

create or replace function public.is_clinical_or_reception()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() in ('doctor'::public.app_role, 'manager'::public.app_role, 'reception'::public.app_role, 'psychologist'::public.app_role, 'nurse'::public.app_role, 'provider'::public.app_role, 'admin'::public.app_role), false)
$$;

create or replace function public.write_audit(p_event text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_events(actor_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), p_event, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end; $$;

alter table public.profiles enable row level security;
alter table public.wards enable row level security;
alter table public.patient_stays enable row level security;
alter table public.permission_requests enable row level security;
alter table public.activities enable row level security;
alter table public.activity_enrollments enable row level security;
alter table public.appointments enable row level security;
alter table public.information_posts enable row level security;
alter table public.menu_items enable row level security;
alter table public.sport_room_schedules enable row level security;
alter table public.audit_events enable row level security;

create policy "profiles self or authorized staff read" on public.profiles for select to authenticated using (
  id = auth.uid() or public.current_role() = 'admin'::public.app_role or (public.is_clinical_or_reception() and role = 'patient'::public.app_role)
);
create policy "admins manage profiles" on public.profiles for update to authenticated using (public.current_role() = 'admin'::public.app_role) with check (public.current_role() = 'admin'::public.app_role);
create policy "signed in users read wards" on public.wards for select to authenticated using (true);
create policy "admins manage wards" on public.wards for all to authenticated using (public.current_role() = 'admin'::public.app_role) with check (public.current_role() = 'admin'::public.app_role);

create policy "patient and staff read stays" on public.patient_stays for select to authenticated using (patient_id = auth.uid() or public.is_clinical_or_reception());
create policy "admins manage stays" on public.patient_stays for all to authenticated using (public.current_role() = 'admin'::public.app_role) with check (public.current_role() = 'admin'::public.app_role);

create policy "patient and authorized staff read permissions" on public.permission_requests for select to authenticated using (patient_id = auth.uid() or public.is_clinical_or_reception());
-- Les insertions et mises à jour de permissions sont volontairement réservées aux RPC ci-dessous.

create policy "signed in users read activities" on public.activities for select to authenticated using (true);
create policy "governance manage activities" on public.activities for all to authenticated using (public.current_role() in ('governance'::public.app_role, 'admin'::public.app_role)) with check (public.current_role() in ('governance'::public.app_role, 'admin'::public.app_role));
create policy "patient and staff read enrollments" on public.activity_enrollments for select to authenticated using (patient_id = auth.uid() or public.is_clinical_or_reception());
create policy "patient cancels own enrollment" on public.activity_enrollments for delete to authenticated using (patient_id = auth.uid() and public.current_role() = 'patient'::public.app_role);

create policy "patient and staff read appointments" on public.appointments for select to authenticated using (patient_id = auth.uid() or public.is_clinical_or_reception());
create policy "authorized staff create appointments" on public.appointments for insert to authenticated with check (
  creator_id = auth.uid() and public.current_role() in ('doctor'::public.app_role, 'manager'::public.app_role, 'psychologist'::public.app_role, 'provider'::public.app_role)
);
create policy "creator or admin update appointments" on public.appointments for update to authenticated using (creator_id = auth.uid() or public.current_role() = 'admin'::public.app_role) with check (creator_id = auth.uid() or public.current_role() = 'admin'::public.app_role);
create policy "creator or admin delete appointments" on public.appointments for delete to authenticated using (creator_id = auth.uid() or public.current_role() = 'admin'::public.app_role);

create policy "signed in users read information" on public.information_posts for select to authenticated using (published = true or public.current_role() in ('governance'::public.app_role, 'admin'::public.app_role));
create policy "governance manage information" on public.information_posts for all to authenticated using (public.current_role() in ('governance'::public.app_role, 'admin'::public.app_role)) with check (public.current_role() in ('governance'::public.app_role, 'admin'::public.app_role));
create policy "signed in users read menus" on public.menu_items for select to authenticated using (true);
create policy "governance manage menus" on public.menu_items for all to authenticated using (public.current_role() in ('governance'::public.app_role, 'admin'::public.app_role)) with check (public.current_role() in ('governance'::public.app_role, 'admin'::public.app_role));
create policy "signed in users read sport room schedules" on public.sport_room_schedules for select to authenticated using (true);
create policy "coach and admin insert sport room schedules" on public.sport_room_schedules for insert to authenticated with check (public.current_role() in ('coach'::public.app_role, 'admin'::public.app_role) and updated_by = auth.uid());
create policy "coach and admin update sport room schedules" on public.sport_room_schedules for update to authenticated using (public.current_role() in ('coach'::public.app_role, 'admin'::public.app_role)) with check (public.current_role() in ('coach'::public.app_role, 'admin'::public.app_role) and updated_by = auth.uid());
create policy "coach and admin delete sport room schedules" on public.sport_room_schedules for delete to authenticated using (public.current_role() in ('coach'::public.app_role, 'admin'::public.app_role));
create policy "admins read audit log" on public.audit_events for select to authenticated using (public.current_role() = 'admin'::public.app_role);

create or replace function public.submit_permission_request(p_departure_at timestamptz, p_return_at timestamptz, p_reason text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_stay_id uuid; v_permission_id uuid;
begin
  if public.current_role() <> 'patient'::public.app_role then raise exception 'Seul un patient peut créer une demande'; end if;
  if p_departure_at <= now() then raise exception 'Le départ doit être prévu dans le futur'; end if;
  if p_return_at <= p_departure_at then raise exception 'Le retour doit être postérieur au départ'; end if;
  select id into v_stay_id from public.patient_stays where patient_id = auth.uid() and ended_at is null limit 1;
  if v_stay_id is null then raise exception 'Aucun séjour actif n''a été trouvé'; end if;
  insert into public.permission_requests(patient_id, stay_id, departure_at, return_at, reason, status)
  values (auth.uid(), v_stay_id, p_departure_at, p_return_at, nullif(trim(p_reason), ''), 'waiting') returning id into v_permission_id;
  perform public.write_audit('permission_submitted', 'permission_request', v_permission_id, jsonb_build_object('departure_at', p_departure_at, 'return_at', p_return_at));
  return v_permission_id;
end; $$;

create or replace function public.review_permission_request(p_permission_id uuid, p_decision text, p_comment text default null)
returns public.permission_status
language plpgsql security definer set search_path = public as $$
declare v_request public.permission_requests%rowtype; v_role public.app_role; v_status public.permission_status;
begin
  v_role := public.current_role();
  if v_role not in ('doctor'::public.app_role, 'manager'::public.app_role) then raise exception 'Rôle non autorisé'; end if;
  if p_decision not in ('approved', 'refused') then raise exception 'Décision invalide'; end if;
  select * into v_request from public.permission_requests where id = p_permission_id for update;
  if not found then raise exception 'Permission introuvable'; end if;
  if v_request.status not in ('submitted'::public.permission_status, 'waiting'::public.permission_status) then raise exception 'Cette permission ne peut plus être revue'; end if;
  if v_role = 'doctor'::public.app_role then
    if v_request.doctor_decision is not null then raise exception 'La validation du médecin a déjà été enregistrée'; end if;
    update public.permission_requests set doctor_decision = p_decision::public.review_decision, doctor_decided_by = auth.uid(), doctor_decided_at = now(), doctor_comment = nullif(trim(p_comment), '') where id = p_permission_id;
  else
    if v_request.manager_decision is not null then raise exception 'La décision du cadre a déjà été enregistrée'; end if;
    update public.permission_requests set manager_decision = p_decision::public.review_decision, manager_decided_by = auth.uid(), manager_decided_at = now(), manager_comment = nullif(trim(p_comment), '') where id = p_permission_id;
  end if;
  select case when doctor_decision = 'refused'::public.review_decision or manager_decision = 'refused'::public.review_decision then 'refused'::public.permission_status when doctor_decision = 'approved'::public.review_decision and manager_decision = 'approved'::public.review_decision then 'approved'::public.permission_status else 'waiting'::public.permission_status end into v_status from public.permission_requests where id = p_permission_id;
  update public.permission_requests set status = v_status where id = p_permission_id;
  perform public.write_audit('permission_reviewed', 'permission_request', p_permission_id, jsonb_build_object('role', v_role, 'decision', p_decision));
  return v_status;
end; $$;

create or replace function public.record_permission_movement(p_permission_id uuid, p_action text)
returns public.permission_status
language plpgsql security definer set search_path = public as $$
declare v_request public.permission_requests%rowtype;
begin
  if public.current_role() <> 'reception'::public.app_role then raise exception 'Action réservée à l''accueil'; end if;
  select * into v_request from public.permission_requests where id = p_permission_id for update;
  if not found then raise exception 'Permission introuvable'; end if;
  if p_action = 'depart' then
    if v_request.status <> 'approved'::public.permission_status then raise exception 'Seule une permission autorisée peut être sortie'; end if;
    update public.permission_requests set status = 'departed', departed_at = now(), departed_by = auth.uid() where id = p_permission_id;
    update public.patient_stays set presence = 'out' where id = v_request.stay_id and ended_at is null;
    perform public.write_audit('patient_departed', 'permission_request', p_permission_id, '{}'::jsonb);
    return 'departed'::public.permission_status;
  elsif p_action = 'return' then
    if v_request.status <> 'departed'::public.permission_status then raise exception 'Le départ doit être enregistré avant le retour'; end if;
    update public.permission_requests set status = 'returned', returned_at = now(), returned_by = auth.uid() where id = p_permission_id;
    update public.patient_stays set presence = 'present' where id = v_request.stay_id and ended_at is null;
    perform public.write_audit('patient_returned', 'permission_request', p_permission_id, '{}'::jsonb);
    return 'returned'::public.permission_status;
  else
    raise exception 'Action de mouvement invalide';
  end if;
end; $$;

create or replace function public.enroll_in_activity(p_activity_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_activity public.activities%rowtype; v_count integer; v_id uuid;
begin
  if public.current_role() <> 'patient'::public.app_role then raise exception 'Action réservée au patient'; end if;
  select * into v_activity from public.activities where id = p_activity_id for update;
  if not found or not v_activity.active or v_activity.starts_at <= now() then raise exception 'Cette activité n''est plus disponible'; end if;
  if exists(select 1 from public.activity_enrollments where activity_id = p_activity_id and patient_id = auth.uid()) then raise exception 'Vous êtes déjà inscrit à cette activité'; end if;
  select count(*) into v_count from public.activity_enrollments where activity_id = p_activity_id;
  if v_count >= v_activity.capacity then raise exception 'Cette activité est complète'; end if;
  insert into public.activity_enrollments(activity_id, patient_id) values (p_activity_id, auth.uid()) returning id into v_id;
  perform public.write_audit('activity_enrolled', 'activity', p_activity_id, '{}'::jsonb);
  return v_id;
end; $$;

-- Les patients peuvent connaître le nombre de places prises sans accéder à la liste des autres inscrits.
create or replace function public.activity_enrollment_counts()
returns table(activity_id uuid, enrolled_count bigint)
language sql stable security definer set search_path = public as $$
  select activity_id, count(*) from public.activity_enrollments group by activity_id
$$;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.wards, public.patient_stays, public.permission_requests, public.activities, public.activity_enrollments, public.appointments, public.information_posts, public.menu_items to authenticated;
grant insert, update, delete on public.activities, public.appointments, public.information_posts, public.menu_items to authenticated;
grant delete on public.activity_enrollments to authenticated;
revoke all on function public.write_audit(text, text, uuid, jsonb) from public;
revoke all on function public.submit_permission_request(timestamptz, timestamptz, text) from public;
revoke all on function public.review_permission_request(uuid, text, text) from public;
revoke all on function public.record_permission_movement(uuid, text) from public;
revoke all on function public.enroll_in_activity(uuid) from public;
revoke all on function public.activity_enrollment_counts() from public;
grant execute on function public.submit_permission_request(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.review_permission_request(uuid, text, text) to authenticated;
grant execute on function public.record_permission_movement(uuid, text) to authenticated;
grant execute on function public.enroll_in_activity(uuid) to authenticated;
grant execute on function public.activity_enrollment_counts() to authenticated;

-- Après création du premier utilisateur dans Authentication > Users, exécuter une fois :
-- update public.profiles set role = 'admin' where id = 'UUID_DU_PREMIER_ADMIN';

-- Espace médecin : tournées par étage et créneaux externes sans détail patient.
create table if not exists public.doctor_rounds (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete restrict,
  floor_number smallint not null check (floor_number between 0 and 3),
  scheduled_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists doctor_rounds_floor_schedule_idx on public.doctor_rounds(floor_number, scheduled_at);
create index if not exists doctor_rounds_doctor_schedule_idx on public.doctor_rounds(doctor_id, scheduled_at);

create table if not exists public.doctor_schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists doctor_schedule_blocks_doctor_starts_idx on public.doctor_schedule_blocks(doctor_id, starts_at);

drop trigger if exists doctor_rounds_updated_at on public.doctor_rounds;
create trigger doctor_rounds_updated_at before update on public.doctor_rounds for each row execute function public.set_updated_at();
drop trigger if exists doctor_schedule_blocks_updated_at on public.doctor_schedule_blocks;
create trigger doctor_schedule_blocks_updated_at before update on public.doctor_schedule_blocks for each row execute function public.set_updated_at();

create or replace function public.current_patient_room_floor()
returns smallint
language sql stable security definer set search_path = public as $$
  select case when coalesce(room_number, '') ~ '^[0-3]' then left(room_number, 1)::smallint else null end
  from public.patient_stays
  where patient_id = auth.uid() and ended_at is null
  order by started_at desc
  limit 1
$$;

alter table public.doctor_rounds enable row level security;
alter table public.doctor_schedule_blocks enable row level security;
create policy "patients read their floor rounds" on public.doctor_rounds for select to authenticated using (
  (public.current_role() = 'patient'::public.app_role and floor_number = public.current_patient_room_floor())
  or public.is_clinical_or_reception()
);
create policy "doctors publish their rounds" on public.doctor_rounds for insert to authenticated with check (
  public.current_role() = 'doctor'::public.app_role and doctor_id = auth.uid()
);
create policy "doctors update their rounds" on public.doctor_rounds for update to authenticated using (
  public.current_role() = 'doctor'::public.app_role and doctor_id = auth.uid()
) with check (
  public.current_role() = 'doctor'::public.app_role and doctor_id = auth.uid()
);
create policy "doctors delete their rounds" on public.doctor_rounds for delete to authenticated using (
  public.current_role() = 'doctor'::public.app_role and doctor_id = auth.uid()
);
create policy "doctor reads private schedule blocks" on public.doctor_schedule_blocks for select to authenticated using (
  doctor_id = auth.uid() or public.current_role() = 'admin'::public.app_role
);
create policy "doctor creates private schedule blocks" on public.doctor_schedule_blocks for insert to authenticated with check (
  public.current_role() = 'doctor'::public.app_role and doctor_id = auth.uid()
);
create policy "doctor updates private schedule blocks" on public.doctor_schedule_blocks for update to authenticated using (
  public.current_role() = 'doctor'::public.app_role and doctor_id = auth.uid()
) with check (
  public.current_role() = 'doctor'::public.app_role and doctor_id = auth.uid()
);
create policy "doctor deletes private schedule blocks" on public.doctor_schedule_blocks for delete to authenticated using (
  public.current_role() = 'doctor'::public.app_role and doctor_id = auth.uid()
);
grant select, insert, update, delete on public.doctor_rounds, public.doctor_schedule_blocks to authenticated;
