# AURA — Prescriptions d’activités & espaces intervenants

Date : 16 septembre 2026
Branche : `prescriptions-intervenants-20260916`
Statut : code applicatif validé en preview Vercel, schéma Supabase en attente d’autorisation du connecteur.

## Objectif
Créer un parcours complet :
1. Le médecin prescrit une activité depuis la fiche patient.
2. Le patient retrouve ses activités prescrites dans son espace Activités.
3. L’intervenant affecté voit la liste des patients qui lui sont adressés.
4. L’intervenant ajoute une séance qui est automatiquement ajoutée au planning Patient lorsque le patient possède un compte AURA.
5. L’infirmier voit les prescriptions en consultation uniquement.

## Activités prescrivables
- Piscine
- Boxe-thérapie
- Équithérapie
- Psychologue
- Assistance sociale
- Diététicien

## Données ajoutées
Trois nouvelles tables sont prévues :
- `activity_services`
- `activity_prescriptions`
- `activity_prescription_sessions`

La migration est disponible dans :
`supabase/migrations/20260916_activity_prescriptions_and_providers.sql`

Les règles RLS prévues séparent :
- prescription : médecin uniquement ;
- consultation clinique : médecin, infirmier, cadre, admin ;
- consultation Patient : uniquement ses propres prescriptions ;
- planification d’une séance : uniquement l’intervenant affecté.

## Interface médecin
Depuis `/portal/patients` :
- bloc « Activités prescrites » ;
- choix du type d’activité ;
- affichage de l’intervenant affecté ;
- consigne médicale facultative ;
- historique des séances.

## Interface infirmier
La même fiche patient est utilisée mais la prescription reste en lecture seule.

## Interface Patient
Sur `/portal/activities` :
- bloc « Mes activités prescrites » ;
- activité ;
- intervenant ;
- consigne ;
- séances programmées.

## Interface intervenant
Nouvelle page : `/portal/interventions`

Chaque intervenant voit :
- ses prescriptions actives ;
- le patient concerné ;
- la consigne médicale ;
- les séances déjà planifiées ;
- un formulaire pour ajouter une séance au planning du patient.

## Navigation médecin / infirmier
La sélection d’un patient a été rendue persistante :
- maintien de la position de scroll ;
- maintien de la position de la liste ;
- patient sélectionné en surbrillance.

## Validation technique
Build Vercel preview validé sur le commit :
`333c80d6cdae3cf1b80e2f220676222bc04b96fd`

Routes nouvelles :
- `/api/prescriptions`
- `/portal/interventions`

## Blocage actuel
Le connecteur Supabase refuse actuellement les opérations `execute_sql` et `apply_migration` avec une erreur d’autorisation.
La production n’a donc volontairement pas été basculée afin d’éviter de déployer une interface dépendant de tables non créées.

Dès que l’accès Supabase est réautorisé, les étapes restantes sont :
1. appliquer la migration ;
2. créer/lier les comptes intervenants ;
3. vérifier RLS ;
4. tester prescription → séance → planning Patient ;
5. basculer `master` et `aurademo` après validation.
