-- AURA V1.4 / LOT 4 — high-value indexes for pilot workloads.
-- Additive only: improves common joins/filters without changing data or RLS behavior.

create index if not exists activity_enrollments_patient_idx on public.activity_enrollments(patient_id);
create index if not exists appointments_patient_idx on public.appointments(patient_id);
create index if not exists appointments_creator_idx on public.appointments(creator_id);
create index if not exists audit_events_actor_idx on public.audit_events(actor_id);
create index if not exists patient_stays_ward_idx on public.patient_stays(ward_id);
create index if not exists permission_requests_patient_idx on public.permission_requests(patient_id);
create index if not exists permission_requests_stay_idx on public.permission_requests(stay_id);
create index if not exists profiles_active_facility_idx on public.profiles(active_facility_id);
create index if not exists information_posts_author_idx on public.information_posts(author_id);
create index if not exists planned_admissions_created_by_idx on public.planned_admissions(created_by);
