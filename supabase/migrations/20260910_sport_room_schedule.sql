-- Planning commun de la salle de sport, modifiable par le coach ou l'administrateur.
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

alter table public.sport_room_schedules enable row level security;

create policy "signed in users read sport room schedules" on public.sport_room_schedules
for select to authenticated using (true);

create policy "coach and admin insert sport room schedules" on public.sport_room_schedules
for insert to authenticated with check (
  updated_by = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role in ('coach'::public.app_role, 'admin'::public.app_role)
  )
);

create policy "coach and admin update sport room schedules" on public.sport_room_schedules
for update to authenticated using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role in ('coach'::public.app_role, 'admin'::public.app_role)
  )
) with check (
  updated_by = auth.uid()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role in ('coach'::public.app_role, 'admin'::public.app_role)
  )
);

create policy "coach and admin delete sport room schedules" on public.sport_room_schedules
for delete to authenticated using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role in ('coach'::public.app_role, 'admin'::public.app_role)
  )
);

grant select, insert, update, delete on public.sport_room_schedules to authenticated;
