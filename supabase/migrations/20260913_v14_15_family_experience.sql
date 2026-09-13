-- AURA Demo v14.15 — Family / trusted-contact experience
-- Applied to Supabase on 2026-09-13. Additive and backward compatible.

alter table public.trusted_contacts
  add column if not exists is_emergency_contact boolean not null default false,
  add column if not exists preferred_contact_method text not null default 'email',
  add column if not exists preferred_language text not null default 'fr',
  add column if not exists notification_preferences jsonb not null default '{"presence":false,"planning":true,"permissions":true,"visits":true,"discharge":true}'::jsonb,
  add column if not exists access_expires_at timestamptz;

alter table public.trusted_contacts drop constraint if exists trusted_contacts_preferred_contact_method_check;
alter table public.trusted_contacts add constraint trusted_contacts_preferred_contact_method_check check (preferred_contact_method in ('email','sms','none'));

create or replace function public.update_trusted_contact_preferences(
  p_patient_id uuid,
  p_notification_preferences jsonb,
  p_access_expires_at timestamptz default null,
  p_is_emergency_contact boolean default false,
  p_preferred_contact_method text default 'email'
) returns void
language plpgsql security definer set search_path=public as $$
declare
  v_facility uuid := public.current_facility_id();
  v_role public.app_role := public.current_role();
  v_contact public.trusted_contacts%rowtype;
  v_allowed boolean;
  v_prefs jsonb;
begin
  v_allowed := (v_role='patient'::public.app_role and p_patient_id=auth.uid())
    or v_role in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'admin'::public.app_role);
  if not coalesce(v_allowed,false) then raise exception 'Action non autorisée'; end if;
  if p_preferred_contact_method not in ('email','sms','none') then raise exception 'Canal de contact invalide'; end if;

  select * into v_contact from public.trusted_contacts tc
  where tc.facility_id=v_facility and tc.patient_id=p_patient_id
  order by tc.created_at limit 1;
  if not found then raise exception 'Aucune personne de confiance renseignée'; end if;

  v_prefs := jsonb_build_object(
    'presence', coalesce((p_notification_preferences->>'presence')::boolean,false),
    'planning', coalesce((p_notification_preferences->>'planning')::boolean,false),
    'permissions', coalesce((p_notification_preferences->>'permissions')::boolean,false),
    'visits', coalesce((p_notification_preferences->>'visits')::boolean,false),
    'discharge', coalesce((p_notification_preferences->>'discharge')::boolean,false)
  );

  update public.trusted_contacts
  set notification_preferences=v_prefs,
      access_expires_at=p_access_expires_at,
      is_emergency_contact=p_is_emergency_contact,
      preferred_contact_method=p_preferred_contact_method,
      updated_at=now()
  where id=v_contact.id;

  perform public.write_audit('trusted_contact_preferences_updated','trusted_contact',v_contact.id,
    jsonb_build_object('patient_id',p_patient_id,'notification_preferences',v_prefs,'access_expires_at',p_access_expires_at,'is_emergency_contact',p_is_emergency_contact,'preferred_contact_method',p_preferred_contact_method));
end $$;

revoke all on function public.update_trusted_contact_preferences(uuid,jsonb,timestamptz,boolean,text) from public, anon;
grant execute on function public.update_trusted_contact_preferences(uuid,jsonb,timestamptz,boolean,text) to authenticated;

create or replace function public.trusted_contact_payload(p_patient_id uuid, p_require_active boolean default true)
returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare
  v_facility uuid := public.current_facility_id();
  v_relation public.trusted_contacts%rowtype;
  v_stay jsonb;
  v_permissions jsonb := '[]'::jsonb;
  v_appointments jsonb := '[]'::jsonb;
  v_activities jsonb := '[]'::jsonb;
  v_visits jsonb := '[]'::jsonb;
  v_menus jsonb := '[]'::jsonb;
  v_information jsonb := '[]'::jsonb;
  v_journal jsonb := '[]'::jsonb;
begin
  select * into v_relation from public.trusted_contacts
  where facility_id=v_facility and patient_id=p_patient_id
  order by created_at limit 1;
  if not found then raise exception 'Aucune personne de confiance renseignée'; end if;

  if p_require_active and not (
    v_relation.portal_enabled=true and v_relation.consented_at is not null and v_relation.revoked_at is null
    and (v_relation.access_expires_at is null or v_relation.access_expires_at > now())
  ) then raise exception 'Aucun accès proche actif'; end if;

  if coalesce((v_relation.scopes->>'presence')::boolean,false) or coalesce((v_relation.scopes->>'discharge')::boolean,false) then
    select jsonb_build_object(
      'room_number',s.room_number,
      'presence',case when coalesce((v_relation.scopes->>'presence')::boolean,false) then s.presence else null end,
      'started_at',s.started_at,
      'planned_discharge_at',case when coalesce((v_relation.scopes->>'discharge')::boolean,false) then s.planned_discharge_at else null end
    ) into v_stay
    from public.patient_stays s
    where s.facility_id=v_facility and s.patient_id=p_patient_id and s.ended_at is null
    order by s.started_at desc limit 1;
  end if;

  if coalesce((v_relation.scopes->>'permissions')::boolean,false) then
    select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'departure_at',p.departure_at,'return_at',p.return_at,'status',p.status) order by p.departure_at desc),'[]'::jsonb)
    into v_permissions from public.permission_requests p
    where p.facility_id=v_facility and p.patient_id=p_patient_id and p.departure_at>=now()-interval '7 days';
  end if;

  if coalesce((v_relation.scopes->>'planning')::boolean,false) then
    select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'starts_at',a.starts_at,'ends_at',a.ends_at,'location',a.location) order by a.starts_at),'[]'::jsonb)
    into v_appointments from public.appointments a
    where a.facility_id=v_facility and a.patient_id=p_patient_id and a.ends_at>=now()-interval '1 day' and a.starts_at<=now()+interval '14 days';
  end if;

  if coalesce((v_relation.scopes->>'activities')::boolean,false) then
    select coalesce(jsonb_agg(jsonb_build_object('title',a.title,'starts_at',a.starts_at,'ends_at',a.ends_at,'location',a.location,'attendance_status',e.attendance_status) order by a.starts_at),'[]'::jsonb)
    into v_activities
    from public.activity_enrollments e join public.activities a on a.id=e.activity_id and a.facility_id=v_facility
    where e.facility_id=v_facility and e.patient_id=p_patient_id and a.ends_at>=now()-interval '1 day' and a.starts_at<=now()+interval '14 days';
  end if;

  if coalesce((v_relation.scopes->>'visits')::boolean,false) then
    select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'scheduled_start',v.scheduled_start,'scheduled_end',v.scheduled_end,'visitor_one_name',v.visitor_one_name,'visitor_two_name',v.visitor_two_name,'status',v.status) order by v.scheduled_start desc),'[]'::jsonb)
    into v_visits from public.visit_notifications v
    where v.facility_id=v_facility and v.patient_id=p_patient_id and v.scheduled_end>=now()-interval '7 days';
  end if;

  if coalesce((v_relation.scopes->>'menus')::boolean,false) then
    select coalesce(jsonb_agg(jsonb_build_object('service_date',m.service_date,'meal',m.meal,'description',m.description) order by m.service_date,m.meal),'[]'::jsonb)
    into v_menus from public.menu_items m where m.facility_id=v_facility and m.service_date between current_date and current_date+3;
  end if;

  if coalesce((v_relation.scopes->>'information')::boolean,false) then
    select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'body',i.body,'starts_at',i.starts_at,'ends_at',i.ends_at) order by i.created_at desc),'[]'::jsonb)
    into v_information from public.information_posts i
    where i.facility_id=v_facility and i.published=true and (i.starts_at is null or i.starts_at<=now()) and (i.ends_at is null or i.ends_at>=now());
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('occurred_at',x.occurred_at,'kind',x.kind,'title',x.title,'detail',x.detail) order by x.occurred_at desc),'[]'::jsonb)
  into v_journal from (
    select p.created_at occurred_at,'permission'::text kind,'Permission enregistrée'::text title,('Sortie prévue le '||to_char(p.departure_at at time zone 'Europe/Paris','DD/MM à HH24:MI'))::text detail
      from public.permission_requests p where coalesce((v_relation.scopes->>'permissions')::boolean,false) and p.facility_id=v_facility and p.patient_id=p_patient_id and p.created_at>=now()-interval '14 days'
    union all
    select a.created_at,'planning','Rendez-vous ajouté',a.title from public.appointments a where coalesce((v_relation.scopes->>'planning')::boolean,false) and a.facility_id=v_facility and a.patient_id=p_patient_id and a.created_at>=now()-interval '14 days'
    union all
    select v.created_at,'visit','Visite enregistrée',coalesce(v.visitor_one_name,'Visiteur') from public.visit_notifications v where coalesce((v_relation.scopes->>'visits')::boolean,false) and v.facility_id=v_facility and v.patient_id=p_patient_id and v.created_at>=now()-interval '14 days'
    union all
    select s.updated_at,'discharge','Sortie définitive planifiée',to_char(s.planned_discharge_at at time zone 'Europe/Paris','DD/MM/YYYY à HH24:MI') from public.patient_stays s where coalesce((v_relation.scopes->>'discharge')::boolean,false) and s.facility_id=v_facility and s.patient_id=p_patient_id and s.ended_at is null and s.planned_discharge_at is not null
  ) x;

  return jsonb_build_object(
    'patient',(select jsonb_build_object('id',p.id,'full_name',p.full_name) from public.profiles p where p.id=p_patient_id),
    'trusted_contact',jsonb_build_object('full_name',v_relation.full_name,'relationship',v_relation.relationship,'consented_at',v_relation.consented_at,'is_emergency_contact',v_relation.is_emergency_contact,'preferred_contact_method',v_relation.preferred_contact_method,'notification_preferences',v_relation.notification_preferences,'access_expires_at',v_relation.access_expires_at),
    'scopes',v_relation.scopes,
    'stay',coalesce(v_stay,'null'::jsonb),
    'permissions',v_permissions,
    'appointments',v_appointments,
    'activities',v_activities,
    'visits',v_visits,
    'menus',v_menus,
    'information',v_information,
    'journal',v_journal
  );
end $$;

revoke all on function public.trusted_contact_payload(uuid,boolean) from public, anon, authenticated;

create or replace function public.trusted_contact_portal() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_patient uuid;
begin
  if public.current_role()<>'trusted_contact'::public.app_role then raise exception 'Accès réservé aux proches autorisés'; end if;
  select patient_id into v_patient from public.trusted_contacts where facility_id=public.current_facility_id() and user_id=auth.uid() order by created_at limit 1;
  if v_patient is null then raise exception 'Aucun accès proche actif'; end if;
  return public.trusted_contact_payload(v_patient,true);
end $$;

revoke all on function public.trusted_contact_portal() from public, anon;
grant execute on function public.trusted_contact_portal() to authenticated;

create or replace function public.preview_trusted_contact_portal(p_patient_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_role public.app_role:=public.current_role();
begin
  if not ((v_role='patient'::public.app_role and p_patient_id=auth.uid()) or v_role in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'admin'::public.app_role)) then raise exception 'Aperçu non autorisé'; end if;
  return public.trusted_contact_payload(p_patient_id,false);
end $$;

revoke all on function public.preview_trusted_contact_portal(uuid) from public, anon;
grant execute on function public.preview_trusted_contact_portal(uuid) to authenticated;
