-- AURA Demo investor hardening 2026-09-14
-- Trigger functions are invoked by PostgreSQL triggers and must not be exposed as RPCs.

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_discharge_operational_tasks() from public, anon, authenticated;
