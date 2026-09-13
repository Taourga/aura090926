-- AURA Demo · care continuity / activity facilitators / bulletin workflow
-- Consolidates database changes applied as v14_18 through v14_22.

create table if not exists public.care_team_directory (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  user_id uuid null references public.profiles(id) on delete set null, full_name text not null,
  member_type text not null check (member_type in ('doctor','psychologist','facilitator')),
  specialty text null, email text null, phone text null, active boolean not null default true,
  created_at timestamptz not null default now(), unique(facility_id,full_name,member_type)
);
create table if not exists public.clinic_patient_roster (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  linked_profile_id uuid null references public.profiles(id) on delete cascade, display_name text not null,
  floor_number smallint not null check (floor_number between 0 and 20), room_number text null,
  reference_doctor_id uuid not null references public.care_team_directory(id), active boolean not null default true,
  created_at timestamptz not null default now(), unique(facility_id,linked_profile_id)
);
create table if not exists public.activity_facilitators (
  facility_id uuid not null references public.facilities(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  clinician_id uuid not null references public.care_team_directory(id) on delete cascade,
  is_primary boolean not null default true, primary key(activity_id,clinician_id)
);
create table if not exists public.activity_updates (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id), update_type text not null check (update_type in ('absence','change','information')),
  message text not null, created_at timestamptz not null default now()
);
create table if not exists public.bulletin_requests (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade, requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','generated','sent')), email_to text null,
  processed_by uuid null references public.profiles(id) on delete set null, generated_at timestamptz null, sent_at timestamptz null
);
create table if not exists public.doctor_absences (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  doctor_id uuid not null references public.care_team_directory(id) on delete cascade,
  starts_at timestamptz not null, ends_at timestamptz not null, reason text null,
  replacement_doctor_id uuid null references public.care_team_directory(id) on delete set null,
  created_by uuid null references public.profiles(id) on delete set null, created_at timestamptz not null default now(), check(ends_at>starts_at)
);
create table if not exists public.outbound_email_queue (
  id uuid primary key default gen_random_uuid(), facility_id uuid not null references public.facilities(id) on delete cascade,
  recipient text not null, subject text not null, body text not null, related_type text null, related_id uuid null,
  status text not null default 'queued' check(status in ('queued','sent','failed')), created_at timestamptz not null default now(), sent_at timestamptz null
);

alter table public.care_team_directory enable row level security;
alter table public.clinic_patient_roster enable row level security;
alter table public.activity_facilitators enable row level security;
alter table public.activity_updates enable row level security;
alter table public.bulletin_requests enable row level security;
alter table public.doctor_absences enable row level security;
alter table public.outbound_email_queue enable row level security;

drop policy if exists care_team_read on public.care_team_directory;
create policy care_team_read on public.care_team_directory for select to authenticated using(facility_id=public.current_facility_id());
drop policy if exists roster_read on public.clinic_patient_roster;
create policy roster_read on public.clinic_patient_roster for select to authenticated using(facility_id=public.current_facility_id() and (linked_profile_id=auth.uid() or public.current_role() in ('doctor'::public.app_role,'manager'::public.app_role,'nurse'::public.app_role,'reception'::public.app_role,'psychologist'::public.app_role,'provider'::public.app_role,'admin'::public.app_role)));
drop policy if exists facilitator_read on public.activity_facilitators;
create policy facilitator_read on public.activity_facilitators for select to authenticated using(facility_id=public.current_facility_id());
drop policy if exists activity_updates_read on public.activity_updates;
create policy activity_updates_read on public.activity_updates for select to authenticated using(facility_id=public.current_facility_id());
drop policy if exists bulletin_patient_read on public.bulletin_requests;
create policy bulletin_patient_read on public.bulletin_requests for select to authenticated using(facility_id=public.current_facility_id() and (patient_id=auth.uid() or public.current_role() in ('reception'::public.app_role,'admin'::public.app_role)));
drop policy if exists doctor_absence_read on public.doctor_absences;
create policy doctor_absence_read on public.doctor_absences for select to authenticated using(facility_id=public.current_facility_id());
drop policy if exists email_queue_staff_read on public.outbound_email_queue;
create policy email_queue_staff_read on public.outbound_email_queue for select to authenticated using(facility_id=public.current_facility_id() and public.current_role() in ('reception'::public.app_role,'admin'::public.app_role));

create or replace function public.request_situation_bulletin() returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_email text; begin
 if public.current_role()<>'patient'::public.app_role then raise exception 'Action réservée au patient'; end if;
 select coalesce(pc.personal_email,p.email) into v_email from public.profiles p left join public.patient_contact_cards pc on pc.patient_id=p.id and pc.facility_id=public.current_facility_id() where p.id=auth.uid();
 if exists(select 1 from public.bulletin_requests where facility_id=public.current_facility_id() and patient_id=auth.uid() and status='pending') then select id into v_id from public.bulletin_requests where facility_id=public.current_facility_id() and patient_id=auth.uid() and status='pending' order by requested_at desc limit 1; return v_id; end if;
 insert into public.bulletin_requests(facility_id,patient_id,email_to) values(public.current_facility_id(),auth.uid(),v_email) returning id into v_id;
 perform public.write_audit('situation_bulletin_requested','bulletin_request',v_id,jsonb_build_object('patient_id',auth.uid())); return v_id; end $$;
revoke all on function public.request_situation_bulletin() from public,anon; grant execute on function public.request_situation_bulletin() to authenticated;

create or replace function public.publish_activity_update(p_activity_id uuid,p_update_type text,p_message text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_ok boolean; begin
 if p_update_type not in ('absence','change','information') then raise exception 'Type invalide'; end if;
 select exists(select 1 from public.activity_facilitators af join public.care_team_directory c on c.id=af.clinician_id where af.activity_id=p_activity_id and af.facility_id=public.current_facility_id() and c.user_id=auth.uid()) or public.current_role() in ('admin'::public.app_role,'governance'::public.app_role) into v_ok;
 if not coalesce(v_ok,false) then raise exception 'Vous n’êtes pas intervenant de cette activité'; end if;
 insert into public.activity_updates(facility_id,activity_id,author_user_id,update_type,message) values(public.current_facility_id(),p_activity_id,auth.uid(),p_update_type,left(trim(p_message),500)) returning id into v_id;
 perform public.write_audit('activity_update_published','activity_update',v_id,jsonb_build_object('activity_id',p_activity_id,'type',p_update_type)); return v_id; end $$;
revoke all on function public.publish_activity_update(uuid,text,text) from public,anon; grant execute on function public.publish_activity_update(uuid,text,text) to authenticated;

create or replace function public.process_situation_bulletin(p_request_id uuid,p_action text) returns void language plpgsql security definer set search_path=public as $$
declare v_req public.bulletin_requests%rowtype; v_name text; begin
 if public.current_role() not in ('reception'::public.app_role,'admin'::public.app_role) then raise exception 'Action réservée à l’accueil'; end if;
 select * into v_req from public.bulletin_requests where id=p_request_id and facility_id=public.current_facility_id(); if not found then raise exception 'Demande introuvable'; end if;
 select full_name into v_name from public.profiles where id=v_req.patient_id;
 if p_action='generate' then update public.bulletin_requests set status='generated',processed_by=auth.uid(),generated_at=now() where id=p_request_id;
 elsif p_action='send' then if v_req.email_to is null or btrim(v_req.email_to)='' then raise exception 'Aucune adresse email patient'; end if; insert into public.outbound_email_queue(facility_id,recipient,subject,body,related_type,related_id) values(v_req.facility_id,v_req.email_to,'Votre bulletin de situation AURA','Bonjour '||coalesce(v_name,'')||', votre bulletin de situation a été préparé par l’accueil. Ceci est une démonstration AURA : le connecteur email de production sera branché au fournisseur de l’établissement.','bulletin_request',v_req.id); update public.bulletin_requests set status='sent',processed_by=auth.uid(),generated_at=coalesce(generated_at,now()),sent_at=now() where id=p_request_id;
 else raise exception 'Action invalide'; end if;
 perform public.write_audit('situation_bulletin_'||p_action,'bulletin_request',p_request_id,jsonb_build_object('patient_id',v_req.patient_id)); end $$;
revoke all on function public.process_situation_bulletin(uuid,text) from public,anon; grant execute on function public.process_situation_bulletin(uuid,text) to authenticated;

create or replace function public.publish_doctor_absence(p_starts_at timestamptz,p_ends_at timestamptz,p_reason text default null,p_replacement_doctor_id uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare v_directory_id uuid; v_id uuid; begin
 if public.current_role()<>'doctor'::public.app_role then raise exception 'Action réservée au médecin'; end if;
 select id into v_directory_id from public.care_team_directory where facility_id=public.current_facility_id() and user_id=auth.uid() and member_type='doctor' and active=true limit 1; if v_directory_id is null then raise exception 'Médecin non rattaché à l’annuaire'; end if;
 if p_ends_at<=p_starts_at then raise exception 'Dates invalides'; end if;
 insert into public.doctor_absences(facility_id,doctor_id,starts_at,ends_at,reason,replacement_doctor_id,created_by) values(public.current_facility_id(),v_directory_id,p_starts_at,p_ends_at,nullif(trim(p_reason),''),p_replacement_doctor_id,auth.uid()) returning id into v_id;
 perform public.write_audit('doctor_absence_published','doctor_absence',v_id,jsonb_build_object('starts_at',p_starts_at,'ends_at',p_ends_at)); return v_id; end $$;
revoke all on function public.publish_doctor_absence(timestamptz,timestamptz,text,uuid) from public,anon; grant execute on function public.publish_doctor_absence(timestamptz,timestamptz,text,uuid) to authenticated;

do $$ declare v_fac uuid; v_thomas uuid; v_amine uuid; v_sophie uuid; v_claire uuid; v_sarah uuid; v_camille uuid; v_ines uuid; v_lucas uuid; v_nadia uuid; begin
 select id into v_fac from public.facilities where name='AURA Demo Clinic' limit 1; if v_fac is null then return; end if;
 select id into v_camille from public.profiles where email='camille.durand@aura-demo.test'; select id into v_ines from public.profiles where full_name='Inès Dubois'; select id into v_lucas from public.profiles where full_name='Lucas Moreau'; select id into v_nadia from public.profiles where full_name='Nadia Diallo';
 insert into public.care_team_directory(facility_id,user_id,full_name,member_type,specialty,email) select v_fac,p.id,'Dr Thomas Leroy','doctor','Psychiatrie',p.email from public.profiles p where p.email='thomas.leroy@aura-demo.test' on conflict(facility_id,full_name,member_type) do update set user_id=excluded.user_id,specialty=excluded.specialty,email=excluded.email,active=true;
 insert into public.care_team_directory(facility_id,full_name,member_type,specialty,email) values(v_fac,'Dr Amine Bensaïd','doctor','Psychiatrie','amine.bensaid@aura-demo.test'),(v_fac,'Dr Sophie Martin','doctor','Psychiatrie','sophie.martin@aura-demo.test') on conflict(facility_id,full_name,member_type) do update set specialty=excluded.specialty,email=excluded.email,active=true;
 insert into public.care_team_directory(facility_id,user_id,full_name,member_type,specialty,email) select v_fac,p.id,'Claire Petit','psychologist','Psychologue clinicienne',p.email from public.profiles p where p.email='claire.petit@aura-demo.test' on conflict(facility_id,full_name,member_type) do update set user_id=excluded.user_id,specialty=excluded.specialty,email=excluded.email,active=true;
 insert into public.care_team_directory(facility_id,user_id,full_name,member_type,specialty,email) select v_fac,p.id,'Sarah Fontaine','facilitator','Infirmière référente ateliers bien-être',p.email from public.profiles p where p.email='sarah.fontaine@aura-demo.test' on conflict(facility_id,full_name,member_type) do update set user_id=excluded.user_id,specialty=excluded.specialty,email=excluded.email,active=true;
 insert into public.care_team_directory(facility_id,full_name,member_type,specialty,email) values(v_fac,'Maya Laurent','facilitator','Art-thérapeute','maya.laurent@aura-demo.test'),(v_fac,'Julien Morel','facilitator','Éducateur sportif adapté','julien.morel@aura-demo.test'),(v_fac,'Nora Haddad','facilitator','Médiatrice animale','nora.haddad@aura-demo.test') on conflict(facility_id,full_name,member_type) do update set specialty=excluded.specialty,email=excluded.email,active=true;
 select id into v_thomas from public.care_team_directory where facility_id=v_fac and full_name='Dr Thomas Leroy' and member_type='doctor'; select id into v_amine from public.care_team_directory where facility_id=v_fac and full_name='Dr Amine Bensaïd' and member_type='doctor'; select id into v_sophie from public.care_team_directory where facility_id=v_fac and full_name='Dr Sophie Martin' and member_type='doctor'; select id into v_claire from public.care_team_directory where facility_id=v_fac and full_name='Claire Petit' and member_type='psychologist'; select id into v_sarah from public.care_team_directory where facility_id=v_fac and full_name='Sarah Fontaine' and member_type='facilitator';
 insert into public.clinic_patient_roster(facility_id,linked_profile_id,display_name,floor_number,room_number,reference_doctor_id) select v_fac,p.id,p.full_name,coalesce(w.floor_number,0),s.room_number,case p.id when v_camille then v_thomas when v_ines then v_sophie when v_lucas then v_amine else v_thomas end from public.profiles p join public.patient_stays s on s.patient_id=p.id and s.ended_at is null left join public.wards w on w.id=s.ward_id where p.id in(v_camille,v_ines,v_lucas,v_nadia) on conflict(facility_id,linked_profile_id) do update set display_name=excluded.display_name,floor_number=excluded.floor_number,room_number=excluded.room_number,reference_doctor_id=excluded.reference_doctor_id,active=true;
 insert into public.clinic_patient_roster(facility_id,display_name,floor_number,room_number,reference_doctor_id) select v_fac,'Patient démo '||lpad(gs::text,3,'0'),((gs-1)%4)::smallint,(((gs-1)%4)*100+10+gs)::text,case(gs%3) when 0 then v_thomas when 1 then v_amine else v_sophie end from generate_series(5,90) gs where not exists(select 1 from public.clinic_patient_roster r where r.facility_id=v_fac and r.display_name='Patient démo '||lpad(gs::text,3,'0'));
 delete from public.activity_facilitators where facility_id=v_fac;
 insert into public.activity_facilitators(facility_id,activity_id,clinician_id,is_primary) select v_fac,a.id,case when lower(a.title) like '%art%' or lower(a.title) like '%relax%' or lower(a.title) like '%ciné%' then v_claire when lower(a.title) like '%marche%' or lower(a.title) like '%réveil%' or lower(a.title) like '%boxe%' then v_sarah when lower(a.title) like '%animal%' then(select id from public.care_team_directory where facility_id=v_fac and full_name='Nora Haddad' limit 1) when lower(a.title) like '%équith%' then(select id from public.care_team_directory where facility_id=v_fac and full_name='Julien Morel' limit 1) else(select id from public.care_team_directory where facility_id=v_fac and full_name='Maya Laurent' limit 1) end,true from public.activities a where a.facility_id=v_fac;
 if not exists(select 1 from public.doctor_absences where facility_id=v_fac and doctor_id=v_thomas and starts_at::date=(current_date+10)) then insert into public.doctor_absences(facility_id,doctor_id,starts_at,ends_at,reason,replacement_doctor_id,created_by) values(v_fac,v_thomas,(current_date+10)::timestamptz+interval '8 hours',(current_date+14)::timestamptz+interval '18 hours','Congés planifiés',v_amine,(select user_id from public.care_team_directory where id=v_thomas)); end if;
 if not exists(select 1 from public.activity_updates u join public.activities a on a.id=u.activity_id where u.facility_id=v_fac and u.message like 'Démo •%') then insert into public.activity_updates(facility_id,activity_id,author_user_id,update_type,message) select v_fac,a.id,(select user_id from public.care_team_directory where id=v_claire),'change','Démo • horaire ajusté : merci de vous présenter 10 minutes avant le début.' from public.activities a where a.facility_id=v_fac and lower(a.title) like '%art%' order by a.starts_at limit 1; end if;
 if not exists(select 1 from public.bulletin_requests where facility_id=v_fac and patient_id=v_ines and status='pending') then insert into public.bulletin_requests(facility_id,patient_id,email_to) select v_fac,v_ines,coalesce(pc.personal_email,p.email) from public.profiles p left join public.patient_contact_cards pc on pc.patient_id=p.id and pc.facility_id=v_fac where p.id=v_ines; end if;
end $$;

alter table public.doctor_rounds add column if not exists starts_at timestamptz generated always as (scheduled_at) stored;
