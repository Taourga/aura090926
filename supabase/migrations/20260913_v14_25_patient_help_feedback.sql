create table if not exists public.patient_service_requests (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade, category text not null check (category in ('room','meal','planning','admin')),
  message text, status text not null default 'pending' check (status in ('pending','done','cancelled')), created_at timestamptz not null default now(), completed_at timestamptz, completed_by uuid references public.profiles(id)
);
create index if not exists patient_service_requests_facility_status_idx on public.patient_service_requests(facility_id,status,created_at);
alter table public.patient_service_requests enable row level security;
drop policy if exists patient_service_requests_select on public.patient_service_requests;
create policy patient_service_requests_select on public.patient_service_requests for select using (facility_id=public.current_facility_id() and (patient_id=auth.uid() or public.current_role() in ('reception','manager','nurse','governance','admin')));
revoke all on public.patient_service_requests from anon; grant select on public.patient_service_requests to authenticated;

create or replace function public.submit_patient_service_request(p_category text,p_message text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; fac uuid:=public.current_facility_id(); begin if public.current_role()<>'patient' then raise exception 'Action réservée au patient'; end if; if p_category not in ('room','meal','planning','admin') then raise exception 'Catégorie invalide'; end if; if exists(select 1 from public.patient_service_requests where facility_id=fac and patient_id=auth.uid() and category=p_category and status='pending') then raise exception 'Une demande de ce type est déjà en attente'; end if; insert into public.patient_service_requests(facility_id,patient_id,category,message) values(fac,auth.uid(),p_category,nullif(trim(p_message),'')) returning id into v_id; perform public.write_audit('patient_service_request_submitted','patient_service_request',v_id,jsonb_build_object('category',p_category)); return v_id; end $$;
revoke all on function public.submit_patient_service_request(text,text) from public,anon; grant execute on function public.submit_patient_service_request(text,text) to authenticated;

create or replace function public.complete_patient_service_request(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare fac uuid:=public.current_facility_id(); ro public.app_role:=public.current_role(); begin if ro not in ('reception','manager','nurse','governance','admin') then raise exception 'Action non autorisée'; end if; update public.patient_service_requests set status='done',completed_at=now(),completed_by=auth.uid() where id=p_id and facility_id=fac and status='pending'; if not found then raise exception 'Demande introuvable ou déjà traitée'; end if; perform public.write_audit('patient_service_request_completed','patient_service_request',p_id,'{}'::jsonb); end $$;
revoke all on function public.complete_patient_service_request(uuid) from public,anon; grant execute on function public.complete_patient_service_request(uuid) to authenticated;

create table if not exists public.patient_daily_feedback (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade, feedback_date date not null, mood smallint not null check (mood between 1 and 3),
  comment text, created_at timestamptz not null default now(), unique(facility_id,patient_id,feedback_date)
);
alter table public.patient_daily_feedback enable row level security;
drop policy if exists patient_daily_feedback_select on public.patient_daily_feedback;
create policy patient_daily_feedback_select on public.patient_daily_feedback for select using (facility_id=public.current_facility_id() and (patient_id=auth.uid() or public.current_role() in ('manager','governance','admin')));
revoke all on public.patient_daily_feedback from anon; grant select on public.patient_daily_feedback to authenticated;

create or replace function public.submit_patient_daily_feedback(p_mood integer,p_comment text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; fac uuid:=public.current_facility_id(); tz text:='Europe/Paris'; local_day date; begin if public.current_role()<>'patient' then raise exception 'Action réservée au patient'; end if; if p_mood not between 1 and 3 then raise exception 'Valeur invalide'; end if; select coalesce(timezone,'Europe/Paris') into tz from public.facilities where id=fac; local_day:=(now() at time zone tz)::date; insert into public.patient_daily_feedback(facility_id,patient_id,feedback_date,mood,comment) values(fac,auth.uid(),local_day,p_mood,nullif(trim(p_comment),'')) on conflict(facility_id,patient_id,feedback_date) do update set mood=excluded.mood,comment=excluded.comment,created_at=now() returning id into v_id; perform public.write_audit('patient_daily_feedback_submitted','patient_daily_feedback',v_id,jsonb_build_object('mood',p_mood)); return v_id; end $$;
revoke all on function public.submit_patient_daily_feedback(integer,text) from public,anon; grant execute on function public.submit_patient_daily_feedback(integer,text) to authenticated;
