# AURA — Tassadite — Inbox Patient & Header compact

Date : 15 septembre 2026

## Objectif

Simplifier encore l’espace Patient après validation visuelle de la version épurée :

- réduire davantage le bandeau blanc supérieur ;
- conserver les quatre accès principaux immédiatement visibles ;
- transformer la messagerie Patient en boîte de réception uniquement.

## Messagerie Patient

- Le patient conserve l’entrée **Messages** afin de lire les communications reçues.
- Le formulaire de rédaction et le bouton **Envoyer** sont supprimés de l’interface Patient.
- Le patient voit désormais la mention **Réception uniquement**.
- Le texte de la page précise qu’il s’agit des messages transmis par l’équipe.
- Le nombre de nouveaux messages est affiché dans un résumé compact.
- Les expéditeurs sont reconstruits à partir des conversations existantes et du `care_team_directory` de l’établissement actif.
- L’historique éventuellement existant reste visible ; aucun ancien message n’est supprimé.

## Sécurité messagerie

- `sendClinicalMessage` refuse explicitement tout envoi lorsque le rôle connecté est `patient`.
- La fonction PostgreSQL existante `send_clinical_message` refusait déjà le rôle Patient ; la règle est désormais également imposée au niveau de l’application.
- La fonction `mark_clinical_messages_read` autorise maintenant le rôle Patient uniquement pour marquer comme lus des messages dont il est lui-même destinataire dans son établissement actif.
- L’exécution anonyme de cette fonction a été révoquée ; seuls les utilisateurs authentifiés peuvent l’appeler.
- Aucun droit d’envoi n’a été ajouté au Patient.

## Header Patient

- Hauteur desktop ramenée à environ 40 px.
- Suppression de l’affichage du libellé secondaire `PATIENT` dans le header.
- Suppression de la chambre/date d’entrée dans le bandeau supérieur pour réduire la hauteur ; ces données restent disponibles ailleurs dans le parcours.
- Avatar, nom et déconnexion sont compactés sur une seule ligne.
- Bouton d’aide et cloche de messages réduits.
- Le dock principal commence immédiatement sous le header.
- Les quatre accès **Planning / Activités / Visites / Permissions** sont réduits en hauteur tout en restant clairement cliquables.
- Sur mobile, le header est encore plus compact ; le dock principal reste fixe en bas comme dans l’itération précédente.

## Fichiers modifiés / ajoutés

- `app/portal/messages/page.tsx`
- `components/clinical-messenger.tsx`
- `app/portal/messages/actions.ts`
- `app/patient-inbox-header.css`
- `app/layout.tsx`

## Base de données

Migration Supabase : `patient_inbox_read_only_messages`.

La migration modifie uniquement `mark_clinical_messages_read` pour accepter le rôle Patient avec contrôle strict : établissement actif, `recipient_id = auth.uid()`, expéditeur différent du patient et ligne non encore lue.

## Sauvegarde

État précédent conservé dans :

`backup-patient-inbox-header-20260915`

## Validation

- Compilation Next.js : OK.
- Vérification TypeScript / lint : OK.
- Génération des pages : OK.
- Déploiement preview Vercel : `READY`.
- Vérification SQL : utilisateur authentifié autorisé à exécuter `mark_clinical_messages_read`, rôle `anon` refusé.
- L’audit Supabase continue de signaler les avertissements généraux historiques concernant plusieurs fonctions `SECURITY DEFINER` du projet et la protection des mots de passe compromis ; ces avertissements relèvent du chantier sécurité global AURA.
