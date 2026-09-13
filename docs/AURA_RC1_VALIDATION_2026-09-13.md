# AURA RC1 — Validation Pilot Ready

Date: 2026-09-13
Branch: `stabilization/pilot-ready`
Release candidate base: `b3775fcd1def84fef32308670870bc04292423df`

## Verdict

AURA RC1 est **prêt pour démonstration et pilote sur données fictives**.

AURA RC1 n'est **pas encore autorisé pour de vraies données patient** tant que les gates manuelles suivantes ne sont pas fermées:

- MFA pour les comptes professionnels sensibles;
- protection contre mots de passe compromis si disponible sur le plan Supabase utilisé;
- test de sauvegarde + restauration sur un environnement non-production;
- validation hébergement / conformité France avant données de santé réelles FR;
- validation hébergement / transferts / conformité Algérie avant données de santé réelles DZ;
- protection de branche `master` côté GitHub si les permissions d'administration le permettent.

## Contrôles automatiques

GitHub Actions sur le commit RC1:

- lint: OK;
- TypeScript: OK;
- build Next.js: OK;
- smoke tests démarrage application: OK.

Vercel Preview:

- état: READY;
- `/api/health`: HTTP 200;
- release retournée: `b3775fcd`;
- headers sécurité présents;
- aucune erreur/fatal runtime relevée sur les dernières 24 h pour le preview RC1.

## Test clinique critique — permission complète

Test exécuté dans une transaction SQL avec `ROLLBACK`; aucune donnée de test conservée.

Scénario:

1. Camille Durand / patient crée une demande de permission future.
2. Dr Thomas Leroy / médecin l'approuve.
3. Nadia Bernard / cadre l'approuve.
4. Paul Morel / accueil enregistre le départ réel.
5. Paul Morel / accueil enregistre le retour réel.

Résultat final:

- statut: `returned`;
- décision médecin: `approved`;
- décision cadre: `approved`;
- départ horodaté: oui;
- retour horodaté: oui;
- patient: correct;
- établissement: correct.

## Tests d'autorisation négatifs

Tests exécutés en transaction puis annulés:

- un patient ne peut pas valider une permission: OK;
- un médecin ne peut pas enregistrer le mouvement réservé à l'accueil: OK;
- l'accueil ne peut pas valider une permission: OK.

Ces refus sont appliqués côté base/RPC et ne reposent donc pas uniquement sur l'interface.

## Multi-clinique

Déjà validé dans LOT 2:

- `facility_id` sur les données métier;
- memberships et rôles par établissement;
- RLS tenant-aware;
- RPC métier tenant-aware;
- test clinique A / clinique B avec donnée sentinelle: 0 visibilité croisée;
- changement d'établissement actif contrôlé.

## Country Packs

Déjà validé dans LOT 3:

- AURA_CORE;
- AURA_FR;
- AURA_DZ;
- règles permissions, visites, repas, fuseau horaire et feature flags configurables par établissement;
- un seul codebase.

## Sécurité Supabase

État RC1:

- RLS activé sur les tables exposées;
- aucune fonction `SECURITY DEFINER` accessible anonymement;
- fonctions métier privilégiées authentifiées encore signalées par l'advisor: attendu et audité progressivement;
- les RPC critiques multi-cliniques sont scoppées par `facility_id`;
- `Leaked Password Protection` reste désactivé et constitue une gate manuelle avant production réelle.

## Exploitation / zéro coût

Aucune branche Supabase payante n'a été créée.

Le preview Vercel sert d'environnement de validation web. Une base staging Supabase dédiée sera créée uniquement lorsque le budget le permettra.

## Règle de release

Ne pas merger/pousser la RC1 vers `master` tant que:

1. la CI n'est pas verte;
2. le preview n'est pas READY;
3. `/api/health` ne répond pas 200;
4. les smoke tests manuels principaux ne sont pas passés;
5. un rollback est identifié;
6. la compatibilité legacy nécessaire à l'ancienne production n'est pas comprise.

## Statut commercial recommandé

Formulation autorisée:

> AURA RC1 est prêt pour démonstration et pilote contrôlé avec données fictives, multi-clinique, configurable FR/DZ et sécurisé par rôles/établissement.

Formulations à éviter pour l'instant:

- « certifié HDS »;
- « conforme ANPDP » sans validation locale;
- « prêt pour vraies données médicales »;
- « remplace le DPI/SIH ».
