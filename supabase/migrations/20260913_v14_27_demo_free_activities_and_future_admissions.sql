do $$
declare fac uuid; reception_id uuid; camille uuid; ines uuid;
begin
  select active_facility_id,id into fac,reception_id from public.profiles where full_name='Paul Morel' and role='reception' limit 1;
  if fac is null or reception_id is null then return; end if;

  insert into public.sport_room_schedules(facility_id,schedule_date,opens_at,closes_at,note,updated_by)
  values
    (fac,current_date,'09:30','10:15','Marche douce au jardin',reception_id),
    (fac,current_date+1,'14:00','15:00','Jeux de société au salon',reception_id),
    (fac,current_date+2,'10:30','11:15','Étirements collectifs',reception_id),
    (fac,current_date+3,'15:00','16:00','Lecture & café au patio',reception_id),
    (fac,current_date+4,'11:00','11:45','Balade accompagnée',reception_id),
    (fac,current_date+5,'14:30','15:30','Atelier musique libre',reception_id),
    (fac,current_date+6,'10:00','11:00','Temps jardin & relaxation',reception_id)
  on conflict(facility_id,schedule_date) do update set opens_at=excluded.opens_at,closes_at=excluded.closes_at,note=excluded.note,updated_by=excluded.updated_by,updated_at=now();

  select id into camille from public.profiles where full_name='Camille Durand' and role='patient' limit 1;
  select id into ines from public.profiles where full_name='Inès Dubois' and role='patient' limit 1;
  if camille is not null and not exists(select 1 from public.planned_admissions where patient_id=camille and stay_id is null and cancelled_at is null and expected_at>now()) then
    insert into public.planned_admissions(patient_id,room_number,expected_at,created_by,facility_id) values(camille,'105',now()+interval '21 days',reception_id,fac);
  end if;
  if ines is not null and not exists(select 1 from public.planned_admissions where patient_id=ines and stay_id is null and cancelled_at is null and expected_at>now()) then
    insert into public.planned_admissions(patient_id,room_number,expected_at,created_by,facility_id) values(ines,'211',now()+interval '28 days',reception_id,fac);
  end if;
end $$;
