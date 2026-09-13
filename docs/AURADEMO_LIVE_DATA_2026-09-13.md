# AURA Demo — jeu de données vivant

Date : 13 septembre 2026
Branche : `aurademo`

## Objectif

Donner l'impression d'un établissement réellement utilisé depuis une semaine, sans aucune donnée patient réelle.

## Patients de démonstration actifs

La démo contient désormais 4 profils Patient actifs :

- Camille Durand — chambre 214 — Unité A
- Inès Dubois — chambre 108 — RDC
- Lucas Moreau — chambre 206 — Unité B
- Nadia Diallo — chambre 312 — 3e étage

Les trois derniers comptes étaient auparavant des comptes techniques fictifs et ont été réaffectés au rôle Patient uniquement dans le jeu de démonstration.

## Données synthétiques ajoutées

- 4 séjours actifs
- activités passées, aujourd'hui et à venir
- 48 inscriptions patient aux activités
- 12 rendez-vous de démonstration
- permissions avec statuts variés : en attente, autorisée, refusée, retour enregistré
- visites passées, visiteur actuellement arrivé et visites futures
- messagerie Médecin ↔ Infirmier avec messages lus et non lus
- informations établissement publiées
- tournées du médecin
- planning hôtellerie du jour
- 121 tâches hôtelières dont une partie déjà terminée

## Scénario du jour

Le 13/09/2026 :

- 4 patients présents
- 4 rendez-vous programmés aujourd'hui
- 6 permissions actives à suivre
- 2 visites prévues aujourd'hui
- 1 visiteur déjà arrivé
- 121 tâches hôtelières, avec avancement visible

## Comptes utiles pour la démonstration

Mot de passe commun des comptes fictifs : `Aura!123456`

- Patient principal : `camille.durand@aura-demo.test`
- Médecin : `thomas.leroy@aura-demo.test`
- Cadre : `nadia.bernard@aura-demo.test`
- Accueil : `paul.morel@aura-demo.test`
- Infirmier : `sarah.fontaine@aura-demo.test`
- Gouvernante : `gouvernante@demo.aura.test`
- Administrateur démo : `emma.roux@aura-demo.test`

Le compte personnel `saibi.yanis@gmail.com` n'utilise pas le mot de passe commun de démonstration.

## Règles

- données fictives uniquement ;
- ne jamais transformer ces données en dossiers patients réels ;
- ne pas fusionner les adaptations purement commerciales de `aurademo` dans `master` sans revue ;
- conserver la mention « Données fictives » dans l'interface de démonstration.
