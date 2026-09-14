-- AURA Demo security hardening snapshot 2026-09-14
-- Prevent unauthenticated callers from invoking sensitive SECURITY DEFINER RPCs.

revoke execute on function public.cancel_my_permission_request(uuid) from public, anon;
grant execute on function public.cancel_my_permission_request(uuid) to authenticated, service_role;

revoke execute on function public.discharge_planning_board() from public, anon;
grant execute on function public.discharge_planning_board() to authenticated, service_role;

revoke execute on function public.permission_window_available(uuid, timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.permission_window_available(uuid, timestamptz, timestamptz, uuid) to authenticated, service_role;

revoke execute on function public.send_clinical_message(uuid, text, integer) from public, anon;
grant execute on function public.send_clinical_message(uuid, text, integer) to authenticated, service_role;

revoke execute on function public.sync_discharge_operational_tasks() from public, anon;
grant execute on function public.sync_discharge_operational_tasks() to authenticated, service_role;

revoke execute on function public.update_my_permission_request(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.update_my_permission_request(uuid, timestamptz, timestamptz, text) to authenticated, service_role;
