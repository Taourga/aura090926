# AURA — Tassadite — Données de démonstration réalistes

Date : 15 septembre 2026

## Objectif

Donner à AURA l'apparence d'une clinique réellement en activité pendant les démonstrations commerciales, sans modifier ni supprimer les données qui existaient avant cette passe.

L'approche retenue sépare clairement :

- les comptes Patient réellement connectables déjà présents dans la démo ;
- les patients de contexte clinique fictifs, utilisés pour donner du volume aux vues Médecin et aux filtres patients ;
- les événements réels de démonstration ajoutés sur les comptes Patient existants afin d'alimenter Planning, Visites, Activités, Permissions et Messages.

## Volume clinique obtenu

Après enrichissement :

- **25 patients visibles côté clinique** ;
- **15 patients rattachés au Dr Thomas Leroy** ;
- **5 patients rattachés au Dr Sophie Martin** ;
- **5 patients rattachés au Dr Amine Bensaïd** ;
- **27 rendez-vous** au total, dont **16 à venir** au moment de la validation ;
- **15 visites** au total, dont **9 à venir** ;
- **18 permissions** au total, dont **6 actives** ;
- **27 activités**, dont **10 à venir** ;
- **65 inscriptions aux activités** ;
- **32 messages cliniques**, dont **8 messages Patient non lus**.

## Patients de contexte ajoutés

21 patients synthétiques ont été créés à partir de lignes de roster déjà prévues pour la démonstration. Ils ne possèdent volontairement **aucun compte Auth de connexion**.

Cette décision évite de créer des identifiants inutiles tout en donnant une vraie densité à l'écran `Mes patients`.

### Dr Thomas Leroy

- Yasmine Benali
- Hugo Lambert
- Leïla Haddad
- Adam Mercier
- Sofia Rahmani
- Mehdi Laurent
- Chloé Bernard
- Samir Bouzid
- Eva Robert
- Nassim Cherif
- Julie Fontaine
- Karim Bensaïd
- Emma Petit

Avec Camille Durand et Nadia Diallo déjà existantes, le Dr Thomas dispose de **15 patients** dans sa liste.

### Dr Sophie Martin

- Rayan Morel
- Lina Garcia
- Thomas Renaud
- Maya Lefèvre

Avec Inès Dubois déjà existante : **5 patients**.

### Dr Amine Bensaïd

- Sofiane Aït Ahmed
- Clara Martin
- Noah Dupont
- Amel Kaci

Avec Lucas Moreau déjà existant : **5 patients**.

## Scénarios de contexte

Chaque patient synthétique possède un scénario cohérent avec :

- étage et chambre ;
- état Présent / En permission ;
- date de sortie prévue ;
- permission éventuelle avec différents statuts : en attente, soumise, validée ou en cours ;
- prochain rendez-vous ;
- activité prescrite ;
- coordonnées fictives ;
- ville ;
- personne de confiance fictive et coordonnées associées.

Tous les emails utilisent le domaine de test `aura-demo.test` et toutes les données sont fictives.

## Écran Médecin — Mes patients

`app/portal/patients/page.tsx` fusionne maintenant :

1. les patients réels de démo reliés à un profil ;
2. les patients de contexte du roster reliés à `demo_patient_scenarios`.

Les filtres **Tous / Présents / En permission / À valider / Permission validée** prennent en compte les deux catégories.

Lorsqu'une fiche correspond à un patient de contexte :

- un badge **Données fictives** est affiché ;
- la mention **patient de contexte non connectable** est visible ;
- les coordonnées, la personne de confiance, le prochain RDV, la permission, la sortie prévue et l'activité prescrite sont affichés ;
- aucune action nécessitant un compte Patient réel n'est proposée.

## Données enrichies sur les comptes Patient existants

Les comptes de démonstration existants Camille Durand, Inès Dubois, Lucas Moreau et Nadia Diallo ont reçu des données supplémentaires.

### Rendez-vous

12 rendez-vous supplémentaires ont été ajoutés entre le 16 et le 23 septembre 2026 :

- entretien psychiatrique ;
- consultation médicale ;
- consultation infirmière ;
- entretien psychologique ;
- consultation diététique ;
- bilan thérapeutique ;
- préparation / bilan de sortie.

Les rendez-vous ajoutés sont identifiables par le champ `notes` :

`Démo AURA · enrichissement Tassadite 2026-09-15`

### Visites

8 nouvelles visites ont été ajoutées avec un ou deux visiteurs et des horaires répartis sur plusieurs jours.

### Permissions

3 nouvelles permissions ont été ajoutées pour diversifier les états :

- soumise ;
- en attente ;
- validée médecin + cadre.

Les anciennes permissions n'ont pas été modifiées, sauf la nouvelle permission Nadia créée pendant ce lot qui a reçu ses validations de démonstration.

### Activités

6 activités supplémentaires ont été créées :

- Groupe gestion du stress — avec prescription ;
- Atelier sommeil — avec prescription ;
- Marche thérapeutique — sans prescription ;
- Atelier créatif — sans prescription ;
- Groupe estime de soi — avec prescription ;
- Yoga doux — sans prescription.

12 inscriptions supplémentaires ont été réparties entre les quatre comptes Patient de démonstration.

### Messages Patient

12 messages entrants ont été ajoutés depuis :

- Dr Thomas Leroy ;
- Sarah Fontaine ;
- Claire Petit.

Ils alimentent la boîte de réception Patient, qui reste **en réception uniquement**. Huit messages sont volontairement non lus pour rendre l'indicateur de notifications visible pendant une démonstration.

## Base de données

Nouvelle table :

`public.demo_patient_scenarios`

Migration tracée dans :

`supabase/migrations/20260915_demo_patient_scenarios.sql`

Sécurité :

- RLS activée ;
- lecture accordée uniquement aux utilisateurs authentifiés ;
- politique limitée à l'établissement actif ;
- accès réservé aux rôles doctor, manager, nurse, reception, psychologist et admin ;
- aucun accès Patient à cette table de contexte.

## Sauvegarde et retour arrière

Code avant enrichissement conservé dans :

`backup-demo-data-before-enrichment-20260915`

Script de retrait du seul enrichissement :

`supabase/rollback/20260915_demo_data_enrichment_rollback.sql`

Ce script supprime uniquement :

- les 12 rendez-vous du lot ;
- les 8 visites du lot ;
- les 3 permissions du lot ;
- les 6 activités et leurs inscriptions ;
- les 12 messages du lot ;
- les 21 scénarios fictifs ;
- puis restaure les anciens libellés `Patient démo XXX` du roster.

Il ne supprime aucune donnée qui existait avant l'enrichissement.

## Validation

- Table de contexte : **21 lignes**.
- Répartition clinique : **15 / 5 / 5 patients** pour Thomas / Sophie / Amine.
- Build Next.js de la vue `Mes patients` enrichie : **READY** sur Vercel preview.
- RLS activée sur la nouvelle table.
- Audit Supabase : aucun nouvel avertissement spécifique à `demo_patient_scenarios`.
- L'audit continue de signaler les avertissements historiques du projet concernant les fonctions `SECURITY DEFINER` accessibles aux utilisateurs authentifiés et la protection des mots de passe compromis désactivée. Ces éléments restent dans le chantier sécurité global AURA.

## Principe de démonstration

Pour une présentation commerciale :

- utiliser un compte Patient existant pour démontrer l'expérience complète et interactive ;
- utiliser le Dr Thomas Leroy pour montrer une file de **15 patients**, les filtres, les rendez-vous, les permissions et les activités prescrites ;
- conserver le badge `Données fictives` afin qu'il soit toujours clair qu'aucune donnée médicale réelle n'est présentée.
