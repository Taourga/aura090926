-- AURA V1.4 / LOT 3A — Country packs, facility configuration and onboarding

create table if not exists public.country_packs (
  code text primary key,
  label text not null,
  country_code text not null,
  timezone text not null,
  default_locale text not null,
  currency_code text not null,
  default_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.country_packs enable row level security;
drop policy if exists "country_packs_read" on public.country_packs;
create policy "country_packs_read" on public.country_packs for select to authenticated using (active=true);

insert into public.country_packs(code,label,country_code,timezone,default_locale,currency_code,default_config) values
('AURA_CORE','AURA Core','FR','Europe/Paris','fr-FR','EUR',jsonb_build_object(
  'permissions.min_notice_hours',48,
  'visits.start_time','13:00','visits.end_time','17:00','visits.max_duration_minutes',60,'visits.max_visitors',2,'visits.max_per_day',1,
  'meals.breakfast_time','08:00','meals.lunch_time','12:00','meals.dinner_time','19:00',
  'features.permissions',true,'features.activities',true,'features.housekeeping',true,'features.sport',true,'features.visits',true,'features.messaging',true,'features.menus',true,'features.information',true,
  'notifications.sms',false,'patient.otp_enabled',false,'localization.arabic_enabled',false,'localization.rtl_enabled',false,
  'integrations.fhir_enabled',false,'integrations.csv_enabled',true
)),
('AURA_FR','AURA France','FR','Europe/Paris','fr-FR','EUR',jsonb_build_object(
  'permissions.min_notice_hours',48,
  'visits.start_time','13:00','visits.end_time','17:00','visits.max_duration_minutes',60,'visits.max_visitors',2,'visits.max_per_day',1,
  'meals.breakfast_time','08:00','meals.lunch_time','12:00','meals.dinner_time','19:00',
  'features.permissions',true,'features.activities',true,'features.housekeeping',false,'features.sport',false,'features.visits',true,'features.messaging',true,'features.menus',true,'features.information',true,
  'notifications.sms',false,'patient.otp_enabled',false,'localization.arabic_enabled',false,'localization.rtl_enabled',false,
  'integrations.fhir_enabled',true,'integrations.csv_enabled',true,'compliance.rgpd',true,'compliance.hds_required',true
)),
('AURA_DZ','AURA Algérie','DZ','Africa/Algiers','fr-DZ','DZD',jsonb_build_object(
  'permissions.min_notice_hours',24,
  'visits.start_time','14:00','visits.end_time','18:00','visits.max_duration_minutes',60,'visits.max_visitors',2,'visits.max_per_day',1,
  'meals.breakfast_time','08:00','meals.lunch_time','12:30','meals.dinner_time','19:30',
  'features.permissions',true,'features.activities',true,'features.housekeeping',true,'features.sport',false,'features.visits',true,'features.messaging',true,'features.menus',true,'features.information',true,
  'notifications.sms',true,'patient.otp_enabled',true,'localization.arabic_enabled',true,'localization.rtl_enabled',true,
  'integrations.fhir_enabled',false,'integrations.csv_enabled',true,'compliance.anpdp',true,'compliance.local_hosting_review',true
))
on conflict(code) do update set label=excluded.label,country_code=excluded.country_code,timezone=excluded.timezone,default_locale=excluded.default_locale,currency_code=excluded.currency_code,default_config=excluded.default_config,active=true,updated_at=now();

alter table public.facilities add column if not exists country_pack_code text references public.country_packs(code) on delete restrict;
update public.facilities set country_pack_code='AURA_CORE' where country_pack_code is null;
alter table public.facilities alter column country_pack_code set default 'AURA_CORE';
alter table public.facilities alter column country_pack_code set not null;

create or replace function public.facility_effective_config(p_facility_id uuid default null)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(cp.default_config,'{}'::jsonb)||coalesce(f.config,'{}'::jsonb)
 from public.facilities f join public.country_packs cp on cp.code=f.country_pack_code
 where f.id=coalesce(p_facility_id,public.current_facility_id())
 and (p_facility_id is null or public.has_facility_access(f.id))
$$;
create or replace function public.current_facility_setting_text(p_key text,p_default text default null)
returns text language sql stable security definer set search_path=public as $$ select coalesce(public.facility_effective_config()->>p_key,p_default) $$;
create or replace function public.current_facility_setting_int(p_key text,p_default integer default null)
returns integer language sql stable security definer set search_path=public as $$ select coalesce(nullif(public.facility_effective_config()->>p_key,'')::integer,p_default) $$;
create or replace function public.current_facility_setting_bool(p_key text,p_default boolean default false)
returns boolean language sql stable security definer set search_path=public as $$ select coalesce(nullif(public.facility_effective_config()->>p_key,'')::boolean,p_default) $$;
create or replace function public.facility_feature_enabled(p_feature text)
returns boolean language sql stable security definer set search_path=public as $$ select public.current_facility_setting_bool('features.'||p_feature,true) $$;

create or replace function public.get_my_facilities()
returns table(facility_id uuid,organization_id uuid,facility_name text,country_pack_code text,country_code text,timezone text,default_locale text,currency_code text,role public.app_role,is_primary boolean,is_active boolean)
language sql stable security definer set search_path=public as $$
 select f.id,f.organization_id,f.name,f.country_pack_code,f.country_code,f.timezone,f.default_locale,f.currency_code,fm.role,fm.is_primary,(f.id=public.current_facility_id())
 from public.facility_memberships fm join public.facilities f on f.id=fm.facility_id
 where fm.user_id=auth.uid() and fm.active=true and f.active=true
 order by (f.id=public.current_facility_id()) desc,fm.is_primary desc,f.name
$$;

create or replace function public.update_current_facility_settings(p_settings jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare fid uuid:=public.current_facility_id(); k text; v jsonb; allowed text[]:=array[
'permissions.min_notice_hours','visits.start_time','visits.end_time','visits.max_duration_minutes','visits.max_visitors','visits.max_per_day',
'meals.breakfast_time','meals.lunch_time','meals.dinner_time','features.permissions','features.activities','features.housekeeping','features.sport','features.visits','features.messaging','features.menus','features.information',
'notifications.sms','patient.otp_enabled','localization.arabic_enabled','localization.rtl_enabled','integrations.fhir_enabled','integrations.csv_enabled'];
begin
 if fid is null or not public.is_facility_admin(fid) then raise exception 'Action réservée à l administrateur de la clinique'; end if;
 if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception 'Configuration invalide'; end if;
 for k,v in select * from jsonb_each(p_settings) loop if not(k=any(allowed)) then raise exception 'Paramètre non autorisé: %',k; end if; end loop;
 if p_settings?'permissions.min_notice_hours' and ((p_settings->>'permissions.min_notice_hours')::int not between 0 and 168) then raise exception 'Préavis invalide'; end if;
 if p_settings?'visits.max_duration_minutes' and ((p_settings->>'visits.max_duration_minutes')::int not between 15 and 240) then raise exception 'Durée de visite invalide'; end if;
 if p_settings?'visits.max_visitors' and ((p_settings->>'visits.max_visitors')::int not between 1 and 4) then raise exception 'Nombre de visiteurs invalide'; end if;
 update public.facilities set config=coalesce(config,'{}'::jsonb)||p_settings,updated_at=now() where id=fid;
 perform public.write_audit('facility_settings_updated','facility',fid,p_settings);
 return public.facility_effective_config(fid);
end $$;

create or replace function public.apply_country_pack(p_pack_code text,p_keep_overrides boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare fid uuid:=public.current_facility_id(); cp public.country_packs%rowtype; new_config jsonb;
begin
 if fid is null or not public.is_facility_admin(fid) then raise exception 'Action réservée à l administrateur de la clinique'; end if;
 select * into cp from public.country_packs where code=p_pack_code and active=true;
 if not found then raise exception 'Country Pack inconnu'; end if;
 new_config:=case when p_keep_overrides then coalesce((select config from public.facilities where id=fid),'{}'::jsonb) else '{}'::jsonb end;
 update public.facilities set country_pack_code=cp.code,country_code=cp.country_code,timezone=cp.timezone,default_locale=cp.default_locale,currency_code=cp.currency_code,config=new_config,updated_at=now() where id=fid;
 perform public.write_audit('country_pack_applied','facility',fid,jsonb_build_object('pack',cp.code));
end $$;

create or replace function public.create_facility_for_current_org(p_name text,p_pack_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare current_fid uuid:=public.current_facility_id(); org uuid; cp public.country_packs%rowtype; new_id uuid; new_slug text;
begin
 if current_fid is null or not public.is_facility_admin(current_fid) then raise exception 'Action réservée à l administrateur'; end if;
 if nullif(trim(p_name),'') is null then raise exception 'Nom obligatoire'; end if;
 select organization_id into org from public.facilities where id=current_fid;
 select * into cp from public.country_packs where code=p_pack_code and active=true;
 if not found then raise exception 'Country Pack inconnu'; end if;
 new_slug:=trim(both '-' from regexp_replace(lower(trim(p_name)),'[^a-z0-9]+','-','g'))||'-'||substr(md5(gen_random_uuid()::text),1,6);
 insert into public.facilities(organization_id,name,slug,country_pack_code,country_code,timezone,default_locale,currency_code,config)
 values(org,trim(p_name),new_slug,cp.code,cp.country_code,cp.timezone,cp.default_locale,cp.currency_code,'{}'::jsonb) returning id into new_id;
 insert into public.facility_memberships(facility_id,user_id,role,active,is_primary) values(new_id,auth.uid(),'admin',true,false);
 perform public.write_audit('facility_created','facility',new_id,jsonb_build_object('pack',cp.code,'name',trim(p_name)));
 return new_id;
end $$;

create table if not exists public.facility_invitations(
 id uuid primary key default gen_random_uuid(),
 facility_id uuid not null references public.facilities(id) on delete cascade,
 email text not null,
 role public.app_role not null,
 invited_by uuid not null references public.profiles(id) on delete restrict,
 expires_at timestamptz not null default(now()+interval '7 days'),
 accepted_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index if not exists facility_invitations_pending_idx on public.facility_invitations(facility_id,lower(email)) where accepted_at is null;
alter table public.facility_invitations enable row level security;
drop policy if exists "facility_invitations_admin_read" on public.facility_invitations;
create policy "facility_invitations_admin_read" on public.facility_invitations for select to authenticated using(public.is_facility_admin(facility_id));

create or replace function public.invite_facility_member(p_email text,p_role public.app_role)
returns uuid language plpgsql security definer set search_path=public as $$
declare fid uuid:=public.current_facility_id(); invitation_id uuid; existing_user uuid;
begin
 if fid is null or not public.is_facility_admin(fid) then raise exception 'Action réservée à l administrateur'; end if;
 if nullif(trim(p_email),'') is null or position('@' in p_email)=0 then raise exception 'Email invalide'; end if;
 select id into existing_user from public.profiles where lower(email)=lower(trim(p_email)) limit 1;
 if existing_user is not null then
   insert into public.facility_memberships(facility_id,user_id,role,active,is_primary) values(fid,existing_user,p_role,true,false)
   on conflict(facility_id,user_id) do update set role=excluded.role,active=true,updated_at=now();
   return null;
 end if;
 insert into public.facility_invitations(facility_id,email,role,invited_by) values(fid,lower(trim(p_email)),p_role,auth.uid())
 on conflict(facility_id,(lower(email))) where accepted_at is null do update set role=excluded.role,invited_by=auth.uid(),expires_at=now()+interval '7 days'
 returning id into invitation_id;
 return invitation_id;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare first_facility uuid;
begin
 insert into public.profiles(id,full_name,email)
 values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1)),new.email)
 on conflict(id) do update set email=excluded.email;
 insert into public.facility_memberships(facility_id,user_id,role,active,is_primary)
 select i.facility_id,new.id,i.role,true,false from public.facility_invitations i
 where lower(i.email)=lower(new.email) and i.accepted_at is null and i.expires_at>now()
 on conflict(facility_id,user_id) do update set role=excluded.role,active=true,updated_at=now();
 update public.facility_invitations set accepted_at=now() where lower(email)=lower(new.email) and accepted_at is null and expires_at>now();
 select fm.facility_id into first_facility from public.facility_memberships fm where fm.user_id=new.id and fm.active=true order by fm.is_primary desc,fm.created_at limit 1;
 if first_facility is not null then update public.profiles set active_facility_id=first_facility where id=new.id and active_facility_id is null; end if;
 return new;
end $$;

revoke all on function public.facility_effective_config(uuid) from public,anon;
revoke all on function public.current_facility_setting_text(text,text) from public,anon;
revoke all on function public.current_facility_setting_int(text,integer) from public,anon;
revoke all on function public.current_facility_setting_bool(text,boolean) from public,anon;
revoke all on function public.facility_feature_enabled(text) from public,anon;
revoke all on function public.get_my_facilities() from public,anon;
revoke all on function public.update_current_facility_settings(jsonb) from public,anon;
revoke all on function public.apply_country_pack(text,boolean) from public,anon;
revoke all on function public.create_facility_for_current_org(text,text) from public,anon;
revoke all on function public.invite_facility_member(text,public.app_role) from public,anon;
grant execute on function public.facility_effective_config(uuid) to authenticated;
grant execute on function public.current_facility_setting_text(text,text) to authenticated;
grant execute on function public.current_facility_setting_int(text,integer) to authenticated;
grant execute on function public.current_facility_setting_bool(text,boolean) to authenticated;
grant execute on function public.facility_feature_enabled(text) to authenticated;
grant execute on function public.get_my_facilities() to authenticated;
grant execute on function public.update_current_facility_settings(jsonb) to authenticated;
grant execute on function public.apply_country_pack(text,boolean) to authenticated;
grant execute on function public.create_facility_for_current_org(text,text) to authenticated;
grant execute on function public.invite_facility_member(text,public.app_role) to authenticated;
