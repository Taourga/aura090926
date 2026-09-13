create or replace function public.manage_trusted_contact_access(p_patient_id uuid, p_enabled boolean, p_scopes jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_facility uuid := public.current_facility_id();
  v_role public.app_role := public.current_role();
  v_allowed boolean;
  v_scopes jsonb;
  v_contact public.trusted_contacts%rowtype;
begin
  v_allowed := (v_role='patient'::public.app_role and p_patient_id=auth.uid())
    or v_role in ('doctor'::public.app_role,'nurse'::public.app_role,'manager'::public.app_role,'admin'::public.app_role);
  if not coalesce(v_allowed,false) then raise exception 'Action non autorisée'; end if;

  select * into v_contact from public.trusted_contacts tc
  where tc.facility_id=v_facility and tc.patient_id=p_patient_id
  order by tc.created_at limit 1;
  if not found then raise exception 'Aucune personne de confiance renseignée pour ce patient'; end if;
  if p_enabled and v_contact.user_id is null then raise exception 'Créez ou rattachez d’abord un compte proche autorisé'; end if;

  v_scopes := jsonb_build_object(
    'presence', coalesce((p_scopes->>'presence')::boolean,false),
    'planning', coalesce((p_scopes->>'planning')::boolean,false),
    'permissions', coalesce((p_scopes->>'permissions')::boolean,false),
    'activities', coalesce((p_scopes->>'activities')::boolean,false),
    'visits', coalesce((p_scopes->>'visits')::boolean,false),
    'menus', coalesce((p_scopes->>'menus')::boolean,false),
    'information', coalesce((p_scopes->>'information')::boolean,false),
    'discharge', coalesce((p_scopes->>'discharge')::boolean,false)
  );

  update public.trusted_contacts
  set portal_enabled=p_enabled,
      scopes=v_scopes,
      consented_at=case when p_enabled then now() else consented_at end,
      consented_by=case when p_enabled then auth.uid() else consented_by end,
      revoked_at=case when p_enabled then null else now() end,
      updated_at=now()
  where id=v_contact.id;

  perform public.write_audit(
    case when p_enabled then 'trusted_contact_access_enabled' else 'trusted_contact_access_revoked' end,
    'trusted_contact',
    v_contact.id,
    jsonb_build_object('patient_id',p_patient_id,'enabled',p_enabled,'scopes',v_scopes)
  );
end $$;
revoke all on function public.manage_trusted_contact_access(uuid,boolean,jsonb) from public, anon;
grant execute on function public.manage_trusted_contact_access(uuid,boolean,jsonb) to authenticated;
