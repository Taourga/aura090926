-- AURA V1.4 / LOT 3C — Configuration validation + temporary compatibility for old production UI
-- The two legacy unique indexes must be removed when the Pilot Ready app is promoted,
-- before onboarding a second real facility with overlapping menu/sport dates.

create or replace function public.update_current_facility_settings(p_settings jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 fid uuid:=public.current_facility_id();
 k text; v jsonb; visit_start time; visit_end time;
 allowed text[]:=array[
  'permissions.min_notice_hours','visits.start_time','visits.end_time','visits.max_duration_minutes','visits.max_visitors','visits.max_per_day',
  'meals.breakfast_time','meals.lunch_time','meals.dinner_time','features.permissions','features.activities','features.housekeeping','features.sport','features.visits','features.messaging','features.menus','features.information',
  'notifications.sms','patient.otp_enabled','localization.arabic_enabled','localization.rtl_enabled','integrations.fhir_enabled','integrations.csv_enabled'];
begin
 if fid is null or not public.is_facility_admin(fid) then raise exception 'Action réservée à l administrateur de la clinique'; end if;
 if p_settings is null or jsonb_typeof(p_settings)<>'object' then raise exception 'Configuration invalide'; end if;
 for k,v in select * from jsonb_each(p_settings) loop
   if not(k=any(allowed)) then raise exception 'Paramètre non autorisé: %',k; end if;
   if k like 'features.%' or k in ('notifications.sms','patient.otp_enabled','localization.arabic_enabled','localization.rtl_enabled','integrations.fhir_enabled','integrations.csv_enabled') then
     if jsonb_typeof(v)<>'boolean' then raise exception 'Le paramètre % doit être booléen',k; end if;
   end if;
 end loop;
 if p_settings?'permissions.min_notice_hours' and ((p_settings->>'permissions.min_notice_hours')::int not between 0 and 168) then raise exception 'Préavis invalide'; end if;
 if p_settings?'visits.max_duration_minutes' and ((p_settings->>'visits.max_duration_minutes')::int not between 15 and 240) then raise exception 'Durée de visite invalide'; end if;
 if p_settings?'visits.max_visitors' and ((p_settings->>'visits.max_visitors')::int not between 1 and 2) then raise exception 'Nombre de visiteurs invalide'; end if;
 if p_settings?'visits.max_per_day' and ((p_settings->>'visits.max_per_day')::int not between 1 and 4) then raise exception 'Nombre de visites invalide'; end if;
 if p_settings?'visits.start_time' and (p_settings->>'visits.start_time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Heure de début des visites invalide'; end if;
 if p_settings?'visits.end_time' and (p_settings->>'visits.end_time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Heure de fin des visites invalide'; end if;
 if p_settings?'meals.breakfast_time' and (p_settings->>'meals.breakfast_time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Horaire petit-déjeuner invalide'; end if;
 if p_settings?'meals.lunch_time' and (p_settings->>'meals.lunch_time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Horaire déjeuner invalide'; end if;
 if p_settings?'meals.dinner_time' and (p_settings->>'meals.dinner_time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Horaire dîner invalide'; end if;
 visit_start:=coalesce(p_settings->>'visits.start_time',public.current_facility_setting_text('visits.start_time','13:00'))::time;
 visit_end:=coalesce(p_settings->>'visits.end_time',public.current_facility_setting_text('visits.end_time','17:00'))::time;
 if visit_end<=visit_start then raise exception 'La fin des visites doit être postérieure au début'; end if;
 update public.facilities set config=coalesce(config,'{}'::jsonb)||p_settings,updated_at=now() where id=fid;
 perform public.write_audit('facility_settings_updated','facility',fid,p_settings);
 return public.facility_effective_config(fid);
end $$;

-- Compatibility while master still points to the legacy single-facility UI.
create unique index if not exists menu_items_legacy_service_date_meal_key on public.menu_items(service_date,meal);
create unique index if not exists sport_room_schedules_legacy_schedule_date_key on public.sport_room_schedules(schedule_date);

create or replace function public.sync_legacy_profile_access_to_membership()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.active_facility_id is not null and (new.role is distinct from old.role or new.active is distinct from old.active) then
   update public.facility_memberships
   set role=new.role,active=new.active,updated_at=now()
   where facility_id=new.active_facility_id and user_id=new.id;
 end if;
 return new;
end $$;

drop trigger if exists sync_legacy_profile_access_to_membership on public.profiles;
create trigger sync_legacy_profile_access_to_membership
after update of role,active on public.profiles
for each row execute function public.sync_legacy_profile_access_to_membership();
