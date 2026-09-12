# AURA — Portes manuelles avant vraies données patient

Ces actions ne doivent pas être oubliées. Elles nécessitent soit une validation de coût, soit un réglage de compte/d’administration non accessible au code AURA.

## P0 — avant vraies données

- [ ] Valider ou refuser la création d’une branche Supabase de staging séparée. Coût constaté le 12/09/2026 : 0,01344 USD/heure.
- [ ] Activer Leaked Password Protection si le plan Supabase le permet. Supabase indique que cette protection est disponible sur Pro et plus.
- [ ] Fixer une politique de mot de passe forte dans les réglages Auth.
- [ ] Décider et tester la stratégie MFA pour les comptes professionnels avant généralisation clinique.
- [ ] Activer une règle GitHub protégeant `master` : PR obligatoire + CI verte obligatoire + pas de push direct.
- [ ] Vérifier qu’un backup récent existe juste avant la promotion RC1.
- [ ] Faire un test de restauration sur un environnement non-production avant d’utiliser de vraies données.
- [ ] Valider le cadre de conformité du pays avant les vraies données patient.

## Après promotion RC1

Une fois que `master` exécute la nouvelle application Pilot Ready :

- [ ] Vérifier `/`, `/login`, `/api/health`.
- [ ] Vérifier les Runtime Logs Vercel.
- [ ] Retirer les index de compatibilité legacy menus/sport avant de créer plusieurs cliniques réelles.
- [ ] Retirer le trigger de synchronisation legacy si l’ancien écran admin n’est plus utilisé.
- [ ] Rejouer un test Clinique A / Clinique B.

## Important France

Le stack de démonstration actuel ne doit pas être considéré automatiquement conforme HDS. Le choix d’hébergement, les contrats, le RGPD/AIPD et l’interopérabilité doivent être validés pour le contexte du pilote.

## Important Algérie

Le stack de démonstration actuel ne doit pas être utilisé automatiquement pour de vraies données de santé algériennes. Les obligations liées à la loi 18-07, à ses évolutions, à l’ANPDP et aux transferts/hébergements doivent être validées avant le pilote réel.
