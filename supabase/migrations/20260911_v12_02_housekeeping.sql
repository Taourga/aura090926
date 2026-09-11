-- Hôtellerie : tous les jours/heures métier sont en Europe/Paris.
-- Compatibilité avec la base historique qui utilisait uniquement audit(...).
create or replace function public.write_audit(p_event text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_events(actor_id,event_type,entity_type,entity_id,metadata)
  values(auth.uid(),p_event,p_entity_type,p_entity_id,coalesce(p_metadata,'{}'::jsonb));
end $$;
revoke all on function public.write_audit(text,text,uuid,jsonb) from public,anon,authenticated;

create table public.clinic_rooms (
  number text primary key,
  floor smallint not null check (floor between 0 and 3)
);
insert into public.clinic_rooms
select lpad(n::text,3,'0'), 0 from generate_series(1,10) n
union all select n::text, (n / 100)::smallint from generate_series(101,130) n
union all select n::text, (n / 100)::smallint from generate_series(201,230) n
union all select n::text, (n / 100)::smallint from generate_series(301,330) n;

alter table public.patient_stays add column planned_discharge_at timestamptz;
alter table public.patient_stays add constraint discharge_after_entry check (planned_discharge_at is null or planned_discharge_at > started_at);

create table public.planned_admissions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id),
  room_number text not null references public.clinic_rooms(number),
  expected_at timestamptz not null,
  stay_id uuid unique references public.patient_stays(id),
  cancelled_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index one_pending_admission_per_patient on public.planned_admissions(patient_id) where stay_id is null and cancelled_at is null;
create index admissions_expected on public.planned_admissions(expected_at);

-- Une version complète contient 8 postes d'étage + 3 postes d'ascenseur.
-- La dernière version prend effet à sa date, jusqu'à la version suivante.
create table public.housekeeping_rosters (
  service_date date primary key,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.housekeeping_assignments (
  service_date date not null references public.housekeeping_rosters(service_date),
  area text not null check (area in ('floor-0','floor-1','floor-2','floor-3','lift-1','lift-2','lift-3')),
  slot smallint not null check (slot in (1,2)),
  agent_id uuid not null references public.profiles(id),
  primary key(service_date,area,slot),
  unique(service_date,area,agent_id),
  check (area like 'floor-%' or slot = 1)
);
create table public.housekeeping_tasks (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  area text not null,
  target text not null,
  kind text not null check (kind in ('room','lift','toilet')),
  period text not null check (period in ('morning','noon','evening')),
  eligible boolean not null default true,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  completed_name text,
  unique(service_date,target,period),
  check ((completed_at is null) = (completed_by is null))
);
create index housekeeping_tasks_day on public.housekeeping_tasks(service_date);

alter table public.clinic_rooms enable row level security;
alter table public.planned_admissions enable row level security;
alter table public.housekeeping_rosters enable row level security;
alter table public.housekeeping_assignments enable row level security;
alter table public.housekeeping_tasks enable row level security;
-- Pas d'écriture directe : validations et horodatage uniquement dans les RPC.
grant select on public.clinic_rooms, public.planned_admissions to authenticated;
create policy rooms_read on public.clinic_rooms for select to authenticated using (public.current_role() is not null);
create policy admissions_read on public.planned_admissions for select to authenticated using (public.current_role() in ('reception','nurse','admin'));

create function public.housekeeping_skip_room(p_room text, p_date date)
returns boolean language sql stable security definer set search_path = public as $$
  -- Exception : retour d'une permission de 24 heures (ou plus). Une rotation
  -- définitive / nouvelle admission le même jour reste prioritaire.
  select exists (
    select 1 from public.patient_stays s join public.permission_requests p on p.stay_id=s.id
    where s.room_number=p_room and p.status in ('approved','departed','returned')
      and (coalesce(p.returned_at,p.return_at) at time zone 'Europe/Paris')::date=p_date
      and coalesce(p.returned_at,p.return_at)-coalesce(p.departed_at,p.departure_at) >= interval '24 hours'
      and (s.ended_at is null or (s.ended_at at time zone 'Europe/Paris')::date >= p_date)
  ) and not exists (
    select 1 from public.patient_stays s where s.room_number=p_room and (
      (s.started_at at time zone 'Europe/Paris')::date=p_date
      or (coalesce(s.ended_at,s.planned_discharge_at) at time zone 'Europe/Paris')::date=p_date)
  ) and not exists (
    select 1 from public.planned_admissions a where a.room_number=p_room
      and a.cancelled_at is null and (a.expected_at at time zone 'Europe/Paris')::date=p_date
  )
$$;

create function public.housekeeping_prepare(p_date date)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_date <> (now() at time zone 'Europe/Paris')::date then return; end if;
  insert into public.housekeeping_tasks(service_date,area,target,kind,period,eligible)
  select p_date,'floor-'||floor,number,'room','morning',not public.housekeeping_skip_room(number,p_date) from public.clinic_rooms
  union all select p_date,'lift-'||n,'Ascenseur '||n,'lift',p,true from generate_series(1,3) n cross join unnest(array['morning','noon','evening']) p
  union all select p_date,'floor-'||n,'Toilettes étage '||n,'toilet',p,true from generate_series(0,3) n cross join unnest(array['morning','noon','evening']) p
  on conflict(service_date,target,period) do nothing;
  update public.housekeeping_tasks set eligible=not public.housekeeping_skip_room(target,p_date)
  where service_date=p_date and kind='room' and completed_at is null;
end $$;

create function public.housekeeping_save_roster(p_date date, p_floors uuid[], p_lifts uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare i integer;
begin
  if coalesce(public.current_role()::text,'') not in ('governance','admin') then raise exception 'Action réservée au gouvernant'; end if;
  if p_date is null or p_date < (now() at time zone 'Europe/Paris')::date then raise exception 'Les affectations passées sont conservées'; end if;
  if coalesce(cardinality(p_floors),0)<>8 or coalesce(cardinality(p_lifts),0)<>3 then raise exception 'Deux personnes par étage et une par ascenseur sont requises'; end if;
  if (select count(distinct a) from unnest(p_floors) a)<>8 then raise exception 'Les huit postes d’étage doivent être attribués à huit agents différents'; end if;
  if exists(select 1 from unnest(p_floors||p_lifts) a where a is null or not exists(select 1 from public.profiles where id=a and active and role='technical')) then raise exception 'Sélectionnez des agents techniques actifs'; end if;
  perform pg_advisory_xact_lock(hashtext('housekeeping-roster'));
  insert into public.housekeeping_rosters(service_date,created_by) values(p_date,auth.uid()) on conflict(service_date) do update set created_by=auth.uid(),created_at=now();
  delete from public.housekeeping_assignments where service_date=p_date;
  for i in 1..8 loop
    insert into public.housekeeping_assignments values(p_date,'floor-'||((i-1)/2),((i-1)%2+1)::smallint,p_floors[i]);
  end loop;
  for i in 1..3 loop
    insert into public.housekeeping_assignments values(p_date,'lift-'||i,1,p_lifts[i]);
  end loop;
  perform public.write_audit('housekeeping_roster_saved','housekeeping',null,jsonb_build_object('date',p_date,'floors',p_floors,'lifts',p_lifts));
end $$;

create function public.housekeeping_complete(p_task uuid)
returns void language plpgsql security definer set search_path = public as $$
declare t public.housekeeping_tasks%rowtype; d date := (now() at time zone 'Europe/Paris')::date; h integer := extract(hour from now() at time zone 'Europe/Paris');
begin
  if coalesce(public.current_role()::text,'') <> 'technical' then raise exception 'Pointage réservé au personnel technique'; end if;
  perform public.housekeeping_prepare(d);
  select * into t from public.housekeeping_tasks where id=p_task for update;
  if not found or t.service_date<>d or not t.eligible then raise exception 'Cette tâche ne peut pas être validée aujourd’hui'; end if;
  if not exists(select 1 from public.housekeeping_assignments a where a.service_date=(select max(service_date) from public.housekeeping_rosters where service_date<=d) and a.area=t.area and a.agent_id=auth.uid()) then raise exception 'Cette zone ne vous est pas affectée'; end if;
  if t.completed_at is not null then return; end if;
  if (t.period='noon' and h<12) or (t.period='evening' and h<18) then raise exception 'Ce passage ne peut pas être pointé à l’avance (midi : 12 h, soir : 18 h)'; end if;
  update public.housekeeping_tasks set completed_at=clock_timestamp(),completed_by=auth.uid(),completed_name=(select full_name from public.profiles where id=auth.uid()) where id=t.id;
  perform public.write_audit('cleaning_completed','housekeeping_task',t.id,jsonb_build_object('target',t.target,'period',t.period));
end $$;

-- Réponse limitée aux informations hôtelières. Aucun nom de patient / motif
-- médical n'est renvoyé au gouvernant ou au personnel technique.
create function public.housekeeping_dashboard(p_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r text:=coalesce(public.current_role()::text,''); roster_date date; result jsonb;
begin
  if r not in ('governance','technical','admin') then raise exception 'Accès non autorisé'; end if;
  if p_date is null then raise exception 'Date requise'; end if;
  perform public.housekeeping_prepare(p_date);
  select max(service_date) into roster_date from public.housekeeping_rosters where service_date<=p_date;
  select jsonb_build_object(
    'rosterDate',roster_date,
    'agents',coalesce((select jsonb_agg(jsonb_build_object('id',id,'full_name',full_name) order by full_name) from public.profiles where role='technical' and active and (r<>'technical' or id=auth.uid())),'[]'::jsonb),
    'assignments',coalesce((select jsonb_agg(jsonb_build_object('area',a.area,'slot',a.slot,'agent_id',a.agent_id,'name',p.full_name)) from public.housekeeping_assignments a join public.profiles p on p.id=a.agent_id where a.service_date=roster_date and (r<>'technical' or a.agent_id=auth.uid())),'[]'::jsonb),
    'tasks',coalesce((select jsonb_agg(to_jsonb(t) order by t.area,t.target,case t.period when 'morning' then 1 when 'noon' then 2 else 3 end) from public.housekeeping_tasks t where t.service_date=p_date and t.eligible and (r<>'technical' or exists(select 1 from public.housekeeping_assignments a where a.service_date=roster_date and a.area=t.area and a.agent_id=auth.uid()))),'[]'::jsonb),
    'rooms',case when r='technical' then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object(
      'number',c.number,'floor',c.floor,
      'occupied',exists(select 1 from public.patient_stays s where s.room_number=c.number and s.started_at<=case when p_date=(now() at time zone 'Europe/Paris')::date then now() else (p_date+time '12:00') at time zone 'Europe/Paris' end and (s.ended_at is null or s.ended_at>case when p_date=(now() at time zone 'Europe/Paris')::date then now() else (p_date+time '12:00') at time zone 'Europe/Paris' end)),
      'entry',(select min(a.expected_at) from public.planned_admissions a where a.room_number=c.number and a.stay_id is null and a.cancelled_at is null),
      'exit',(select min(s.planned_discharge_at) from public.patient_stays s where s.room_number=c.number and s.ended_at is null),
      'skip',public.housekeeping_skip_room(c.number,p_date)
    ) order by c.number) from public.clinic_rooms c),'[]'::jsonb) end,
    'meals',case when r='technical' then '[]'::jsonb else (select jsonb_agg(jsonb_build_object('hour',m.h,'count',(
      select count(distinct patient_id) from (
        select s.patient_id from public.patient_stays s where s.started_at<=(p_date+m.h) at time zone 'Europe/Paris'
          and (coalesce(s.ended_at,s.planned_discharge_at) is null or coalesce(s.ended_at,s.planned_discharge_at)>(p_date+m.h) at time zone 'Europe/Paris')
          and not exists(select 1 from public.permission_requests p where p.stay_id=s.id and p.status in ('approved','departed','returned') and coalesce(p.departed_at,p.departure_at)<=(p_date+m.h) at time zone 'Europe/Paris' and coalesce(p.returned_at,p.return_at)>(p_date+m.h) at time zone 'Europe/Paris')
        union select a.patient_id from public.planned_admissions a where a.cancelled_at is null and a.stay_id is null and a.expected_at<=(p_date+m.h) at time zone 'Europe/Paris'
      ) present_patients
    )) order by m.h) from (values(time '08:00'),(time '12:00'),(time '19:00')) m(h)) end,
    'unmappedRooms',case when r='technical' then 0 else (select count(*) from public.patient_stays s where s.ended_at is null and not exists(select 1 from public.clinic_rooms c where c.number=s.room_number)) end
  ) into result;
  return result;
end $$;

create function public.plan_admission(p_patient uuid, p_room text, p_expected text)
returns void language plpgsql security definer set search_path=public as $$
declare expected timestamptz;
begin
  if coalesce(public.current_role()::text,'') not in ('reception','admin') then raise exception 'Action réservée aux admissions (accueil)'; end if;
  expected:=p_expected::timestamp at time zone 'Europe/Paris';
  if expected is null or expected<now() then raise exception 'Choisissez une entrée future'; end if;
  if not exists(select 1 from public.profiles where id=p_patient and role='patient' and active) then raise exception 'Patient invalide'; end if;
  if exists(select 1 from public.patient_stays where patient_id=p_patient and ended_at is null) then raise exception 'Ce patient possède déjà un séjour actif'; end if;
  perform 1 from public.clinic_rooms where number=p_room for update;
  if not found then raise exception 'Chambre invalide'; end if;
  if exists(select 1 from public.patient_stays where room_number=p_room and ended_at is null and (planned_discharge_at is null or planned_discharge_at>expected))
    or exists(select 1 from public.planned_admissions where room_number=p_room and stay_id is null and cancelled_at is null) then raise exception 'Chambre déjà occupée ou réservée sur cette période'; end if;
  insert into public.planned_admissions(patient_id,room_number,expected_at,created_by) values(p_patient,p_room,expected,auth.uid());
  perform public.write_audit('admission_planned','patient',p_patient,jsonb_build_object('room',p_room,'expected_at',expected));
end $$;

create function public.manage_admission(p_id uuid, p_action text)
returns void language plpgsql security definer set search_path=public as $$
declare a public.planned_admissions%rowtype; new_stay uuid;
begin
  if coalesce(public.current_role()::text,'') not in ('reception','admin') then raise exception 'Action réservée aux admissions'; end if;
  select * into a from public.planned_admissions where id=p_id for update;
  if not found or a.cancelled_at is not null or a.stay_id is not null then raise exception 'Admission déjà traitée'; end if;
  if p_action='cancel' then update public.planned_admissions set cancelled_at=now() where id=p_id;
  elsif p_action='arrive' then
    perform 1 from public.clinic_rooms where number=a.room_number for update;
    if exists(select 1 from public.patient_stays where room_number=a.room_number and ended_at is null) then raise exception 'La chambre n’a pas encore été libérée'; end if;
    insert into public.patient_stays(patient_id,room_number,started_at,ward_id)
    values(a.patient_id,a.room_number,now(),(select w.id from public.wards w where w.floor=case left(a.room_number,1) when '0' then 'RDC' when '1' then '1er étage' when '2' then '2e étage' else '3e étage' end limit 1)) returning id into new_stay;
    update public.planned_admissions set stay_id=new_stay where id=p_id;
  else raise exception 'Action invalide'; end if;
  perform public.write_audit('admission_'||p_action,'admission',p_id);
end $$;

create function public.plan_discharge(p_stay uuid, p_expected text, p_confirm boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare s public.patient_stays%rowtype; expected timestamptz;
begin
  if coalesce(public.current_role()::text,'') not in ('nurse','admin') then raise exception 'Action réservée aux infirmiers'; end if;
  select * into s from public.patient_stays where id=p_stay for update;
  if not found or s.ended_at is not null then raise exception 'Séjour déjà clôturé ou introuvable'; end if;
  if p_confirm then
    update public.patient_stays set ended_at=now() where id=p_stay;
  else
    expected:=nullif(p_expected,'')::timestamp at time zone 'Europe/Paris';
    if expected is not null and (expected<=s.started_at or expected<now()) then raise exception 'La sortie prévue doit être future et postérieure à l’entrée'; end if;
    update public.patient_stays set planned_discharge_at=expected where id=p_stay;
  end if;
  perform public.write_audit('discharge_updated','patient_stay',p_stay,jsonb_build_object('expected_at',expected,'confirmed',p_confirm));
end $$;

revoke all on function public.housekeeping_skip_room(text,date), public.housekeeping_prepare(date), public.housekeeping_save_roster(date,uuid[],uuid[]), public.housekeeping_complete(uuid), public.housekeeping_dashboard(date), public.plan_admission(uuid,text,text), public.manage_admission(uuid,text), public.plan_discharge(uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.housekeeping_save_roster(date,uuid[],uuid[]), public.housekeeping_complete(uuid), public.housekeeping_dashboard(date), public.plan_admission(uuid,text,text), public.manage_admission(uuid,text), public.plan_discharge(uuid,text,boolean) to authenticated;
