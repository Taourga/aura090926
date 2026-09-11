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

### Module hôtellerie V1.2

- Gouvernance : occupation des 100 chambres, premières entrées et sorties définitives prévues, affectations, progression et historique du ménage, repas prévus à 8 h, 12 h et 19 h (Europe/Paris).
- Personnel technique : uniquement les tâches de ses zones, avec validation horodatée par le serveur et identité de l’agent conservée.
- Deux agents par étage (RDC et étages 1 à 3), un par ascenseur (trois ascenseurs). Les postes d’ascenseur peuvent être cumulés avec un étage. Les toilettes de l’étage sont à la charge de son binôme.
- Chambres 001–010, 101–130, 201–230, 301–330 : ménage quotidien. Le jour du retour d’une permission autorisée d’au moins 24 h, le ménage est dispensé, sauf entrée ou sortie définitive ce jour-là. Les dates réelles priment lorsqu’elles sont renseignées.
- Ascenseurs et toilettes : matin, midi et soir. Les passages de midi et du soir peuvent être pointés à partir de 12 h et 18 h. Les pointages passés ne sont pas modifiables.
- L’accueil gère les premières entrées dans **Entrées & sorties** ; l’infirmier y prévoit les sorties définitives et confirme la clôture réelle du séjour.
- Les affectations sont reconduites jusqu’à leur prochaine modification. Les tâches du jour sont créées à la première consultation ; l’historique conserve les journées et pointages enregistrés, sans inventer des interventions passées.
- « Disponible » signifie sans séjour en cours : vérifier la propreté avant une admission. Une permission temporaire ne libère pas la chambre. Les repas sont des prévisions de présence, sans prise en compte des régimes alimentaires.

Appliquer séparément `20260911_v12_01_technical_role.sql`, puis `20260911_v12_02_housekeeping.sql` (la première transaction doit être validée avant d’utiliser la nouvelle valeur d’enum).

Pour recréer la démonstration sur une autre base, le script `scripts/seed-housekeeping-demo.mjs` crée dix agents fictifs et une gouvernante. Il utilise `SUPABASE_SERVICE_ROLE_KEY` fournie dans l’environnement du terminal, jamais dans le navigateur ni dans Git. Exécuter `node --env-file=.env.local scripts/seed-housekeeping-demo.mjs`. Les mots de passe individuels sont écrits dans `demo-accounts.local.json`, exclu de Git. Les comptes existants et les affectations existantes sont préservés. Aucun e-mail n’est envoyé.

Validation du module dans une base PostgreSQL éphémère : `npm install --prefix .qa-runtime --no-save --package-lock=false @electric-sql/pglite`, puis `node scripts/test-housekeeping.mjs`. Le test ne se connecte pas à Supabase.

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
