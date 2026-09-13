create or replace function public.aura_roi_dashboard(p_days integer default 30) returns jsonb language plpgsql security definer set search_path=public as $$
declare fac uuid:=public.current_facility_id(); ro public.app_role:=public.current_role(); since_at timestamptz:=now()-make_interval(days=>greatest(1,least(coalesce(p_days,30),365))); result jsonb;
begin
  if ro <> 'admin' then raise exception 'Accès non autorisé'; end if;
  select jsonb_build_object(
    'days',greatest(1,least(coalesce(p_days,30),365)),
    'permission_requests',(select count(*) from public.permission_requests where facility_id=fac and created_at>=since_at),
    'permission_reviews',(select count(*) from public.audit_events where facility_id=fac and event_type='permission_reviewed' and created_at>=since_at),
    'movements_traced',(select count(*) from public.permission_requests where facility_id=fac and (departed_at>=since_at or returned_at>=since_at)),
    'visit_notifications',(select count(*) from public.visit_notifications where facility_id=fac and created_at>=since_at),
    'bulletin_requests',(select count(*) from public.bulletin_requests where facility_id=fac and requested_at>=since_at),
    'activity_updates',(select count(*) from public.activity_updates where facility_id=fac and created_at>=since_at),
    'operational_tasks_generated',(select count(*) from public.operational_tasks where facility_id=fac and created_at>=since_at),
    'operational_tasks_done',(select count(*) from public.operational_tasks where facility_id=fac and completed_at>=since_at),
    'active_staff_users',(select count(distinct actor_id) from public.audit_events where facility_id=fac and created_at>=since_at and actor_id is not null),
    'avg_permission_approval_minutes',(select round(avg(extract(epoch from (greatest(doctor_decided_at,manager_decided_at)-created_at))/60.0)::numeric,1) from public.permission_requests where facility_id=fac and created_at>=since_at and doctor_decided_at is not null and manager_decided_at is not null),
    'estimated_self_service_interactions',((select count(*) from public.permission_requests where facility_id=fac and created_at>=since_at)+(select count(*) from public.visit_notifications where facility_id=fac and created_at>=since_at)+(select count(*) from public.bulletin_requests where facility_id=fac and requested_at>=since_at))
  ) into result;
  return result;
end $$;
revoke all on function public.aura_roi_dashboard(integer) from public,anon;
grant execute on function public.aura_roi_dashboard(integer) to authenticated;
