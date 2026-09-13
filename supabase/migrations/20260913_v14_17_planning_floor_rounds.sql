alter table public.wards add column if not exists floor_number smallint;

update public.wards
set floor_number = case
  when lower(coalesce(floor,'')) like '%rdc%' then 0
  when lower(coalesce(floor,'')) ~ '(^|[^0-9])1(er|e)?' then 1
  when lower(coalesce(floor,'')) ~ '(^|[^0-9])2(e|eme|ème)?' then 2
  when lower(coalesce(floor,'')) ~ '(^|[^0-9])3(e|eme|ème)?' then 3
  else floor_number
end
where floor_number is null;

alter table public.doctor_rounds add column if not exists duration_minutes smallint not null default 30;
alter table public.doctor_rounds drop constraint if exists doctor_rounds_duration_minutes_check;
alter table public.doctor_rounds add constraint doctor_rounds_duration_minutes_check check (duration_minutes between 5 and 240);

drop policy if exists "patients read their floor rounds" on public.doctor_rounds;
create policy "patients read their floor rounds" on public.doctor_rounds
for select using (
  facility_id = public.current_facility_id()
  and (
    (
      public.current_role() = 'patient'::public.app_role
      and exists (
        select 1
        from public.patient_stays s
        join public.wards w on w.id=s.ward_id and w.facility_id=s.facility_id
        where s.patient_id=auth.uid()
          and s.facility_id=public.current_facility_id()
          and s.ended_at is null
          and w.floor_number=doctor_rounds.floor_number
      )
    )
    or public.current_role() in ('doctor'::public.app_role,'manager'::public.app_role,'reception'::public.app_role,'psychologist'::public.app_role,'nurse'::public.app_role,'provider'::public.app_role,'admin'::public.app_role)
  )
);
