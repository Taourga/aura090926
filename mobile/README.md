# AURA Patient — MVP mobile

Application mobile patient isolée du site web AURA.

## Périmètre MVP

- Connexion via Supabase Auth
- Accueil patient avec événements à venir
- Planning consolidé sur 7 jours
- Activités avec/sans prescription, inscription et désinscription
- Visites : consultation et déclaration d'un visiteur
- Permissions : demande et suivi des validations
- Profil, établissement, chambre et déconnexion

Le MVP réutilise le projet Supabase AURA existant, ses RPC et ses règles RLS. Aucune migration de base de données n'est nécessaire.

## Lancer localement

```bash
cd mobile
cp .env.example .env
npm install
npm run typecheck
npm start
```

Scannez ensuite le QR code avec Expo Go ou ouvrez un simulateur iOS/Android.

## Architecture et isolation

Le projet mobile possède son propre `package.json` et son propre `tsconfig.json`. Le Next.js web à la racine ignore explicitement `mobile/` pour le lint et le typecheck, afin d'éviter toute régression du site existant.

Branche de développement : `mobile-mvp-20260918`.

## Sécurité

Le client mobile utilise uniquement la clé Supabase **publishable**. Les accès aux données sont contrôlés par les règles RLS déjà en place dans AURA. Aucune clé `service_role` ou clé secrète ne doit être placée dans l'application.
