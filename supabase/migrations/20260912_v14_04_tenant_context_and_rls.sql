-- AURA V1.4 / LOT 2B — Active facility context + tenant-aware RLS

alter table public.profiles add column if not exists active_facility_id uuid references public.facilities(id) on delete set null;

update public.profiles p
set active_facility_id=fm.facility_id
from public.facility_memberships fm
where fm.user_id=p.id and fm.is_primary=true and fm.active=true and p.active_facility_id is null;

create or replace function public.current_facility_id()
returns uuid language sql stable security definer set search_path=public
as $$
  select coalesce(
    (select p.active_facility_id from public.profiles p
     where p.id=auth.uid() and p.active=true
       and p.active_facility_id is not null
       and exists (select 1 from public.facility_memberships fm where fm.user_id=p.id and fm.facility_id=p.active_facility_id and fm.active=true)),
    (select fm.facility_id from public.facility_memberships fm
     where fm.user_id=auth.uid() and fm.active=true
     order by fm.is_primary desc, fm.created_at asc limit 1)
  )
$$;

create or replace function public.current_role()
returns public.app_role language sql stable security definer set search_path=public
as $$
  select fm.role
  from public.facility_memberships fm
  where fm.user_id=auth.uid() and fm.facility_id=public.current_facility_id() and fm.active=true
  limit 1
$$;

create or replace function public.shares_current_facility(p_user_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(
    select 1 from public.facility_memberships fm
    where fm.user_id=p_user_id and fm.facility_id=public.current_facility_id() and fm.active=true
  )
$$;

create or replace function public.switch_facility(p_facility_id uuid)
returns uuid language plpgsql security definer set search_path=public
as $$
begin
  if not public.has_facility_access(p_facility_id) then raise exception 'Accès établissement non autorisé'; end if;
  update public.profiles set active_facility_id=p_facility_id, updated_at=now() where id=auth.uid() and active=true;
  if not found then raise exception 'Profil actif introuvable'; end if;
  return p_facility_id;
end
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.shares_current_facility(uuid) to authenticated;
grant execute on function public.switch_facility(uuid) to authenticated;

-- Profiles
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (
  id=auth.uid() or (
    public.shares_current_facility(id) and (
      public.current_role()='admin'::public.app_role or
      (public.patient_staff() and role='patient'::public.app_role)
    )
  )
);
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for update to authenticated
using (public.current_role()='admin'::public.app_role and public.shares_current_facility(id))
with check (public.current_role()='admin'::public.app_role and public.shares_current_facility(id));

-- Activities
drop policy if exists activities_read on public.activities;
create policy activities_read on public.activities for select to authenticated using (facility_id=public.current_facility_id());
drop policy if exists activities_write on public.activities;
create policy activities_write on public.activities for all to authenticated
using (facility_id=public.current_facility_id() and public.current_role() in ('governance'::public.app_role,'admin'::public.app_role))
with check (facility_id=public.current_facility_id() and public.current_role() in ('governance'::public.app_role,'admin'::public.app_role));

-- Activity enrollments
drop policy if exists enrollments_read on public.activity_enrollments;
create policy enrollments_read on public.activity_enrollments for select to authenticated using (facility_id=public.current_facility_id() and (patient_id=auth.uid() or public.patient_staff()));
drop policy if exists enrollments_delete on public.activity_enrollments;
create policy enrollments_delete on public.activity_enrollments for delete to authenticated using (facility_id=public.current_facility_id() and patient_id=auth.uid() and public.current_role()='patient'::public.app_role);

-- Appointments
drop policy if exists appointments_read on public.appointments;
create policy appointments_read on public.appointments for select to authenticated using (facility_id=public.current_facility_id() and (patient_id=auth.uid() or public.patient_staff()));
drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert to authenticated with check (facility_id=public.current_facility_id() and creator_id=auth.uid() and public.current_role() in ('doctor'::public.app_role,'manager'::public.app_role,'psychologist'::public.app_role,'provider'::public.app_role));
drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update to authenticated
using (facility_id=public.current_facility_id() and (creator_id=auth.uid() or public.current_role()='admin'::public.app_role))
with check (facility_id=public.current_facility_id() and (creator_id=auth.uid() or public.current_role()='admin'::public.app_role));

-- Audit / rooms / messages
drop policy if exists audit_read on public.audit_events;
create policy audit_read on public.audit_events for select to authenticated using (facility_id=public.current_facility_id() and public.current_role()='admin'::public.app_role);
drop policy if exists rooms_read on public.clinic_rooms;
create policy rooms_read on public.clinic_rooms for select to authenticated using (facility_id=public.current_facility_id() and public.current_role() is not null);
drop policy if exists "participants read clinical messages" on public.clinical_messages;
create policy "participants read clinical messages" on public.clinical_messages for select to authenticated using (facility_id=public.current_facility_id() and (sender_id=auth.uid() or recipient_id=auth.uid()));

-- Doctor rounds
drop policy if exists "doctors delete their rounds" on public.doctor_rounds;
create policy "doctors delete their rounds" on public.doctor_rounds for delete to authenticated using (facility_id=public.current_facility_id() and doctor_id=auth.uid() and public.current_role()='doctor'::public.app_role);
drop policy if exists "doctors publish their rounds" on public.doctor_rounds;
create policy "doctors publish their rounds" on public.doctor_rounds for insert to authenticated with check (facility_id=public.current_facility_id() and doctor_id=auth.uid() and public.current_role()='doctor'::public.app_role);
drop policy if exists "doctors update their rounds" on public.doctor_rounds;
create policy "doctors update their rounds" on public.doctor_rounds for update to authenticated using (facility_id=public.current_facility_id() and doctor_id=auth.uid() and public.current_role()='doctor'::public.app_role) with check (facility_id=public.current_facility_id() and doctor_id=auth.uid() and public.current_role()='doctor'::public.app_role);
drop policy if exists "patients read their floor rounds" on public.doctor_rounds;
create policy "patients read their floor rounds" on public.doctor_rounds for select to authenticated using (
 facility_id=public.current_facility_id() and (
  (public.current_role()='patient'::public.app_role and exists(select 1 from public.patient_stays s where s.patient_id=auth.uid() and s.facility_id=public.current_facility_id() and s.ended_at is null and coalesce(s.room_number,'') ~ '^[0-3]' and left(s.room_number,1)::smallint=doctor_rounds.floor_number))
  or public.current_role() in ('doctor'::public.app_role,'manager'::public.app_role,'reception'::public.app_role,'psychologist'::public.app_role,'nurse'::public.app_role,'provider'::public.app_role,'admin'::public.app_role)
 ));

-- Private doctor schedule
drop policy if exists "doctor creates private schedule blocks" on public.doctor_schedule_blocks;
create policy "doctor creates private schedule blocks" on public.doctor_schedule_blocks for insert to authenticated with check (facility_id=public.current_facility_id() and doctor_id=auth.uid() and public.current_role()='doctor'::public.app_role);
drop policy if exists "doctor deletes private schedule blocks" on public.doctor_schedule_blocks;
create policy "doctor deletes private schedule blocks" on public.doctor_schedule_blocks for delete to authenticated using (facility_id=public.current_facility_id() and doctor_id=auth.uid() and public.current_role()='doctor'::public.app_role);
drop policy if exists "doctor reads private schedule blocks" on public.doctor_schedule_blocks;
create policy "doctor reads private schedule blocks" on public.doctor_schedule_blocks for select to authenticated using (facility_id=public.current_facility_id() and (doctor_id=auth.uid() or public.current_role()='admin'::public.app_role));
drop policy if exists "doctor updates private schedule blocks" on public.doctor_schedule_blocks;
create policy "doctor updates private schedule blocks" on public.doctor_schedule_blocks for update to authenticated using (facility_id=public.current_facility_id() and doctor_id=auth.uid() and public.current_role()='doctor'::public.app_role) with check (facility_id=public.current_facility_id() and doctor_id=auth.uid() and public.current_role()='doctor'::public.app_role);

-- Information / menus
drop policy if exists info_read on public.information_posts;
create policy info_read on public.information_posts for select to authenticated using (facility_id=public.current_facility_id() and (published=true or public.current_role() in ('governance'::public.app_role,'admin'::public.app_role)));
drop policy if exists info_write on public.information_posts;
create policy info_write on public.information_posts for all to authenticated using (facility_id=public.current_facility_id() and public.current_role() in ('governance'::public.app_role,'admin'::public.app_role)) with check (facility_id=public.current_facility_id() and public.current_role() in ('governance'::public.app_role,'admin'::public.app_role));
drop policy if exists menus_read on public.menu_items;
create policy menus_read on public.menu_items for select to authenticated using (facility_id=public.current_facility_id());
drop policy if exists menus_write on public.menu_items;
create policy menus_write on public.menu_items for all to authenticated using (facility_id=public.current_facility_id() and public.current_role() in ('governance'::public.app_role,'admin'::public.app_role)) with check (facility_id=public.current_facility_id() and public.current_role() in ('governance'::public.app_role,'admin'::public.app_role));

-- Stays / permissions / admissions
drop policy if exists stays_read on public.patient_stays;
create policy stays_read on public.patient_stays for select to authenticated using (facility_id=public.current_facility_id() and (patient_id=auth.uid() or public.patient_staff()));
drop policy if exists permissions_read on public.permission_requests;
create policy permissions_read on public.permission_requests for select to authenticated using (facility_id=public.current_facility_id() and (patient_id=auth.uid() or public.patient_staff()));
drop policy if exists admissions_read on public.planned_admissions;
create policy admissions_read on public.planned_admissions for select to authenticated using (facility_id=public.current_facility_id() and public.current_role() in ('reception'::public.app_role,'nurse'::public.app_role,'admin'::public.app_role));

-- Sport room
drop policy if exists "coach and admin delete sport room schedules" on public.sport_room_schedules;
create policy "coach and admin delete sport room schedules" on public.sport_room_schedules for delete to authenticated using (facility_id=public.current_facility_id() and public.current_role() in ('coach'::public.app_role,'admin'::public.app_role));
drop policy if exists "coach and admin insert sport room schedules" on public.sport_room_schedules;
create policy "coach and admin insert sport room schedules" on public.sport_room_schedules for insert to authenticated with check (facility_id=public.current_facility_id() and updated_by=auth.uid() and public.current_role() in ('coach'::public.app_role,'admin'::public.app_role));
drop policy if exists "coach and admin update sport room schedules" on public.sport_room_schedules;
create policy "coach and admin update sport room schedules" on public.sport_room_schedules for update to authenticated using (facility_id=public.current_facility_id() and public.current_role() in ('coach'::public.app_role,'admin'::public.app_role)) with check (facility_id=public.current_facility_id() and updated_by=auth.uid() and public.current_role() in ('coach'::public.app_role,'admin'::public.app_role));
drop policy if exists "signed in users read sport room schedules" on public.sport_room_schedules;
create policy "signed in users read sport room schedules" on public.sport_room_schedules for select to authenticated using (facility_id=public.current_facility_id());

-- Visits
drop policy if exists "patient reads own visits" on public.visit_notifications;
create policy "patient reads own visits" on public.visit_notifications for select to authenticated using (facility_id=public.current_facility_id() and patient_id=auth.uid());
drop policy if exists "reception reads visits" on public.visit_notifications;
create policy "reception reads visits" on public.visit_notifications for select to authenticated using (facility_id=public.current_facility_id() and public.current_role() in ('reception'::public.app_role,'admin'::public.app_role));

-- Wards
drop policy if exists wards_read on public.wards;
create policy wards_read on public.wards for select to authenticated using (facility_id=public.current_facility_id());
