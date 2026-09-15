# AURA — Tassadite — Coordonnées Patient complètes en démonstration

Date : 15 septembre 2026

## Objectif

Éviter qu'une fiche de l'écran **Médecin > Mes patients** affiche des coordonnées incomplètes ou des mentions « non renseigné » pendant une démonstration.

## Règle retenue

Les données réellement enregistrées dans AURA restent toujours prioritaires et ne sont jamais écrasées.

Lorsqu'une information manque dans la fiche Patient, l'interface de démonstration génère automatiquement une valeur fictive mais stable pour ce patient :

- téléphone mobile ;
- email sous le domaine `aura-demo.test` ;
- adresse ;
- code postal ;
- ville.

Le même patient conserve les mêmes valeurs d'une consultation à l'autre grâce à une génération déterministe basée sur son identifiant.

## Transparence

Dès qu'au moins une coordonnée affichée provient du mécanisme de complément, la carte **Coordonnées** affiche le badge :

`Complété pour la démo`

Cela évite de présenter une information synthétique comme une vraie donnée patient.

## Patients de contexte

Les patients fictifs de `demo_patient_scenarios` continuent d'utiliser en priorité leurs coordonnées enregistrées dans leur scénario. Si l'une d'elles manque, le même mécanisme de complément s'applique.

## Comptes Patient existants

Pour les patients reliés à un vrai profil de démonstration :

1. `patient_contact_cards` est prioritaire ;
2. le téléphone du profil est utilisé en second choix ;
3. l'email du profil est utilisé en second choix ;
4. uniquement les champs encore manquants sont complétés par des valeurs de démonstration.

Aucune vraie coordonnée existante n'est remplacée.

## Fichier modifié

- `app/portal/patients/page.tsx`

## Sauvegarde

État précédent conservé dans :

`backup-patient-coordinates-20260915`

## Validation

- compilation Next.js : OK ;
- vérification TypeScript / lint : OK ;
- génération des pages : OK ;
- déploiement preview Vercel : READY.
