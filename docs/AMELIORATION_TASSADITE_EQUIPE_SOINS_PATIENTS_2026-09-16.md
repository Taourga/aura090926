# AURA — Amélioration Tassadite — Équipe de soins & suivi patients

Date : 16 septembre 2026

## Objectif

Fiabiliser l'écran Patients pour que chaque sélection recharge bien les données propres au patient, ajouter une lecture immédiate de la présence et des retards de permission, puis appliquer aux infirmiers la même logique d'interface épurée que celle déjà mise en place pour les médecins.

## Sélection patient

La navigation entre patients force désormais le rechargement serveur de la fiche sélectionnée et la zone de détail est montée avec une clé propre au patient.

Conséquence :

- coordonnées recalculées pour le patient sélectionné ;
- personne de confiance recalculée pour le patient sélectionné ;
- rendez-vous, permissions et activités recalculés ;
- disparition du risque d'affichage résiduel provenant du patient précédemment consulté.

Les coordonnées réelles restent prioritaires. Les valeurs synthétiques de démonstration ne servent que de complément lorsqu'une information manque.

## Filtre Présents / Absents

Ajout d'un filtre compact sous forme de cases à cocher :

- Présents ;
- Absents.

Les deux cases cochées affichent l'ensemble des patients. Une seule case cochée limite immédiatement la liste. Ce filtre peut être combiné avec les filtres existants : Tous, Présents, Absents / permission, À valider et Permission validée.

## Alerte de retour de permission en retard

Un patient est considéré en retard lorsque :

- la permission est au statut `departed` ;
- aucun retour n'est enregistré ;
- l'heure `return_at` est dépassée.

L'interface affiche alors :

- une alerte globale avec le nombre de retours en retard ;
- le patient concerné en rouge dans la liste ;
- la mention « Retour en retard » ;
- une alerte détaillée dans sa fiche avec l'heure de retour attendue ;
- un lien direct vers les permissions.

Les scénarios fictifs utilisent la même règle. Au moment de cette livraison, plusieurs patients de démonstration ont volontairement une heure de retour dépassée afin de rendre la fonctionnalité immédiatement visible en présentation.

## Interface infirmier

Le rôle Infirmier adopte désormais la même philosophie d'interface que le rôle Médecin :

- barre latérale réduite à Accueil ;
- suppression du menu « Plus » du parcours principal ;
- dock principal permanent : Patients, Planning, Permissions, Messages ;
- dock adapté en navigation compacte sur mobile ;
- accès secondaires regroupés sur l'accueil : Relève, Séjours, Sorties, AURA Pulse ;
- accès à l'écran Patients du service ;
- même fiche patient simplifiée : coordonnées, personne de confiance, prochain rendez-vous, permissions, activité prescrite ;
- mêmes alertes de retour en retard ;
- accueil infirmier visuellement compacté sans supprimer les fonctions opérationnelles.

La gestion du consentement du proche reste réservée au médecin ; l'infirmier peut consulter les informations utiles sans modifier ce consentement.

## Données de démonstration

Aucune donnée existante n'a été supprimée ou réécrite pour cette passe.

Les retards visibles reposent sur les permissions et scénarios déjà présents. La table `demo_patient_scenarios` reste en lecture seule pour le personnel authentifié selon les règles de sécurité déjà mises en place.

## Fichiers modifiés

- `app/portal/patients/page.tsx`
- `components/patient-presence-filters.tsx`
- `components/portal-shell.tsx`
- `app/care-ui-alerts.css`
- `app/layout.tsx`

## Validation

- compilation Next.js : OK ;
- vérification TypeScript : OK ;
- génération des pages : OK ;
- preview Vercel : READY ;
- contrôle Supabase : projet `aura090926` ACTIVE_HEALTHY ;
- contrôle des scénarios de permission : plusieurs retours dépassés disponibles pour la démonstration.

## Retour arrière

État du code avant cette passe conservé dans :

`backup-care-ui-alerts-20260916`
