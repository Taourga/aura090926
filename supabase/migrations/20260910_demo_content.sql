-- Contenu de démonstration : activités, inscriptions, rendez-vous, permissions, salle de sport et menus.
-- Les données sont associées automatiquement à tous les profils patients actifs existants.

insert into public.wards (name, floor) values
  ('Unité RDC', 'RDC'),
  ('Unité Étage 1', '1er étage'),
  ('Unité Étage 2', '2e étage'),
  ('Unité Étage 3', '3e étage')
on conflict (name) do nothing;

with ranked_patients as (
  select id, row_number() over (order by created_at, id) as position
  from public.profiles
  where role = 'patient'::public.app_role and active = true
), assignments as (
  select id,
    case ((position - 1) % 4)
      when 0 then 'RDC'
      when 1 then '1er étage'
      when 2 then '2e étage'
      else '3e étage'
    end as floor_name,
    case ((position - 1) % 4)
      when 0 then '012'
      when 1 then '112'
      when 2 then '214'
      else '315'
    end as room_number
  from ranked_patients
)
insert into public.patient_stays (patient_id, ward_id, room_number, presence)
select assignments.id, ward.id, assignments.room_number, 'present'
from assignments
join lateral (
  select id from public.wards
  where floor = assignments.floor_name and active = true
  order by name
  limit 1
) ward on true
where not exists (
  select 1 from public.patient_stays
  where patient_id = assignments.id and ended_at is null
);

with planned_activities(title, description, starts_at, ends_at, location, capacity) as (
  values
    ('Boxe-thérapie', 'Mise en mouvement et travail de confiance encadrés.', current_date + 1 + time '10:00', current_date + 1 + time '11:00', 'Salle de sport', 50),
    ('Équithérapie', 'Séance d''accompagnement au contact du cheval.', current_date + 2 + time '14:00', current_date + 2 + time '15:30', 'Centre équestre partenaire', 50),
    ('Relaxation guidée', 'Respiration, détente musculaire et retour au calme.', current_date + 3 + time '16:00', current_date + 3 + time '17:00', 'Salle bien-être', 50),
    ('Art-thérapie', 'Atelier créatif en petit groupe.', current_date + 4 + time '10:30', current_date + 4 + time '12:00', 'Atelier 2', 50),
    ('Boxe-thérapie', 'Travail corporel progressif et encadré.', current_date + 5 + time '10:00', current_date + 5 + time '11:00', 'Salle de sport', 50),
    ('Équithérapie', 'Séance de médiation avec le cheval.', current_date + 6 + time '14:00', current_date + 6 + time '15:30', 'Centre équestre partenaire', 50),
    ('Relaxation guidée', 'Temps de respiration et de détente.', current_date + 7 + time '16:00', current_date + 7 + time '17:00', 'Salle bien-être', 50)
)
insert into public.activities (title, description, starts_at, ends_at, location, capacity)
select title, description, starts_at, ends_at, location, capacity from planned_activities planned
where not exists (
  select 1 from public.activities activity
  where activity.title = planned.title and activity.starts_at::date = planned.starts_at::date
);

insert into public.activity_enrollments (activity_id, patient_id)
select activity.id, patient.id
from public.activities activity
cross join public.profiles patient
where activity.active = true
  and activity.starts_at > now()
  and patient.role = 'patient'::public.app_role
  and patient.active = true
on conflict (activity_id, patient_id) do nothing;

with doctor as (
  select id from public.profiles where role = 'doctor'::public.app_role and active = true order by created_at limit 1
), ranked_patients as (
  select id, row_number() over (order by created_at, id) as position
  from public.profiles where role = 'patient'::public.app_role and active = true
)
insert into public.appointments (patient_id, creator_id, title, starts_at, ends_at, location, notes)
select patient.id, doctor.id,
  case ((patient.position - 1) % 3)
    when 0 then 'Entretien de suivi'
    when 1 then 'Point d''accompagnement'
    else 'Rendez-vous individuel'
  end,
  current_date + 1 + ((patient.position - 1)::integer % 5) + time '10:00',
  current_date + 1 + ((patient.position - 1)::integer % 5) + time '10:45',
  'Bureau médical',
  'Créneau de démonstration.'
from ranked_patients patient cross join doctor
where not exists (
  select 1 from public.appointments appointment
  where appointment.patient_id = patient.id and appointment.starts_at > now()
);

insert into public.permission_requests (patient_id, stay_id, departure_at, return_at, reason, status)
select stay.patient_id, stay.id, current_date + 2 + time '13:30', current_date + 2 + time '17:30', 'Permission de démonstration', 'waiting'
from public.patient_stays stay
where stay.ended_at is null
  and not exists (
    select 1 from public.permission_requests permission
    where permission.patient_id = stay.patient_id and permission.status in ('submitted'::public.permission_status, 'waiting'::public.permission_status)
  );

with doctor as (
  select id from public.profiles where role = 'doctor'::public.app_role and active = true order by created_at limit 1
), manager as (
  select id from public.profiles where role = 'manager'::public.app_role and active = true order by created_at limit 1
)
insert into public.permission_requests (
  patient_id, stay_id, departure_at, return_at, reason, status,
  doctor_decision, doctor_decided_by, doctor_decided_at,
  manager_decision, manager_decided_by, manager_decided_at,
  departed_at, returned_at
)
select stay.patient_id, stay.id,
  current_date - 4 + time '14:00', current_date - 4 + time '17:00', 'Permission précédente', 'returned',
  'approved', doctor.id, current_date - 5 + time '16:00',
  'approved', manager.id, current_date - 5 + time '17:00',
  current_date - 4 + time '14:10', current_date - 4 + time '16:50'
from public.patient_stays stay cross join doctor cross join manager
where stay.ended_at is null
  and not exists (
    select 1 from public.permission_requests permission
    where permission.patient_id = stay.patient_id and permission.status = 'returned'::public.permission_status
  );

with days as (
  select current_date + offset_day as schedule_date, offset_day
  from generate_series(0, 6) as offset_day
)
insert into public.sport_room_schedules (schedule_date, opens_at, closes_at, note)
select schedule_date, time '09:00', time '12:00',
  case when offset_day = 1 then 'Boxe-thérapie de 10 h à 11 h.'
       when offset_day = 4 then 'Art-thérapie de 10 h 30 à 12 h.'
       else 'Accès libre à tous les patients.' end
from days
on conflict (schedule_date) do nothing;

with days as (
  select current_date + offset_day as service_date, offset_day
  from generate_series(0, 6) as offset_day
), meals as (
  select service_date, offset_day, 'breakfast'::text as meal,
    case (offset_day % 3) when 0 then 'Pain complet, laitage, fruit frais et boisson chaude.' when 1 then 'Céréales, yaourt nature, compote et boisson chaude.' else 'Brioche, fromage blanc, fruit de saison et boisson chaude.' end as description from days
  union all
  select service_date, offset_day, 'lunch'::text,
    case (offset_day % 3) when 0 then 'Crudités, poulet rôti, légumes du jour et yaourt.' when 1 then 'Salade de saison, poisson au four, riz et compote.' else 'Potage, sauté de dinde, purée de légumes et fruit.' end from days
  union all
  select service_date, offset_day, 'dinner'::text,
    case (offset_day % 3) when 0 then 'Velouté de légumes, gratin de pâtes et compote.' when 1 then 'Soupe maison, omelette aux herbes, salade et laitage.' else 'Potage, hachis végétarien et fruit cuit.' end from days
)
insert into public.menu_items (service_date, meal, description)
select service_date, meal, description from meals
on conflict (service_date, meal) do nothing;
