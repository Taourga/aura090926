-- Données de démonstration sans données nominatives.
insert into public.wards (name, floor) values
  ('Unité A', '1er étage'), ('Unité B', '2e étage')
on conflict (name) do nothing;

insert into public.activities (title, description, starts_at, ends_at, location, capacity)
select 'Relaxation guidée', 'Temps de respiration et détente encadré.', now() + interval '1 day 15 hours', now() + interval '1 day 16 hours', 'Salle bien-être', 12
where not exists (select 1 from public.activities where title = 'Relaxation guidée' and starts_at > now());

insert into public.activities (title, description, starts_at, ends_at, location, capacity)
select 'Art-thérapie', 'Atelier créatif en petit groupe.', now() + interval '2 days 10 hours', now() + interval '2 days 11 hours 30 minutes', 'Atelier 2', 8
where not exists (select 1 from public.activities where title = 'Art-thérapie' and starts_at > now());

insert into public.menu_items (service_date, meal, description) values
  (current_date + 1, 'lunch', 'Salade de saison, volaille rôtie et légumes, fromage blanc'),
  (current_date + 1, 'dinner', 'Velouté de légumes, gratin de pâtes, compote')
on conflict (service_date, meal) do nothing;
