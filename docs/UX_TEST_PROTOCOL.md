# AURA — protocole de test de la navigation simplifiée

## Objectif
Valider la navigation simplifiée avec au moins 3 à 5 personnes par profil avant de figer définitivement l'architecture.

## Activation du mode test
1. Se connecter avec le profil à tester.
2. Ouvrir `/portal?ux_test=1` une seule fois au début de la session.
3. Vérifier la présence du badge `Mode test UX actif`.
4. Réaliser les tâches sans aide.
5. Pour arrêter la mesure, ouvrir `/portal?ux_test=0`.

Le mode test n'enregistre aucun nom de patient, message ou contenu de formulaire. Il stocke seulement le rôle, l'établissement, un identifiant aléatoire de session, la page et la destination de navigation. Les segments ressemblant à des identifiants sont remplacés par `:id` avant stockage.

## Tâches recommandées

### Patient
- Trouver le prochain rendez-vous.
- Ouvrir une demande de permission.
- Vérifier une visite ou une activité.
- Trouver les informations utiles du séjour.

### Médecin
- Identifier une permission en attente.
- Accéder au prochain patient.
- Ouvrir le planning.
- Retrouver un patient depuis le cockpit.

### Cadre
- Identifier une décision à arbitrer.
- Vérifier les retours en retard.
- Ouvrir AURA Pulse.
- Accéder à AURA Impact.

### Infirmier
- Identifier les patients hors service.
- Ouvrir la relève.
- Vérifier les rendez-vous à anticiper.
- Accéder aux permissions actives.

### Accueil
- Identifier un départ à enregistrer.
- Identifier un retour attendu.
- Ouvrir les séjours.
- Retrouver les visites attendues.

### Direction / Administrateur
- Ouvrir le pilotage ROI.
- Ouvrir AURA Impact.
- Vérifier les utilisateurs actifs.
- Retrouver la configuration établissement.

## Indicateurs à observer
- Sessions par profil.
- Nombre de pages vues.
- Nombre de clics de navigation.
- Clics moyens par session.
- Destinations les plus utilisées.
- Tâches pour lesquelles le testeur hésite ou revient en arrière.

## Critère de décision
Ne pas supprimer la branche `aura-demo-avant-simplification` tant que les profils prioritaires n'ont pas été testés. La navigation simplifiée est validée si les tâches principales sont trouvées rapidement, avec peu de retours arrière et sans besoin d'explication externe.
