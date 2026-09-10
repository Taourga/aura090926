-- AURA - espace médecin : tournées par étage et créneaux externes privés

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

alter table public.doctor_rounds enable row level security;
alter table public.doctor_schedule_blocks enable row level security;

create policy "patients read their floor rounds" on public.doctor_rounds for select to authenticated using (
  (public.current_role() = 'patient'::public.app_role and exists (
    select 1 from public.patient_stays current_stay
    where current_stay.patient_id = auth.uid()
      and current_stay.ended_at is null
      and coalesce(current_stay.room_number, '') ~ '^[0-3]'
      and left(current_stay.room_number, 1)::smallint = floor_number
  ))
  or exists (
    select 1 from public.profiles staff_profile
    where staff_profile.id = auth.uid()
      and staff_profile.role in ('doctor'::public.app_role, 'manager'::public.app_role, 'reception'::public.app_role, 'psychologist'::public.app_role, 'nurse'::public.app_role, 'provider'::public.app_role, 'admin'::public.app_role)
  )
);
create policy "doctors publish their rounds" on public.doctor_rounds for insert to authenticated with check (
  doctor_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'::public.app_role)
);
create policy "doctors update their rounds" on public.doctor_rounds for update to authenticated using (
  doctor_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'::public.app_role)
) with check (
  doctor_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'::public.app_role)
);
create policy "doctors delete their rounds" on public.doctor_rounds for delete to authenticated using (
  doctor_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'::public.app_role)
);

create policy "doctor reads private schedule blocks" on public.doctor_schedule_blocks for select to authenticated using (
  doctor_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'::public.app_role)
);
create policy "doctor creates private schedule blocks" on public.doctor_schedule_blocks for insert to authenticated with check (
  doctor_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'::public.app_role)
);
create policy "doctor updates private schedule blocks" on public.doctor_schedule_blocks for update to authenticated using (
  doctor_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'::public.app_role)
) with check (
  doctor_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'::public.app_role)
);
create policy "doctor deletes private schedule blocks" on public.doctor_schedule_blocks for delete to authenticated using (
  doctor_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'doctor'::public.app_role)
);

grant select, insert, update, delete on public.doctor_rounds, public.doctor_schedule_blocks to authenticated;
