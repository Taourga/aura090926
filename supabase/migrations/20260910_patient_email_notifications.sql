-- Coordonnées e-mail utilisées uniquement pour les notifications génériques AURA.
alter table public.profiles add column if not exists email text;

update public.profiles profile
set email = users.email
from auth.users users
where users.id = profile.id
  and profile.email is distinct from users.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

create or replace function public.notification_recipients(p_patient_id uuid default null)
returns table(full_name text, email text)
language sql stable security definer set search_path = public as $$
  select p.full_name, p.email
  from public.profiles p
  where p.role = 'patient'::public.app_role
    and p.active = true
    and p.email is not null
    and (p_patient_id is null or p.id = p_patient_id)
    and public.current_role() in (
      'doctor'::public.app_role,
      'manager'::public.app_role,
      'psychologist'::public.app_role,
      'provider'::public.app_role,
      'governance'::public.app_role,
      'coach'::public.app_role,
      'admin'::public.app_role
    )
$$;

grant execute on function public.notification_recipients(uuid) to authenticated;
