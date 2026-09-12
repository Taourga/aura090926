-- AURA V1.4 / LOT 2A — Multi-clinic foundation
-- Backward-compatible tenant foundation: Organization -> Facility -> Membership.
-- Existing AURA data is attached to a single demo facility. No business workflow is changed here.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  timezone text not null,
  default_locale text not null default 'fr-FR',
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.facility_memberships (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  active boolean not null default true,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, user_id)
);

create unique index if not exists facility_memberships_one_primary_per_user
  on public.facility_memberships(user_id) where is_primary;
create index if not exists facility_memberships_user_idx on public.facility_memberships(user_id, active);
create index if not exists facility_memberships_facility_idx on public.facility_memberships(facility_id, active);

create or replace function public.current_facility_id()
returns uuid
language sql stable security definer set search_path=public
as $$
  select fm.facility_id
  from public.facility_memberships fm
  where fm.user_id = auth.uid() and fm.active = true
  order by fm.is_primary desc, fm.created_at asc
  limit 1
$$;

create or replace function public.has_facility_access(p_facility_id uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.facility_memberships fm
    where fm.user_id=auth.uid() and fm.facility_id=p_facility_id and fm.active=true
  )
$$;

create or replace function public.is_facility_admin(p_facility_id uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1 from public.facility_memberships fm
    where fm.user_id=auth.uid() and fm.facility_id=p_facility_id and fm.active=true and fm.role='admin'::public.app_role
  )
$$;

create or replace function public.has_organization_access(p_organization_id uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists (
    select 1
    from public.facility_memberships fm
    join public.facilities f on f.id=fm.facility_id
    where fm.user_id=auth.uid() and fm.active=true and f.organization_id=p_organization_id
  )
$$;

grant execute on function public.current_facility_id() to authenticated;
grant execute on function public.has_facility_access(uuid) to authenticated;
grant execute on function public.is_facility_admin(uuid) to authenticated;
grant execute on function public.has_organization_access(uuid) to authenticated;

alter table public.organizations enable row level security;
alter table public.facilities enable row level security;
alter table public.facility_memberships enable row level security;

create policy organizations_read on public.organizations
  for select to authenticated using (public.has_organization_access(id));
create policy facilities_read on public.facilities
  for select to authenticated using (public.has_facility_access(id));
create policy memberships_read on public.facility_memberships
  for select to authenticated using (user_id=auth.uid() or public.is_facility_admin(facility_id));
create policy memberships_admin_write on public.facility_memberships
  for all to authenticated
  using (public.is_facility_admin(facility_id))
  with check (public.is_facility_admin(facility_id));

insert into public.organizations(name,slug)
values ('AURA Demo','aura-demo')
on conflict (slug) do nothing;

insert into public.facilities(organization_id,name,slug,country_code,timezone,default_locale,currency_code,config)
select o.id,'AURA Demo Clinic','aura-demo-clinic','FR','Europe/Paris','fr-FR','EUR',jsonb_build_object('country_pack','CORE','demo',true)
from public.organizations o
where o.slug='aura-demo'
and not exists (
  select 1 from public.facilities f
  where f.organization_id=o.id and f.slug='aura-demo-clinic'
);

insert into public.facility_memberships(facility_id,user_id,role,active,is_primary)
select f.id,p.id,p.role,p.active,true
from public.profiles p
cross join public.facilities f
join public.organizations o on o.id=f.organization_id
where o.slug='aura-demo' and f.slug='aura-demo-clinic'
on conflict (facility_id,user_id) do nothing;

alter table public.activities add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.activity_enrollments add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.appointments add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.audit_events add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.clinic_rooms add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.clinical_messages add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.doctor_rounds add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.doctor_schedule_blocks add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.housekeeping_assignments add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.housekeeping_rosters add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.housekeeping_tasks add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.information_posts add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.menu_items add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.patient_stays add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.permission_requests add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.planned_admissions add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.sport_room_schedules add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.visit_notifications add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();
alter table public.wards add column if not exists facility_id uuid references public.facilities(id) on delete restrict default public.current_facility_id();

do $$
declare v_facility uuid;
begin
  select f.id into v_facility
  from public.facilities f
  join public.organizations o on o.id=f.organization_id
  where o.slug='aura-demo' and f.slug='aura-demo-clinic';

  if v_facility is null then raise exception 'AURA demo facility not found'; end if;

  update public.activities set facility_id=v_facility where facility_id is null;
  update public.activity_enrollments set facility_id=v_facility where facility_id is null;
  update public.appointments set facility_id=v_facility where facility_id is null;
  update public.audit_events set facility_id=v_facility where facility_id is null;
  update public.clinic_rooms set facility_id=v_facility where facility_id is null;
  update public.clinical_messages set facility_id=v_facility where facility_id is null;
  update public.doctor_rounds set facility_id=v_facility where facility_id is null;
  update public.doctor_schedule_blocks set facility_id=v_facility where facility_id is null;
  update public.housekeeping_assignments set facility_id=v_facility where facility_id is null;
  update public.housekeeping_rosters set facility_id=v_facility where facility_id is null;
  update public.housekeeping_tasks set facility_id=v_facility where facility_id is null;
  update public.information_posts set facility_id=v_facility where facility_id is null;
  update public.menu_items set facility_id=v_facility where facility_id is null;
  update public.patient_stays set facility_id=v_facility where facility_id is null;
  update public.permission_requests set facility_id=v_facility where facility_id is null;
  update public.planned_admissions set facility_id=v_facility where facility_id is null;
  update public.sport_room_schedules set facility_id=v_facility where facility_id is null;
  update public.visit_notifications set facility_id=v_facility where facility_id is null;
  update public.wards set facility_id=v_facility where facility_id is null;
end $$;

alter table public.activities alter column facility_id set not null;
alter table public.activity_enrollments alter column facility_id set not null;
alter table public.appointments alter column facility_id set not null;
alter table public.audit_events alter column facility_id set not null;
alter table public.clinic_rooms alter column facility_id set not null;
alter table public.clinical_messages alter column facility_id set not null;
alter table public.doctor_rounds alter column facility_id set not null;
alter table public.doctor_schedule_blocks alter column facility_id set not null;
alter table public.housekeeping_assignments alter column facility_id set not null;
alter table public.housekeeping_rosters alter column facility_id set not null;
alter table public.housekeeping_tasks alter column facility_id set not null;
alter table public.information_posts alter column facility_id set not null;
alter table public.menu_items alter column facility_id set not null;
alter table public.patient_stays alter column facility_id set not null;
alter table public.permission_requests alter column facility_id set not null;
alter table public.planned_admissions alter column facility_id set not null;
alter table public.sport_room_schedules alter column facility_id set not null;
alter table public.visit_notifications alter column facility_id set not null;
alter table public.wards alter column facility_id set not null;

create index if not exists activities_facility_idx on public.activities(facility_id);
create index if not exists activity_enrollments_facility_idx on public.activity_enrollments(facility_id);
create index if not exists appointments_facility_idx on public.appointments(facility_id);
create index if not exists audit_events_facility_idx on public.audit_events(facility_id);
create index if not exists clinic_rooms_facility_idx on public.clinic_rooms(facility_id);
create index if not exists clinical_messages_facility_idx on public.clinical_messages(facility_id);
create index if not exists doctor_rounds_facility_idx on public.doctor_rounds(facility_id);
create index if not exists doctor_schedule_blocks_facility_idx on public.doctor_schedule_blocks(facility_id);
create index if not exists housekeeping_assignments_facility_idx on public.housekeeping_assignments(facility_id);
create index if not exists housekeeping_rosters_facility_idx on public.housekeeping_rosters(facility_id);
create index if not exists housekeeping_tasks_facility_idx on public.housekeeping_tasks(facility_id);
create index if not exists information_posts_facility_idx on public.information_posts(facility_id);
create index if not exists menu_items_facility_idx on public.menu_items(facility_id);
create index if not exists patient_stays_facility_idx on public.patient_stays(facility_id);
create index if not exists permission_requests_facility_idx on public.permission_requests(facility_id);
create index if not exists planned_admissions_facility_idx on public.planned_admissions(facility_id);
create index if not exists sport_room_schedules_facility_idx on public.sport_room_schedules(facility_id);
create index if not exists visit_notifications_facility_idx on public.visit_notifications(facility_id);
create index if not exists wards_facility_idx on public.wards(facility_id);
