-- AURA V1.4 / LOT 4 — close anonymous access to tenant helper RPCs.
-- SECURITY DEFINER functions must never inherit PUBLIC execute accidentally.

revoke execute on function public.current_facility_id() from public, anon;
revoke execute on function public.current_facility_timezone() from public, anon;
revoke execute on function public.has_facility_access(uuid) from public, anon;
revoke execute on function public.has_organization_access(uuid) from public, anon;
revoke execute on function public.is_facility_admin(uuid) from public, anon;
revoke execute on function public.shares_current_facility(uuid) from public, anon;
revoke execute on function public.switch_facility(uuid) from public, anon;
revoke execute on function public.sync_legacy_profile_access_to_membership() from public, anon, authenticated;

grant execute on function public.current_facility_id() to authenticated;
grant execute on function public.current_facility_timezone() to authenticated;
grant execute on function public.has_facility_access(uuid) to authenticated;
grant execute on function public.has_organization_access(uuid) to authenticated;
grant execute on function public.is_facility_admin(uuid) to authenticated;
grant execute on function public.shares_current_facility(uuid) to authenticated;
grant execute on function public.switch_facility(uuid) to authenticated;
