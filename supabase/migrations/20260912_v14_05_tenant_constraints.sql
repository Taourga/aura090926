-- AURA V1.4 / LOT 2C — Tenant-scoped unique and foreign-key constraints

alter table public.planned_admissions drop constraint if exists planned_admissions_room_number_fkey;
alter table public.clinic_rooms drop constraint if exists clinic_rooms_pkey;
alter table public.clinic_rooms add constraint clinic_rooms_pkey primary key (facility_id, number);
alter table public.planned_admissions add constraint planned_admissions_room_facility_fkey
  foreign key (facility_id, room_number) references public.clinic_rooms(facility_id, number) on delete restrict;

alter table public.housekeeping_assignments drop constraint if exists housekeeping_assignments_service_date_fkey;
alter table public.housekeeping_assignments drop constraint if exists housekeeping_assignments_pkey;
alter table public.housekeeping_assignments drop constraint if exists housekeeping_assignments_service_date_area_agent_id_key;
alter table public.housekeeping_rosters drop constraint if exists housekeeping_rosters_pkey;
alter table public.housekeeping_rosters add constraint housekeeping_rosters_pkey primary key (facility_id, service_date);
alter table public.housekeeping_assignments add constraint housekeeping_assignments_pkey primary key (facility_id, service_date, area, slot);
alter table public.housekeeping_assignments add constraint housekeeping_assignments_facility_date_area_agent_key unique (facility_id, service_date, area, agent_id);
alter table public.housekeeping_assignments add constraint housekeeping_assignments_roster_fkey
  foreign key (facility_id, service_date) references public.housekeeping_rosters(facility_id, service_date) on delete cascade;

alter table public.housekeeping_tasks drop constraint if exists housekeeping_tasks_service_date_target_period_key;
alter table public.housekeeping_tasks add constraint housekeeping_tasks_facility_date_target_period_key unique (facility_id, service_date, target, period);

alter table public.menu_items drop constraint if exists menu_items_service_date_meal_key;
alter table public.menu_items add constraint menu_items_facility_date_meal_key unique (facility_id, service_date, meal);

alter table public.sport_room_schedules drop constraint if exists sport_room_schedules_schedule_date_key;
alter table public.sport_room_schedules add constraint sport_room_schedules_facility_date_key unique (facility_id, schedule_date);

alter table public.visit_notifications drop constraint if exists visit_notifications_patient_id_scheduled_start_key;
alter table public.visit_notifications add constraint visit_notifications_facility_patient_start_key unique (facility_id, patient_id, scheduled_start);

alter table public.wards drop constraint if exists wards_name_key;
alter table public.wards add constraint wards_facility_name_key unique (facility_id, name);
