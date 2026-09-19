# AURA Patient — MVP mobile

Application mobile patient isolée du site web AURA.

## Périmètre MVP

- Connexion via Supabase Auth
- Accueil patient avec événements à venir
- Planning consolidé sur 7 jours
- Activités avec/sans prescription, inscription et désinscription
- Visites : consultation et déclaration d'un visiteur
- Permissions : demande et suivi des validations
- Notifications : messages de l'équipe et mises à jour des activités
- Documents : écran prêt à connecter, sans modification du schéma de production
- Profil, établissement, chambre et déconnexion

Le MVP réutilise le projet Supabase AURA existant, ses RPC et ses règles RLS. Aucune migration de base de données n'est nécessaire. Le module Documents reste volontairement sans persistance tant qu'AURA Core ne dispose pas d'un stockage documentaire patient dédié.

## Test rapide sur iPhone avec Expo Go

Pré-requis : Node.js, l'application Expo Go sur l'iPhone et le dépôt AURA disponible sur l'ordinateur.

```bash
git checkout mobile-mvp-20260918
cd mobile
cp .env.example .env
npm ci
npm run typecheck
npm run start:tunnel
```

Scanner ensuite le QR code avec l'iPhone. Le mode `--tunnel` évite que l'iPhone et l'ordinateur aient besoin d'être sur exactement le même réseau local.

## Préparation EAS / TestFlight

Identifiants natifs réservés pour le MVP :

- iOS bundle identifier : `com.auradh.patient`
- Android application id : `com.auradh.patient`

Les profils EAS sont définis dans `eas.json` :

- `preview` : distribution interne
- `production` : build destiné aux stores/TestFlight, avec auto-incrément du build

Pour le premier envoi TestFlight, depuis `mobile/` :

```bash
npx testflight
```

Cette étape nécessite une connexion à un compte Expo et un compte Apple Developer actif. Expo/EAS gère ensuite la création/signature du build iOS et l'envoi vers App Store Connect/TestFlight.

## Architecture et isolation

Le projet mobile possède son propre `package.json` et son propre `tsconfig.json`. Le Next.js web à la racine ignore explicitement `mobile/` pour le lint et le typecheck, afin d'éviter toute régression du site existant.

Branche de développement : `mobile-mvp-20260918`.

## Sécurité

Le client mobile utilise uniquement la clé Supabase **publishable**. Les accès aux données sont contrôlés par les règles RLS déjà en place dans AURA. Aucune clé `service_role` ou clé secrète ne doit être placée dans l'application.
