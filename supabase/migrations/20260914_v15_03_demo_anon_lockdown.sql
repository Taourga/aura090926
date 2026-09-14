-- AURA Demo investor hardening 2026-09-14
-- No business data or public RPC is needed before authentication.

revoke usage on schema public from anon;
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;

alter policy "patients read their floor rounds" on public.doctor_rounds to authenticated;
alter policy "operational_tasks_select" on public.operational_tasks to authenticated;
alter policy "patient_daily_feedback_select" on public.patient_daily_feedback to authenticated;
alter policy "patient_service_requests_select" on public.patient_service_requests to authenticated;
