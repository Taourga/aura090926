create table if not exists public.operational_tasks (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  stay_id uuid references public.patient_stays(id) on delete cascade, patient_id uuid references public.profiles(id) on delete cascade,
  task_code text not null, title text not null, assigned_role text not null, due_at timestamptz,
  status text not null default 'pending' check (status in ('pending','done','cancelled')), auto_generated boolean not null default true,
  completed_at timestamptz, completed_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(stay_id, task_code)
);
create index if not exists operational_tasks_facility_status_due_idx on public.operational_tasks(facility_id,status,due_at);
create index if not exists operational_tasks_patient_idx on public.operational_tasks(patient_id);
alter table public.operational_tasks enable row level security;
drop policy if exists operational_tasks_select on public.operational_tasks;
create policy operational_tasks_select on public.operational_tasks for select using (facility_id=public.current_facility_id() and public.current_role() in ('doctor','manager','nurse','reception','governance','technical','admin'));
revoke all on public.operational_tasks from anon; grant select on public.operational_tasks to authenticated;

create or replace function public.sync_discharge_operational_tasks() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.planned_discharge_at is not null then
    insert into public.operational_tasks(facility_id,stay_id,patient_id,task_code,title,assigned_role,due_at) values
      (new.facility_id,new.id,new.patient_id,'discharge_reception','Préparer les documents de sortie et l’accueil de départ','reception',new.planned_discharge_at-interval '2 hours'),
      (new.facility_id,new.id,new.patient_id,'discharge_governance','Préparer la chambre, le linge et la remise en état','governance',new.planned_discharge_at),
      (new.facility_id,new.id,new.patient_id,'discharge_technical','Vérifier les besoins matériels et équipements liés à la sortie','technical',new.planned_discharge_at-interval '3 hours'),
      (new.facility_id,new.id,new.patient_id,'discharge_nurse','Vérifier que la sortie est opérationnellement prête','nurse',new.planned_discharge_at-interval '1 hour')
    on conflict(stay_id,task_code) do update set due_at=excluded.due_at,title=excluded.title,assigned_role=excluded.assigned_role,status=case when public.operational_tasks.status='done' then 'done' else 'pending' end,updated_at=now();
  elsif old.planned_discharge_at is not null and new.planned_discharge_at is null then
    update public.operational_tasks set status='cancelled',updated_at=now() where stay_id=new.id and auto_generated=true and status='pending' and task_code like 'discharge_%';
  end if; return new;
end $$;
drop trigger if exists patient_stays_sync_discharge_tasks on public.patient_stays;
create trigger patient_stays_sync_discharge_tasks after insert or update of planned_discharge_at on public.patient_stays for each row execute function public.sync_discharge_operational_tasks();

insert into public.operational_tasks(facility_id,stay_id,patient_id,task_code,title,assigned_role,due_at)
select s.facility_id,s.id,s.patient_id,v.task_code,v.title,v.assigned_role,case v.task_code when 'discharge_reception' then s.planned_discharge_at-interval '2 hours' when 'discharge_governance' then s.planned_discharge_at when 'discharge_technical' then s.planned_discharge_at-interval '3 hours' else s.planned_discharge_at-interval '1 hour' end
from public.patient_stays s cross join (values ('discharge_reception','Préparer les documents de sortie et l’accueil de départ','reception'),('discharge_governance','Préparer la chambre, le linge et la remise en état','governance'),('discharge_technical','Vérifier les besoins matériels et équipements liés à la sortie','technical'),('discharge_nurse','Vérifier que la sortie est opérationnellement prête','nurse')) as v(task_code,title,assigned_role)
where s.ended_at is null and s.planned_discharge_at is not null on conflict(stay_id,task_code) do nothing;

create or replace function public.complete_operational_task(p_task_id uuid,p_done boolean default true) returns void language plpgsql security definer set search_path=public as $$
declare r public.operational_tasks%rowtype; ro public.app_role; fac uuid:=public.current_facility_id(); begin ro:=public.current_role(); select * into r from public.operational_tasks where id=p_task_id and facility_id=fac for update; if not found then raise exception 'Tâche introuvable'; end if; if ro::text<>r.assigned_role and ro not in ('admin','manager') then raise exception 'Action non autorisée'; end if; update public.operational_tasks set status=case when p_done then 'done' else 'pending' end,completed_at=case when p_done then now() else null end,completed_by=case when p_done then auth.uid() else null end,updated_at=now() where id=p_task_id; perform public.write_audit(case when p_done then 'operational_task_completed' else 'operational_task_reopened' end,'operational_task',p_task_id,jsonb_build_object('task_code',r.task_code,'assigned_role',r.assigned_role)); end $$;
revoke all on function public.complete_operational_task(uuid,boolean) from public,anon; grant execute on function public.complete_operational_task(uuid,boolean) to authenticated;

create or replace function public.aura_roi_dashboard(p_days integer default 30) returns jsonb language plpgsql security definer set search_path=public as $$
declare fac uuid:=public.current_facility_id(); ro public.app_role:=public.current_role(); since_at timestamptz:=now()-make_interval(days=>greatest(1,least(coalesce(p_days,30),365))); result jsonb; begin if ro not in ('admin','manager','governance','doctor') then raise exception 'Accès non autorisé'; end if; select jsonb_build_object('days',greatest(1,least(coalesce(p_days,30),365)),'permission_requests',(select count(*) from public.permission_requests where facility_id=fac and created_at>=since_at),'permission_reviews',(select count(*) from public.audit_events where facility_id=fac and event_type='permission_reviewed' and created_at>=since_at),'movements_traced',(select count(*) from public.permission_requests where facility_id=fac and (departed_at>=since_at or returned_at>=since_at)),'visit_notifications',(select count(*) from public.visit_notifications where facility_id=fac and created_at>=since_at),'bulletin_requests',(select count(*) from public.bulletin_requests where facility_id=fac and requested_at>=since_at),'activity_updates',(select count(*) from public.activity_updates where facility_id=fac and created_at>=since_at),'operational_tasks_generated',(select count(*) from public.operational_tasks where facility_id=fac and created_at>=since_at),'operational_tasks_done',(select count(*) from public.operational_tasks where facility_id=fac and completed_at>=since_at),'active_staff_users',(select count(distinct actor_id) from public.audit_events where facility_id=fac and created_at>=since_at and actor_id is not null),'avg_permission_approval_minutes',(select round(avg(extract(epoch from (greatest(doctor_decided_at,manager_decided_at)-created_at))/60.0)::numeric,1) from public.permission_requests where facility_id=fac and created_at>=since_at and doctor_decided_at is not null and manager_decided_at is not null),'estimated_self_service_interactions',((select count(*) from public.permission_requests where facility_id=fac and created_at>=since_at)+(select count(*) from public.visit_notifications where facility_id=fac and created_at>=since_at)+(select count(*) from public.bulletin_requests where facility_id=fac and requested_at>=since_at))) into result; return result; end $$;
revoke all on function public.aura_roi_dashboard(integer) from public,anon; grant execute on function public.aura_roi_dashboard(integer) to authenticated;
