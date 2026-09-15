# AURA — Tassadite — Header, Visites et bloc Aujourd'hui

Date : 15 septembre 2026

## Objectif

Corriger trois points de lisibilité relevés sur l’espace Patient :

- empêcher le sélecteur de langue de masquer le bouton de déconnexion ;
- rendre l’action Visites plus explicite ;
- réduire fortement le bloc Aujourd’hui sur la page d’accueil, notamment lorsqu’aucun événement n’est prévu.

## Header Patient

- Hauteur desktop réduite de 40 px à environ 36 px.
- Les actions de droite réservent désormais une zone dédiée au sélecteur de langue.
- Le sélecteur de langue est compacté et repositionné dans cet espace réservé.
- Le bouton Déconnexion reste visible et cliquable sans chevauchement.
- Le nom, l’avatar, l’aide et la cloche sont légèrement compactés.
- Sur mobile, le header est ramené à environ 34 px avec la même règle anti-chevauchement.

## Visites

- Le raccourci principal reste intitulé **Visites**.
- Son sous-libellé devient **Ajouter une visite** au lieu de **Mes visiteurs**.
- La page Visites conserve son bouton principal **+ Ajouter une visite**.

## Accueil — Aujourd’hui

- Le bloc Aujourd’hui ne s’étire plus automatiquement à la hauteur de la colonne latérale.
- Lorsqu’aucun événement n’est prévu, le grand espace vide est supprimé.
- Marges, titre et texte d’état sont resserrés.
- Lorsqu’il existe des événements, la carte continue de grandir naturellement pour les afficher sans masquage.

## Fichiers modifiés

- `app/patient-inbox-header.css`
- `components/patient-chrome-enhancer.tsx`

## Sauvegarde

État précédent conservé dans :

`backup-header-visites-aujourdhui-20260915`

## Validation attendue

- Build Next.js / TypeScript / lint.
- Vérification du déploiement Vercel avant bascule sur `master` et `aurademo`.
