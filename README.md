# AURA

Portail de séjour pour les patients et les équipes d'une clinique. Le projet fournit une application Next.js prête pour Vercel et un schéma Supabase avec authentification, règles d'accès par rôle, journalisation et flux de permissions à double validation.

## Ce que couvre la V1.1

- Connexion par e-mail et mot de passe via Supabase Auth.
- Espaces pour patient, médecin, cadre, accueil, psychologue, infirmier, gouvernance, intervenant et administrateur.
- Demande de permission de sortie avec accord obligatoire du médecin **et** du cadre.
- Enregistrement horodaté du départ et du retour par l'accueil.
- Planning de rendez-vous, activités avec capacité et inscription, menus et informations de séjour.
- Validation de présence/absence par l'intervenant ayant créé le rendez-vous et par les rôles habilités pour les activités.
- Demandes de permission bloquées lorsque le départ est à moins de 48 heures.
- Déclaration de visite par le patient (deux visiteurs maximum, une heure, entre 13 h et 17 h) et contrôle horodaté des entrées/départs par l'accueil.
- Repères pratiques de séjour : repas, jardin, patio, ascenseurs et rappels de prise de médicaments.
- Administration des rôles et de l'activation des comptes.
- RLS Supabase et journal d'audit des actions sensibles.

## Démarrage local

1. Installer Node.js 20 ou plus récent, puis installer les dépendances :

   ```bash
   npm install
   ```

2. Créer un projet Supabase, puis copier `.env.example` dans `.env.local` et renseigner les deux valeurs du tableau **Connect** de Supabase. Ne jamais utiliser la clé `service_role` dans ce fichier.

3. Dans Supabase, ouvrir **SQL Editor** et exécuter d'abord `supabase/schema.sql`, puis les fichiers de `supabase/migrations/` dans l'ordre chronologique. Exécuter enfin `supabase/seed.sql` si vous souhaitez les activités et menus de démonstration.

4. Dans **Authentication > Providers**, activer l'authentification par e-mail. Créer les comptes de test dans **Authentication > Users** : le trigger crée automatiquement leur profil avec le rôle `patient`.

5. Promouvoir le premier administrateur dans l'éditeur SQL après avoir remplacé l'UUID :

   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'UUID_DU_PREMIER_ADMIN';
   ```

   Les autres rôles se gèrent ensuite dans l'écran Administration de l'application.

6. Créer un séjour actif pour chaque patient de test avant de tester les permissions :

   ```sql
   insert into public.patient_stays (patient_id, ward_id, room_number)
   values ('UUID_DU_PATIENT', (select id from public.wards limit 1), '101');
   ```

7. Lancer le site :

   ```bash
   npm run dev
   ```

## Déploiement GitHub et Vercel

1. Créer un dépôt GitHub et y pousser ce dossier, sans ajouter `.env.local`.
2. Dans Vercel, utiliser **Add New Project**, importer le dépôt puis renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dans les variables d'environnement.
3. Déployer. Aucune clé secrète côté serveur n'est requise dans cette version.
4. Dans Supabase Auth, ajouter l'URL Vercel dans **URL Configuration** si vous activez ensuite les connexions par lien ou la réinitialisation de mot de passe.

## Important pour une clinique réelle

Cette version est une base technique et fonctionnelle de démonstration. N'utilisez pas de données patient réelles sur un environnement gratuit ou avant validation par la direction, le DPO, la DSI et les référents sécurité de l'établissement. En France, l'hébergement de données de santé et les obligations contractuelles doivent être qualifiés avant toute mise en production. Le plan Vercel Hobby est réservé à un usage personnel et non commercial : il ne convient donc pas à l'exploitation d'une clinique.

Avant un lancement réel, prévoir au minimum : hébergement et sous-traitance adaptés, analyse d'impact, matrice d'habilitations par unité, gestion des comptes professionnels, sauvegarde, supervision, plan de reprise et recette de sécurité.
