-- AURA - prescriptions d'activités et espaces intervenants
-- Modèle additif : ne supprime ni ne modifie les inscriptions existantes.

create table if not exists public.activity_services (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  default_location text,
  clinician_id uuid references public.care_team_directory(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, code)
);

create table if not exists public.activity_prescriptions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  roster_id uuid not null references public.clinic_patient_roster(id) on delete cascade,
  patient_id uuid references public.profiles(id) on delete cascade,
  service_id uuid not null references public.activity_services(id) on delete restrict,
  prescribed_by uuid not null references public.profiles(id) on delete restrict,
  assigned_clinician_id uuid references public.care_team_directory(id) on delete set null,
  notes text,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_prescription_sessions (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.activity_prescriptions(id) on delete cascade,
  patient_id uuid references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  notes text,
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists activity_prescriptions_patient_idx on public.activity_prescriptions(patient_id, created_at desc);
create index if not exists activity_prescriptions_roster_idx on public.activity_prescriptions(roster_id, created_at desc);
create index if not exists activity_prescriptions_clinician_idx on public.activity_prescriptions(assigned_clinician_id, status);
create index if not exists activity_prescription_sessions_prescription_idx on public.activity_prescription_sessions(prescription_id, starts_at);

alter table public.activity_services enable row level security;
alter table public.activity_prescriptions enable row level security;
alter table public.activity_prescription_sessions enable row level security;

drop policy if exists "activity services read" on public.activity_services;
create policy "activity services read" on public.activity_services for select to authenticated using (true);

drop policy if exists "activity prescriptions read" on public.activity_prescriptions;
create policy "activity prescriptions read" on public.activity_prescriptions for select to authenticated using (
  patient_id = (select auth.uid())
  or public.current_role() in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'admin'::public.app_role)
  or exists (
    select 1 from public.care_team_directory d
    where d.id = assigned_clinician_id and d.user_id = (select auth.uid()) and d.active = true
  )
);

drop policy if exists "doctor creates activity prescriptions" on public.activity_prescriptions;
create policy "doctor creates activity prescriptions" on public.activity_prescriptions for insert to authenticated with check (
  public.current_role() = 'doctor'::public.app_role
  and prescribed_by = (select auth.uid())
);

drop policy if exists "doctor updates activity prescriptions" on public.activity_prescriptions;
create policy "doctor updates activity prescriptions" on public.activity_prescriptions for update to authenticated using (
  public.current_role() = 'doctor'::public.app_role and prescribed_by = (select auth.uid())
) with check (
  public.current_role() = 'doctor'::public.app_role and prescribed_by = (select auth.uid())
);

drop policy if exists "activity prescription sessions read" on public.activity_prescription_sessions;
create policy "activity prescription sessions read" on public.activity_prescription_sessions for select to authenticated using (
  patient_id = (select auth.uid())
  or public.current_role() in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'admin'::public.app_role)
  or exists (
    select 1
    from public.activity_prescriptions p
    join public.care_team_directory d on d.id = p.assigned_clinician_id
    where p.id = prescription_id and d.user_id = (select auth.uid()) and d.active = true
  )
);

drop policy if exists "assigned clinician creates sessions" on public.activity_prescription_sessions;
create policy "assigned clinician creates sessions" on public.activity_prescription_sessions for insert to authenticated with check (
  creator_id = (select auth.uid())
  and exists (
    select 1
    from public.activity_prescriptions p
    join public.care_team_directory d on d.id = p.assigned_clinician_id
    where p.id = prescription_id and d.user_id = (select auth.uid()) and d.active = true
  )
);

drop policy if exists "session creator updates sessions" on public.activity_prescription_sessions;
create policy "session creator updates sessions" on public.activity_prescription_sessions for update to authenticated using (
  creator_id = (select auth.uid())
) with check (creator_id = (select auth.uid()));

revoke all on public.activity_services from anon;
revoke all on public.activity_prescriptions from anon;
revoke all on public.activity_prescription_sessions from anon;
grant select on public.activity_services to authenticated;
grant select, insert, update on public.activity_prescriptions to authenticated;
grant select, insert, update on public.activity_prescription_sessions to authenticated;

-- Les cinq comptes techniques ci-dessous restent de vrais comptes Auth, mais leur rôle
-- dans AURA Demo Clinic devient "provider". Deux comptes techniques restent disponibles.
with facility as (
  select id from public.facilities where active = true order by created_at limit 1
), mapped(email,specialty) as (
  values
    ('technique01@demo.aura.test','Intervenante piscine'),
    ('technique02@demo.aura.test','Boxe-thérapie'),
    ('technique07@demo.aura.test','Équithérapie'),
    ('technique03@demo.aura.test','Assistante sociale'),
    ('technique06@demo.aura.test','Diététicien')
)
update public.facility_memberships fm
set role='provider'::public.app_role
from public.profiles p, facility f, mapped m
where fm.user_id=p.id and fm.facility_id=f.id and p.email=m.email and fm.active=true;

with facility as (
  select id from public.facilities where active = true order by created_at limit 1
), mapped(email,specialty) as (
  values
    ('technique01@demo.aura.test','Intervenante piscine'),
    ('technique02@demo.aura.test','Boxe-thérapie'),
    ('technique07@demo.aura.test','Équithérapie'),
    ('technique03@demo.aura.test','Assistante sociale'),
    ('technique06@demo.aura.test','Diététicien')
)
insert into public.care_team_directory (facility_id, full_name, member_type, specialty, user_id, active)
select f.id,p.full_name,'facilitator',m.specialty,p.id,true
from facility f cross join mapped m join public.profiles p on p.email=m.email
where not exists (
  select 1 from public.care_team_directory d where d.facility_id=f.id and d.user_id=p.id and d.active=true
);

with facility as (
  select id from public.facilities where active = true order by created_at limit 1
), providers(code,title,description,location,email,specialty) as (
  values
    ('pool','Piscine','Séances aquatiques encadrées sur prescription.','Piscine thérapeutique','technique01@demo.aura.test','Intervenante piscine'),
    ('boxing','Boxe-thérapie','Travail corporel, confiance et régulation émotionnelle.','Salle de sport','technique02@demo.aura.test','Boxe-thérapie'),
    ('equine','Équithérapie','Médiation thérapeutique avec le cheval.','Centre équestre partenaire','technique07@demo.aura.test','Équithérapie'),
    ('social','Assistance sociale','Accompagnement social et administratif.','Bureau social','technique03@demo.aura.test','Assistante sociale'),
    ('dietitian','Diététicien','Suivi nutritionnel individualisé.','Bureau nutrition','technique06@demo.aura.test','Diététicien')
)
insert into public.activity_services (facility_id,code,title,description,default_location,clinician_id,active)
select f.id,p.code,p.title,p.description,p.location,d.id,true
from facility f
cross join providers p
join public.profiles u on u.email=p.email
join public.care_team_directory d on d.facility_id=f.id and d.user_id=u.id and d.active=true
on conflict (facility_id,code) do update set
  title=excluded.title,
  description=excluded.description,
  default_location=excluded.default_location,
  clinician_id=excluded.clinician_id,
  active=true;

-- Psychologue : on réutilise le compte Claire Petit déjà actif et déjà lié au répertoire.
with facility as (
  select id from public.facilities where active = true order by created_at limit 1
)
insert into public.activity_services (facility_id,code,title,description,default_location,clinician_id,active)
select f.id,'psychology','Psychologue','Entretiens psychologiques prescrits par le médecin.','Bureau psychologie',d.id,true
from facility f
join public.profiles p on p.email='claire.petit@aura-demo.test'
join public.care_team_directory d on d.facility_id=f.id and d.user_id=p.id and d.active=true
on conflict (facility_id,code) do update set
  title=excluded.title,
  description=excluded.description,
  default_location=excluded.default_location,
  clinician_id=excluded.clinician_id,
  active=true;
