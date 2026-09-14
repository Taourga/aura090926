# AURA — scénario investisseur 15/09/2026

## Objectif

Présenter AURA en 5 à 7 minutes comme une plateforme d’orchestration du séjour patient, sans ouvrir des écrans secondaires ni modifier la configuration de la démo.

## Message à faire passer

AURA relie cinq dimensions dans un même parcours : **Patient → Soins → Accueil → Opérations → Direction**.

AURA ne remplace pas le dossier médical. Il organise et trace le quotidien du séjour autour des informations et décisions qui circulent encore trop souvent par téléphone, papier ou fichiers séparés.

## Parcours recommandé

1. **Accueil public / Démo guidée**
   - présenter le problème ;
   - montrer les rôles ;
   - rappeler que toutes les données sont fictives.

2. **Patient — Camille Durand**
   - tableau de bord ;
   - planning ;
   - permission ;
   - visite ;
   - messagerie.

3. **Médecin**
   - liste patients ;
   - ouvrir Camille ;
   - montrer les liens contextuels Message / Planning / Permissions ;
   - illustrer une décision tracée.

4. **Accueil / opérations**
   - mouvements de permission ;
   - visites ;
   - sortie / hôtellerie si utile.

5. **Direction / Admin**
   - Pulse ;
   - Pilotage ROI ;
   - administration en lecture seule ;
   - montrer les modules actifs et le principe Country Pack / multi-établissement.

## Règles de présentation

- ne pas créer de nouveaux comptes pendant la réunion ;
- ne pas modifier Country Pack, rôles, modules ou établissement ;
- ne pas utiliser l’invitation patient par e-mail ;
- rester sur les quatre patients fictifs actifs ;
- si une question sort du scénario, répondre puis revenir au parcours principal ;
- ne jamais présenter AURA comme certifié HDS ou comme dossier médical ;
- parler de sécurité par conception, isolation multi-établissement, RLS, audit et trajectoire de conformité.

## État de verrouillage

- branche de développement démo : `aurademo` ;
- branche de restauration : `backup-140926-aura-demo` ;
- branche investisseur figée : `investor-demo-150926` ;
- données de présentation : fictives ;
- administration structurante : lecture seule dans l’interface démo ;
- accès anonyme aux tables/RPC métier : retiré ;
- RLS : activée sur toutes les tables `public` ;
- e-mail transactionnel : hors scénario tant que le domaine n’est pas validé.

## Avant la réunion

Vérifier : page publique, `/demo`, connexion Patient, connexion Médecin, connexion Admin, Pulse, permissions, messages, admin en lecture seule et absence d’erreur Vercel.

Les mots de passe et secrets ne doivent jamais être ajoutés à ce fichier ni au dépôt GitHub.
