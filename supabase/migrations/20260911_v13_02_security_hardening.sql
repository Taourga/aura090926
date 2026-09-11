-- Retire l'accès anonyme implicite aux fonctions privilégiées et documente les tables accessibles uniquement par RPC.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon', fn.signature);
  end loop;
end $$;

revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.write_audit(text, text, uuid, jsonb) from authenticated;
do $$ begin
  if to_regprocedure('public.audit(text,text,uuid)') is not null then
    execute 'revoke execute on function public.audit(text,text,uuid) from authenticated';
  end if;
end $$;

drop policy if exists "deny direct housekeeping assignments" on public.housekeeping_assignments;
create policy "deny direct housekeeping assignments" on public.housekeeping_assignments
  as restrictive for all to authenticated using (false) with check (false);
drop policy if exists "deny direct housekeeping rosters" on public.housekeeping_rosters;
create policy "deny direct housekeeping rosters" on public.housekeeping_rosters
  as restrictive for all to authenticated using (false) with check (false);
drop policy if exists "deny direct housekeeping tasks" on public.housekeeping_tasks;
create policy "deny direct housekeeping tasks" on public.housekeeping_tasks
  as restrictive for all to authenticated using (false) with check (false);

drop policy if exists "participants read clinical messages" on public.clinical_messages;
create policy "participants read clinical messages" on public.clinical_messages
  for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
