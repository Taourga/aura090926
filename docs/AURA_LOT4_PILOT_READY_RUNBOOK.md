# AURA — LOT 4 Pilot Ready Runbook

Ce fichier est la checklist opérationnelle à suivre avant le premier pilote avec de vraies données.

## A. État des environnements

### Production
- Branche GitHub : `master`
- URL : `https://aura090926.vercel.app/`
- Usage : démo publique actuelle
- Règle : ne pas modifier directement

### Staging web
- Branche GitHub : `stabilization/pilot-ready`
- Alias Vercel de branche : `https://aura090926-git-stabilization-pilot-ready-wilyan.vercel.app/`
- Usage : validation interne de RC1
- Peut être protégé par l’authentification Vercel

### Staging Supabase
- Non créé à ce jour
- Coût constaté : 0,01344 USD/heure
- Création uniquement après validation explicite du coût

---

## B. Gate avant mise en production RC1

Toutes les lignes suivantes doivent être OUI :

- [ ] CI GitHub : lint vert
- [ ] CI GitHub : TypeScript vert
- [ ] CI GitHub : build vert
- [ ] CI GitHub : smoke test vert
- [ ] Preview Vercel : READY
- [ ] Page `/` : OK
- [ ] Page `/login` : OK
- [ ] `/api/health` : OK sur RC1
- [ ] Aucun log Vercel error/fatal inexpliqué
- [ ] Supabase Security Advisor relu
- [ ] Aucun RPC SECURITY DEFINER anonyme non justifié
- [ ] Leaked Password Protection activé
- [ ] Stratégie MFA staff validée
- [ ] Tests patient / médecin / cadre / accueil / admin réalisés
- [ ] Test isolation Clinique A / Clinique B réalisé
- [ ] Backup disponible avant release
- [ ] Restauration testée sur environnement non-production
- [ ] Plan de rollback relu
- [ ] Conformité pays validée pour les vraies données

Si une case P0 est NON, pas de vraies données patient.

---

## C. Scénarios de recette minimum

### Patient
1. Connexion.
2. Voir le planning.
3. Voir une activité.
4. Créer une permission avec la règle de délai de la clinique.
5. Voir la permission en attente.
6. Prévenir l’accueil d’une visite selon les règles de la clinique.
7. Se déconnecter.

### Médecin
1. Connexion.
2. Voir uniquement les patients de la clinique active.
3. Examiner une permission.
4. Valider/refuser.
5. Créer un rendez-vous.
6. Changer de clinique si le compte possède plusieurs adhésions et vérifier que les données changent de périmètre.

### Cadre
1. Voir les permissions à traiter.
2. Faire la seconde validation.
3. Vérifier que la permission ne passe à “autorisée” qu’après les deux décisions attendues.

### Accueil
1. Voir les permissions autorisées.
2. Enregistrer le départ réel.
3. Vérifier le statut de présence.
4. Enregistrer le retour réel.
5. Gérer arrivée/départ d’un visiteur.

### Admin
1. Voir uniquement les membres de l’établissement actif.
2. Modifier le rôle d’un membre dans cette clinique.
3. Appliquer un Country Pack sur un environnement de test.
4. Activer/désactiver un module.
5. Vérifier que le menu utilisateur change.
6. Créer une invitation de test.
7. Créer un deuxième établissement uniquement dans l’environnement de test.

---

## D. Procédure normale de release

1. Vérifier que la PR de stabilisation est à jour.
2. Vérifier la CI.
3. Vérifier le preview Vercel.
4. Vérifier les migrations Supabase.
5. Faire/valider le backup.
6. Valider la gate Pilot Ready.
7. Fusionner vers `master`.
8. Attendre le déploiement Vercel production.
9. Vérifier immédiatement `/`, `/login`, `/api/health`.
10. Tester une connexion avec un compte démo non sensible.
11. Vérifier les logs Vercel.
12. Surveiller pendant la phase de démarrage du pilote.

---

## E. Retrait de la compatibilité legacy après promotion RC1

À faire uniquement après confirmation que la production utilise bien le nouveau code.

À retirer avant la création de plusieurs cliniques réelles :

```sql
drop index if exists public.menu_items_legacy_service_date_meal_key;
drop index if exists public.sport_room_schedules_legacy_schedule_date_key;
drop trigger if exists sync_legacy_profile_access_to_membership on public.profiles;
drop function if exists public.sync_legacy_profile_access_to_membership();
```

Ne jamais exécuter ce bloc tant que l’ancienne application `master` est encore en production.

---

## F. Rollback application

Si la nouvelle application plante après release mais que la base reste compatible :

1. Ne pas lancer de nouvelle migration.
2. Identifier le dernier déploiement Vercel stable.
3. Rollback/re-promouvoir le déploiement stable.
4. Vérifier `/` et `/login`.
5. Vérifier les logs.
6. Documenter l’incident avant un nouveau déploiement.

## G. Rollback base de données

Une migration DB ne doit pas être “annulée” à l’aveugle.

Pour chaque migration :
- comprendre ce qui a changé ;
- vérifier si des données nouvelles utilisent déjà le nouveau schéma ;
- préparer une migration corrective ;
- restaurer un backup uniquement si nécessaire et selon la procédure Supabase validée.

Pour les migrations additives (nouvelle colonne, nouvel index, nouvelle table), on préfère généralement une correction additive plutôt qu’un retour destructif.

---

## H. Règles d’exploitation simples

- Ne jamais travailler directement sur `master`.
- Ne jamais ignorer une CI rouge.
- Ne jamais utiliser de vraies données patient dans une preview non validée.
- Ne jamais créer une deuxième base de code “AURA FR” et “AURA DZ”.
- Ne jamais exposer une service-role key dans le navigateur.
- Ne jamais désactiver RLS pour résoudre rapidement un bug.
- Ne jamais mettre une donnée médicale détaillée dans une notification SMS/e-mail non prévue pour cela.

---

## I. Ce que signifie “Pilot Ready”

Pilot Ready ne signifie pas “le logiciel est terminé pour toujours”.

Cela signifie :
- le socle est stable ;
- les accès sont contrôlés ;
- on peut revenir en arrière ;
- on sait détecter une panne ;
- on sait tester les parcours essentiels ;
- la clinique pilote peut utiliser un périmètre limité et mesurable ;
- les exigences réglementaires du pays ont été validées avant d’introduire des données réelles.
