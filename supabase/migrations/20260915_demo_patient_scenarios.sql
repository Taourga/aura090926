-- AURA Demo Clinic — patients de contexte réalistes
-- Migration appliquée le 15/09/2026.

create table if not exists public.demo_patient_scenarios (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  roster_id uuid not null unique references public.clinic_patient_roster(id) on delete cascade,
  presence text not null default 'present' check (presence in ('present','out')),
  planned_discharge_at timestamptz,
  permission_status public.permission_status,
  permission_departure_at timestamptz,
  permission_return_at timestamptz,
  next_appointment_at timestamptz,
  next_appointment_title text,
  next_appointment_location text,
  prescribed_activity_title text,
  prescribed_activity_at timestamptz,
  prescribed_activity_location text,
  mobile_phone text,
  personal_email text,
  city text,
  trusted_contact_name text,
  trusted_contact_relationship text,
  trusted_contact_phone text,
  trusted_contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (permission_return_at is null or permission_departure_at is null or permission_return_at > permission_departure_at)
);

alter table public.demo_patient_scenarios enable row level security;
grant select on public.demo_patient_scenarios to authenticated;

drop policy if exists "demo_patient_scenarios_read" on public.demo_patient_scenarios;
create policy "demo_patient_scenarios_read" on public.demo_patient_scenarios
for select to authenticated
using (
  facility_id = public.current_facility_id()
  and public.current_role() = any (
    array[
      'doctor'::public.app_role,
      'manager'::public.app_role,
      'nurse'::public.app_role,
      'reception'::public.app_role,
      'psychologist'::public.app_role,
      'admin'::public.app_role
    ]
  )
);
