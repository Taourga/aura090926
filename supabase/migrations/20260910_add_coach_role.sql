-- À exécuter avant la migration du planning de la salle de sport.
-- Cette instruction est isolée car PostgreSQL exige la validation de la nouvelle valeur d'énumération avant son utilisation.
alter type public.app_role add value if not exists 'coach';
