-- Exécuter et valider cette migration avant v12_02 (nouvelle valeur d'enum).
alter type public.app_role add value if not exists 'technical';
