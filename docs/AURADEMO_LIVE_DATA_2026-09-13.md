# AURA Demo — jeu de données vivant

Date : 13 septembre 2026
Branche : `aurademo`

## Objectif

Donner l'impression d'un établissement réellement utilisé depuis une semaine, sans aucune donnée patient réelle.

## Patients de démonstration actifs

La démo contient 4 profils Patient fictifs de référence :

- Camille Durand — chambre 214 — Unité A
- Inès Dubois — chambre 108 — RDC
- Lucas Moreau — chambre 206 — Unité B
- Nadia Diallo — chambre 312 — 3e étage

Les trois derniers comptes étaient auparavant des comptes techniques fictifs et ont été réaffectés au rôle Patient uniquement dans le jeu de démonstration.

## Données synthétiques ajoutées

- séjours actifs de démonstration ;
- activités passées, aujourd'hui et à venir ;
- inscriptions patient aux activités ;
- rendez-vous de démonstration ;
- permissions avec statuts variés : en attente, autorisée, refusée, retour enregistré ;
- visites passées, visiteurs arrivés et visites futures ;
- messagerie Médecin ↔ Infirmier avec messages lus et non lus ;
- informations établissement publiées ;
- tournées du médecin ;
- planning hôtellerie ;
- tâches hôtelières avec avancement visible.

## Comptes utiles pour la démonstration

Les identifiants de connexion et mots de passe sont conservés **hors GitHub** et ne doivent jamais être ajoutés au dépôt, à un commit, une issue ou une documentation partagée.

Profils de référence :

- Patient principal : `camille.durand@aura-demo.test`
- Médecin : `thomas.leroy@aura-demo.test`
- Cadre : `nadia.bernard@aura-demo.test`
- Accueil : `paul.morel@aura-demo.test`
- Infirmier : `sarah.fontaine@aura-demo.test`
- Gouvernante : `gouvernante@demo.aura.test`
- Administrateur démo : `emma.roux@aura-demo.test`

## Règles

- données fictives uniquement ;
- aucune adresse e-mail personnelle ne doit apparaître dans un écran de présentation ;
- ne jamais transformer ces données en dossiers patients réels ;
- ne pas fusionner les adaptations purement commerciales de `aurademo` dans `master` sans revue ;
- conserver la mention « Données fictives » dans l'interface de démonstration ;
- toute action irréversible reste interdite pendant une présentation investisseur.
