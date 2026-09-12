# AURA — Guide simple des LOTS 0 à 4

Date de référence : 12 septembre 2026

Ce document est écrit pour quelqu’un qui ne connaît pas GitHub, Vercel, Supabase ou le développement web. L’objectif est de pouvoir comprendre où en est AURA, ce qui a déjà été fait, ce qui est en production et ce qui reste à valider avant d’utiliser de vraies données patient.

---

## 1. AURA en une phrase

AURA est une plateforme qui organise le séjour du patient dans une clinique : planning, activités, permissions, présence, visites, informations, mouvements d’entrée/sortie et coordination des équipes.

AURA ne cherche pas à remplacer le dossier médical de la clinique. Il agit comme une couche opérationnelle entre le patient, les équipes et les logiciels déjà utilisés par l’établissement.

---

## 2. Les quatre outils à connaître

### GitHub = le coffre-fort du code
GitHub conserve le code d’AURA et son historique. On peut revenir en arrière si une modification pose problème.

Deux branches sont importantes :
- `master` : la version actuellement reliée à la production publique.
- `stabilization/pilot-ready` : la version sur laquelle nous préparons AURA RC1, la version destinée au pilote.

Une branche est simplement une copie de travail du code. On peut améliorer cette copie sans modifier la version publique.

### Vercel = l’hébergement du site web
Vercel transforme le code GitHub en site accessible sur internet.

Il existe deux types de déploiements :
- Production : ce que voit le public.
- Preview : une version de test générée automatiquement pour vérifier les changements avant production.

### Supabase = la base de données et l’authentification
Supabase contient notamment :
- les comptes utilisateurs ;
- les établissements ;
- les rôles ;
- les patients ;
- les séjours ;
- les permissions ;
- les rendez-vous ;
- les activités ;
- les règles de sécurité d’accès aux données.

### GitHub Actions / CI = le contrôle qualité automatique
À chaque modification, une série de vérifications automatiques est lancée :
1. qualité du code ;
2. vérification TypeScript ;
3. compilation Next.js ;
4. démarrage réel de l’application ;
5. test de l’accueil, de la connexion et de `/api/health`.

Si un contrôle échoue, la modification ne doit pas être envoyée en production.

---

## 3. Les URL : est-ce qu’elles changent ?

### Production actuelle
`https://aura090926.vercel.app/`

Cette adresse ne change pas tant que la branche de stabilisation n’est pas fusionnée dans `master` et promue en production.

### Preview / staging web
La branche `stabilization/pilot-ready` produit automatiquement des previews. Une URL technique différente peut être créée à chaque commit.

Vercel fournit aussi une adresse de branche stable :
`https://aura090926-git-stabilization-pilot-ready-wilyan.vercel.app/`

Cette adresse peut demander une authentification Vercel selon les réglages du compte. Elle sert au contrôle interne, pas au client final.

### Plus tard, pour vendre
Le mieux sera d’utiliser un domaine propre, par exemple :
- `www.aura-sante.com` : site de présentation ;
- `app.aura-sante.com` : application ;
- `demo.aura-sante.com` : démo commerciale, si utile.

Aucun changement de domaine n’est nécessaire pour terminer RC1.

---

# LOT 0 — FREEZE ET SNAPSHOT

## Pourquoi ce lot ?
Avant de modifier un produit, il faut être certain de pouvoir revenir à l’état précédent.

## Ce qui a été fait
- version de référence identifiée ;
- snapshot créé ;
- branche `stabilization/pilot-ready` créée ;
- `master` laissé intact ;
- PR de stabilisation ouverte.

## En langage simple
On a fait une photographie d’AURA avant les gros travaux et on travaille maintenant sur une copie contrôlée.

## État
TERMINÉ.

---

# LOT 1 — SÉCURITÉ P0 ET CONTRÔLE QUALITÉ

## Pourquoi ce lot ?
Un logiciel de clinique doit empêcher qu’un utilisateur voie des informations qu’il ne devrait pas voir.

## Ce qui a été fait
- correction de règles RLS trop larges ;
- restriction d’accès aux noms/e-mails patients ;
- durcissement des nouvelles fonctions SQL ;
- mise en place de la CI automatique ;
- correction des erreurs lint/TypeScript/build détectées par la CI.

## RLS, c’est quoi ?
RLS signifie Row Level Security. C’est un verrou placé directement dans la base de données. Même si une page de l’application est mal programmée, la base refuse une donnée si l’utilisateur n’a pas le droit de la lire.

## État
TERMINÉ, avec audit continu avant vraies données patient.

---

# LOT 2 — MULTI-CLINIQUE

## Pourquoi ce lot ?
Pour vendre AURA à plusieurs cliniques, chaque clinique doit avoir son espace sans jamais voir les données d’une autre.

## Ce qui a été créé
- Organisations ;
- Établissements / cliniques ;
- Adhésions des utilisateurs à une clinique ;
- Rôle par clinique ;
- Clinique active ;
- `facility_id` sur les données métier ;
- RLS par établissement ;
- RPC sécurisées par établissement ;
- fuseau horaire par clinique ;
- contraintes de chambres, menus et plannings adaptées au multi-clinique.

## Exemple simple
Un utilisateur peut être :
- médecin dans la Clinique A ;
- administrateur dans la Clinique B.

Les données de A et B restent séparées au niveau de la base.

## Test réalisé
Une seconde clinique temporaire a été créée dans une transaction de test. Un utilisateur de la clinique A ne pouvait pas voir la donnée sentinelle de la clinique B. Le test a ensuite été annulé automatiquement.

## État
TERMINÉ au niveau architecture et sécurité.

---

# LOT 3 — AURA CORE, AURA FR ET AURA DZ

## Pourquoi ce lot ?
Il ne faut pas créer deux logiciels différents pour la France et l’Algérie. Ce serait coûteux et difficile à maintenir.

## Architecture retenue
AURA Core = le moteur commun.

Au-dessus :
- AURA FR = configuration France ;
- AURA DZ = configuration Algérie.

## Ce qui est configurable par établissement
- préavis d’une permission ;
- horaires de visite ;
- durée de visite ;
- nombre de visiteurs ;
- nombre de visites par jour ;
- horaires de repas ;
- modules activés ;
- locale ;
- fuseau horaire ;
- devise ;
- fonctionnalités pays.

## Presets actuels
### CORE
- 48 h de préavis ;
- Europe/Paris ;
- sport activé ;
- hôtellerie activée.

### FR
- 48 h de préavis ;
- Europe/Paris ;
- FHIR marqué comme capacité à préparer ;
- sport désactivé par défaut ;
- hôtellerie désactivée par défaut.

### DZ
- 24 h de préavis ;
- Africa/Algiers ;
- arabe/RTL préparés dans la configuration ;
- sport désactivé par défaut ;
- hôtellerie activée.

Important : un flag comme `FHIR`, `SMS`, `OTP` ou `HDS required` indique une capacité ou une exigence de configuration. Il ne signifie pas qu’une certification, un hébergement ou une intégration externe est déjà finalisé.

## État
TERMINÉ pour l’architecture produit et la configuration.

---

# LOT 4 — PILOT HARDENING, EXPLOITATION ET UX

## Objectif
Passer d’un produit techniquement fonctionnel à un produit qui peut être présenté, testé et préparé pour un vrai pilote clinique.

## 4.1 Sécurité web
Ajout de headers de sécurité :
- blocage du sniffing de type MIME ;
- protection contre l’affichage d’AURA dans une iframe malveillante ;
- politique de référent ;
- désactivation navigateur des permissions caméra, micro, géolocalisation et paiement tant qu’elles ne sont pas nécessaires ;
- masquage du header technique `X-Powered-By`.

## 4.2 Sécurité Supabase
L’audit LOT 4 a détecté des helpers `SECURITY DEFINER` encore exécutables sans connexion.

Ils ont été retirés du rôle anonyme. La fonction interne de synchronisation legacy n’est plus directement exécutable par un utilisateur.

Les RPC métier destinées aux utilisateurs authentifiés restent accessibles uniquement lorsqu’elles ont une raison fonctionnelle et effectuent leurs propres contrôles de rôle/clinique.

## 4.3 Performance
Des index ont été ajoutés sur les chemins les plus importants du pilote :
- patient → activité ;
- patient → rendez-vous ;
- créateur de rendez-vous ;
- acteur d’audit ;
- unité d’un séjour ;
- patient → permission ;
- permission → séjour ;
- clinique active d’un profil ;
- auteur d’une information ;
- créateur d’une admission planifiée.

Les autres avertissements Supabase de performance restent enregistrés comme P1. Ils ne sont pas des erreurs de sécurité et seront optimisés selon les volumes réels du pilote.

## 4.4 Endpoint de santé
Nouvelle adresse interne :
`/api/health`

Elle indique :
- si l’application a les variables essentielles ;
- l’environnement ;
- la release ;
- l’heure du contrôle.

Elle ne renvoie pas de mot de passe ni de secret.

## 4.5 CI améliorée
Après la compilation, la CI démarre réellement AURA puis teste :
- `/` ;
- `/login` ;
- `/api/health`.

## 4.6 Ergonomie et design
Une couche visuelle simplifiée a été ajoutée sans bibliothèque supplémentaire :
- police système moderne ;
- contraste et espaces harmonisés ;
- boutons plus simples ;
- cartes plus lisibles ;
- navigation raccourcie ;
- page de connexion plus claire ;
- page publique transformée en vraie présentation produit ;
- responsive mobile conservé.

La navigation utilise maintenant des mots plus simples :
- Vue d’ensemble → Accueil ;
- Entrées & sorties → Séjours ;
- Messagerie → Messages ;
- Informations → Infos ;
- Hôtellerie & ménage → Hôtellerie ;
- Administration → Réglages.

## 4.7 Landing page commerciale
La page d’accueil explique maintenant AURA sans jargon technique :
- ce que fait le produit ;
- qui l’utilise ;
- le parcours Patient → Soins → Accueil → Opérations → Direction ;
- la distinction AURA Core / FR / DZ ;
- l’aperçu du fonctionnement du séjour.

Aucune statistique commerciale inventée n’a été ajoutée.

## 4.8 Monitoring
La production doit être surveillée via :
- statut HTTP ;
- Vercel Runtime Logs ;
- endpoint `/api/health` après promotion de RC1 ;
- alertes automatiques externes si configurées.

## 4.9 Staging
### Staging web
Disponible sans coût supplémentaire via la branche Vercel de preview.

### Staging base de données Supabase
Pas encore créé au moment de ce document car Supabase facture la branche de développement. Le coût constaté le 12/09/2026 est de 0,01344 USD/heure.

Cette création nécessite une validation explicite du coût.

## État LOT 4
- Hardening applicatif : fait ;
- UX/UI : fait ;
- CI runtime smoke test : fait ;
- RPC anonymes : durcis ;
- index critiques : ajoutés ;
- documentation : faite ;
- staging web : disponible ;
- staging Supabase séparé : en attente d’accord de coût ;
- protection mots de passe compromis Supabase : à activer dans le dashboard Supabase si le connecteur ne l’expose pas ;
- protection de `master` GitHub : à activer dans les réglages GitHub si le connecteur d’application n’a pas les droits admin ;
- test réel de restauration backup : à effectuer avant le premier pilote avec données réelles.

---

# 4. Ce qu’il ne faut PAS faire maintenant

Ne pas :
- créer plusieurs cliniques réelles tant que la compatibilité legacy menus/sport n’est pas retirée après promotion RC1 ;
- charger de vraies données patient ;
- contourner une CI rouge ;
- modifier directement `master` ;
- supprimer une migration appliquée ;
- créer deux dépôts AURA FR / AURA DZ séparés.

---

# 5. La couche de compatibilité legacy

La production publique utilise encore l’ancien code `master`, alors que Supabase a déjà été modernisé.

Une couche temporaire maintient la compatibilité pour :
- modification des rôles depuis l’ancienne interface ;
- ancien upsert des menus ;
- ancien upsert du planning sport.

Les index temporaires sont :
- `menu_items_legacy_service_date_meal_key` ;
- `sport_room_schedules_legacy_schedule_date_key`.

Le trigger temporaire est :
- `sync_legacy_profile_access_to_membership`.

Après promotion de la nouvelle application, ces éléments devront être retirés avant de créer plusieurs cliniques réelles utilisant les mêmes dates de menus/plannings.

---

# 6. Comment se déroule une mise en production AURA

1. On travaille sur `stabilization/pilot-ready`.
2. GitHub lance automatiquement la CI.
3. Si tout est vert, Vercel crée un preview.
4. On vérifie le preview.
5. On vérifie Supabase et les migrations.
6. On fait un snapshot/backup avant changement important.
7. On fusionne la PR dans `master`.
8. Vercel crée le déploiement production.
9. On vérifie l’accueil, la connexion et `/api/health`.
10. On surveille les logs.
11. Si nécessaire, on rollback le déploiement applicatif et on suit la procédure DB prévue pour la migration concernée.

---

# 7. Quand AURA sera réellement “Pilot Ready” ?

La gate finale exige au minimum :
- CI entièrement verte ;
- preview validé ;
- sécurité Supabase revue ;
- mots de passe compromis bloqués ;
- stratégie MFA définie pour les professionnels ;
- staging DB ou procédure équivalente validée ;
- sauvegarde et restauration vérifiées ;
- monitoring actif ;
- procédure incident/rollback prête ;
- données de démonstration séparées des vraies données ;
- conformité pays validée avant traitement de données de santé réelles.

Pour la France, cela inclut le cadrage HDS/RGPD applicable au déploiement réel.

Pour l’Algérie, cela inclut le cadrage loi 18-07 / évolutions applicables / ANPDP et le choix d’hébergement approprié.

---

# 8. Résumé en une minute

- LOT 0 : on a sauvegardé et isolé notre travail.
- LOT 1 : on a sécurisé les accès de base et mis des contrôles automatiques.
- LOT 2 : AURA est devenu multi-clinique.
- LOT 3 : AURA Core peut se configurer en AURA FR ou AURA DZ.
- LOT 4 : on durcit, teste, simplifie et prépare le produit pour être présenté puis piloté.

La production publique reste protégée. La nouvelle version avance sur la branche `stabilization/pilot-ready` jusqu’à la validation finale RC1.
