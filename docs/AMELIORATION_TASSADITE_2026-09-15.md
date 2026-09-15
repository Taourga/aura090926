# AURA — Amélioration Tassadite

Date : 15 septembre 2026

## Principe de déploiement

Les améliorations ont été réalisées de façon non destructive.

- Branche de départ : `aurademo`
- Sauvegarde avant modification : `backup-tassadite-avant-modifications-20260915`
- Branche de travail : `tassadite-enhancements-20260915`
- Aucun fichier historique important n’a été supprimé.
- L’ancien composant de dashboard patient dense est conservé dans le dépôt ; il n’est simplement plus monté dans la nouvelle variante pour éviter le doublon d’interface.

Pour revenir à l’état antérieur, la branche `backup-tassadite-avant-modifications-20260915` pointe exactement vers le commit `ea55faf8d98ab2683f35d96c1ccea9218d9722fd`.

## Modifications AURA Patient

### Connexion
- Ajout d’un choix visuel avant connexion : **Patient** ou **Personnel de santé**.
- Conservation du mécanisme d’authentification Supabase existant.

### Accueil
- Ajout de pictogrammes plus visibles.
- Affichage de la date complète à côté de **Aujourd’hui**.
- Barre d’accès rapide réorganisée : **Planning → Activités → Visites → Permissions**.
- Cartes et espacements réduits afin d’alléger la page.
- Ancien dashboard dense désactivé sur cette variante pour éviter un double tableau de bord.
- Ajout d’une zone de notifications utiles : visite à venir, activité modifiée/annulée, permission en attente, absence du médecin référent.

### Planning
- Passage à une vue calendrier sur 7 jours.
- Le planning unifie : rendez-vous, activités, passages médecin, permissions, visites et événements personnels.
- Ajout direct par le patient d’un événement personnel via **+ Ajouter au calendrier**.
- Nouvelle table sécurisée `patient_personal_events` avec RLS limitée au patient propriétaire et à l’établissement actif.

### Activités
- Nouveau champ `requires_prescription` sur `activities`.
- Trois vues : **Sans prescription**, **Avec prescription**, **Libres & collectives**.
- Les cartes affichent clairement le statut avec/sans prescription.
- Le formulaire de création permet de marquer une activité **Avec prescription**.

### Visites
- Bouton visible **+ Ajouter une visite**.
- Dans le calendrier, chaque visite affiche désormais **heure + nom du visiteur**.
- Les visites remontent aussi automatiquement dans le planning patient et dans les notifications de l’accueil patient.

### Notifications et temps réel
- Activation Supabase Realtime pour : permissions, rendez-vous, activités, inscriptions aux activités, visites, passages médecin, événements personnels, messages et séjours.
- Le portail s’abonne aux changements et rafraîchit automatiquement les données concernées.

## Modifications AURA Médecin

### Accueil médecin
- Suppression visuelle du bloc message de l’accueil médecin.
- Suppression visuelle du bloc **3 repères utiles** et des métriques redondantes qui formaient les points d’attention.
- Le module **Mes patients** reste disponible dans la navigation secondaire mais n’est plus mis en avant sur l’accueil.
- Ajout d’un bouton **Ouvrir Doctolib**.
- Ajout du choix de la spécialité médicale depuis l’accueil.
- Les prochains rendez-vous affichés sur l’accueil sont maintenant limités aux rendez-vous créés par le médecin connecté.

### Mes patients
- Suppression du bouton **Message** depuis la fiche patient.
- Ajout d’un dashboard de filtres : **Tous**, **Présents**, **En permission**, **À valider**, **Permission validée**.
- La spécialité du médecin référent est visible dans la vue et à côté du prochain rendez-vous.
- Ajout d’un bloc **Activités prescrites**.
- Les autres activités restent accessibles dans **Plus d’informations**.
- Pour la personne de confiance, ajout d’une action explicite **Envoyer un email**.

### Permissions
- Affichage explicite du validateur encore attendu : **médecin**, **cadre** ou les deux.
- Le médecin et le cadre peuvent modifier leur propre décision tant que la permission n’est pas partie/terminée/annulée.
- L’interface rappelle la décision actuelle avant modification.
- Le lien de message patient a été retiré de la vue contextuelle médecin.

### Messagerie
- Pour le médecin, la messagerie est limitée aux discussions avec le personnel de santé.
- Les patients ne sont plus proposés comme contacts dans la messagerie médecin.
- Ajout d’indicateurs **Nouveaux messages** et **Mes discussions**.
- Ajout d’un accès direct **Accueil** depuis la page de messagerie.
- La messagerie reste disponible en navigation principale médecin.

## Base de données

Migrations appliquées sur le projet Supabase `aura090926` :

1. `tassadite_patient_planning_and_activity_prescription`
   - ajout de `activities.requires_prescription`
   - création de `patient_personal_events`
   - indexes, trigger `updated_at`, RLS et droits authentifiés
2. `tassadite_doctor_specialty_self_update`
   - le médecin peut modifier uniquement sa propre spécialité dans `care_team_directory`
3. `tassadite_permission_decision_revision`
   - évolution contrôlée de `review_permission_request` pour autoriser une révision de décision avant le départ
4. `tassadite_realtime_modules`
   - ajout des tables fonctionnelles utiles à la publication `supabase_realtime`

## Fichiers principaux modifiés ou ajoutés

- `app/login/login-form.tsx`
- `app/portal/page.tsx`
- `app/portal/appointments/page.tsx`
- `app/portal/activities/page.tsx`
- `app/portal/patients/page.tsx`
- `app/portal/permissions/page.tsx`
- `app/portal/messages/page.tsx`
- `app/portal/tassadite-actions.ts`
- `components/portal-shell.tsx`
- `components/realtime-refresh.tsx`
- `components/staff-dashboard.tsx`
- `components/doctor-specialty.tsx`
- `components/activity-form.tsx`
- `components/visit-calendar.tsx`
- `components/permission-actions.tsx`
- `app/tassadite.css`
- `app/layout.tsx`

## Contrôles

- Déploiements Vercel de la branche de travail déclenchés automatiquement.
- Le build incluant l’accueil Patient complet a terminé en état `READY` sans erreur de compilation.
- Vérification Supabase : les tables prévues sont présentes dans `supabase_realtime`.
- Audit sécurité Supabase exécuté. Il remonte des avertissements historiques sur plusieurs fonctions `SECURITY DEFINER` du projet ainsi que la protection contre les mots de passe compromis désactivée. Ces éléments existaient à l’échelle du projet et feront l’objet d’un chantier sécurité distinct ; la fonction permission modifiée conserve ses contrôles explicites de rôle et d’établissement.

## Itération Patient épurée — 15 septembre 2026

Une seconde passe UX a été appliquée à la suite du retour visuel sur `demo.auradh.com`.

### Objectif
- Réduire la hauteur du bandeau blanc supérieur.
- Garder les quatre actions Patient toujours accessibles.
- Supprimer l’effet de menu **Plus** trop générique.
- Rendre l’expérience mobile plus proche d’une application native.
- Réduire encore la densité de l’accueil sans retirer les fonctions métier.

### Changements réalisés
- Nouveau composant `components/patient-chrome-enhancer.tsx`.
- Détection sécurisée de l’espace Patient via l’API Patient existante.
- Header Patient rendu compact et sticky.
- Les informations secondaires du header sont visuellement réduites afin de conserver en priorité la section courante, l’aide, les messages et le compte.
- Nouvelle barre principale sticky sur desktop : **Planning / Activités / Visites / Permissions**.
- Sur mobile, cette barre devient un dock fixe en bas avec pictogrammes et libellés courts.
- Les anciens grands rectangles de l’accueil sont masqués pour éviter le doublon avec le dock permanent.
- Dans la barre latérale Patient, **Mon planning**, **Mes sorties** et **Plus** sont retirés visuellement puisque ces accès sont désormais disponibles ailleurs de manière plus directe.
- Le menu **Plus** disparaît du parcours Patient principal.
- Les services secondaires utiles sont intégrés directement sur l’accueil sous forme de petits raccourcis : **Repas / Mes contacts / Infos pratiques**.
- La citation du jour est retirée visuellement de l’accueil afin de libérer de l’espace.
- Le bulletin de situation reste disponible mais dans un format plus compact.
- Les blocs Aujourd’hui, notifications, demain, prochain repas et médecin référent sont resserrés.
- Sur mobile, les informations secondaires du header et des cartes sont encore davantage réduites.

### Sauvegarde spécifique avant cette passe
- Branche de sauvegarde : `backup-patient-epure-20260915`
- Branche de travail : `patient-epure-20260915`
- Point de départ de cette passe : commit `f69d2ee2beff367608b49213c3330cb6c3b0516a`

### Validation technique
- Build Next.js de la branche `patient-epure-20260915` terminé avec succès sur Vercel.
- Compilation, lint et vérification TypeScript validés.
- Aperçu Vercel accessible et redirection d’authentification fonctionnelle.

## Retour arrière

Pour restaurer exactement la démo avant l’ensemble des modifications Tassadite :

`backup-tassadite-avant-modifications-20260915`

Pour restaurer uniquement l’état juste avant la simplification finale Patient :

`backup-patient-epure-20260915`

Aucune suppression de ces branches ne doit être faite avant validation complète de la version Tassadite.
