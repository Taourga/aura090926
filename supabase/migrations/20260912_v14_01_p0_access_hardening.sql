-- AURA V1.4 / LOT 1 P0 access hardening
-- Purpose: remove overly broad duplicate RLS policies and narrow privileged RPC exposure.

-- Remove duplicate permissive policies that broaden patient-data visibility
-- through is_staff() (technical/governance/coach were included by that helper).
drop policy if exists "profiles self or staff read patients" on public.profiles;
drop policy if exists "patient and staff read enrollments" on public.activity_enrollments;

-- Keep enrollment counts as an intentional authenticated RPC, but require
-- an active application role before returning aggregate data.
create or replace function public.activity_enrollment_counts()
returns table(activity_id uuid, enrolled_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.activity_id, count(*)
  from public.activity_enrollments e
  where public.current_role() is not null
  group by e.activity_id
$$;

-- Restrict patient email enumeration to roles that actually need it.
-- Single-patient notifications: care/coordination roles + admin.
-- Broadcast notifications: governance + admin only.
create or replace function public.notification_recipients(p_patient_id uuid default null)
returns table(full_name text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name, p.email
  from public.profiles p
  where p.role = 'patient'::public.app_role
    and p.active = true
    and p.email is not null
    and (p_patient_id is null or p.id = p_patient_id)
    and (
      (p_patient_id is not null and public.current_role() in (
        'doctor'::public.app_role,
        'manager'::public.app_role,
        'psychologist'::public.app_role,
        'provider'::public.app_role,
        'admin'::public.app_role
      ))
      or
      (p_patient_id is null and public.current_role() in (
        'governance'::public.app_role,
        'admin'::public.app_role
      ))
    )
$$;

-- Preserve explicit RPC grants; anonymous/public execution remains revoked
-- by the previous security-hardening migration.
grant execute on function public.activity_enrollment_counts() to authenticated;
grant execute on function public.notification_recipients(uuid) to authenticated;
