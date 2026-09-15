# AURA — Tassadite — Espace Médecin épuré

Date : 15 septembre 2026

## Objectif

Appliquer au profil Médecin la même logique de simplification déjà retenue pour le profil Patient : moins de menus, moins de grands blocs, accès métier immédiats, navigation stable et adaptation mobile.

## Navigation principale

Le menu latéral du médecin est simplifié pour ne conserver que **Accueil**.

Les quatre actions métier principales deviennent un dock permanent :

1. **Patients** — Mes patients
2. **Planning** — Mes rendez-vous
3. **Permissions** — À valider
4. **Messages** — Équipe de santé

Sur ordinateur, le dock est placé immédiatement sous le header et reste visible pendant la navigation.

Sur mobile, le dock devient une barre fixe en bas avec icône + libellé court, sur le même principe que l’espace Patient.

Le menu **Plus** disparaît du parcours Médecin.

## Fonctions secondaires

Les fonctions qui se trouvaient auparavant dans Plus ne sont pas supprimées. Elles sont regroupées dans une barre compacte **À portée de main** sur l’accueil Médecin :

- Mes absences
- Séjours
- Sorties
- AURA Pulse
- Doctolib

## Header Médecin

- Hauteur desktop ramenée à environ 36 px.
- Hauteur mobile ramenée à environ 34 px.
- Les badges CORE / Données fictives / sélecteur établissement sont masqués dans cette vue épurée afin de réduire le bruit visuel.
- Nom, avatar, cloche et Déconnexion sont compactés.
- Une zone est réservée au sélecteur de langue afin qu’il ne masque plus Déconnexion.
- Le lien Retour accueil est retiré du header Médecin : l’accès Accueil reste disponible dans la navigation.

## Accueil Médecin

L’ancien grand bandeau médical est remplacé par une entête compacte contenant :

- Bonjour Dr.
- une phrase courte sur les priorités ;
- le choix de spécialité et son bouton Enregistrer.

Le lien Doctolib est déplacé dans la barre À portée de main.

## Priorités cliniques

L’accueil conserve les deux zones utiles au médecin :

- **Permissions à traiter** ;
- **Prochains rendez-vous**.

Pour alléger l’écran :

- seules les 3 premières permissions sont affichées sur l’accueil ;
- un lien **Toutes →** mène vers la page complète Permissions ;
- seuls les 3 prochains rendez-vous sont affichés sur l’accueil ;
- le reste reste disponible dans Planning.

## Tournée et créneaux externes

Ces fonctions sont conservées mais repliées par défaut :

- **Passages par étage** devient un panneau ouvrable ;
- **Ajouter un créneau externe** devient un panneau ouvrable.

Aucune fonctionnalité n’est supprimée, mais elles ne prennent plus de place tant que le médecin n’en a pas besoin.

## Responsive

Sur mobile :

- sidebar masquée ;
- dock principal fixe en bas ;
- header réduit ;
- barre À portée de main défilable horizontalement ;
- spécialité adaptée sur une ou deux lignes selon la largeur ;
- cartes Permissions et Planning passent sur une seule colonne.

## Fichiers modifiés

- `components/portal-shell.tsx`
- `components/staff-dashboard.tsx`
- `app/doctor-epure.css`
- `app/layout.tsx`

## Sauvegarde

État précédent conservé dans :

`backup-doctor-epure-20260915`

## Validation

- Build Next.js : à valider avant bascule production.
- TypeScript / lint : à valider avant bascule production.
- Déploiement Vercel preview : à valider avant bascule production.
