# Emails DECERF LAB

## Deux circuits distincts

- **Supabase Auth via SMTP Resend** : confirmation d'inscription, récupération de mot de passe, lien de connexion, changement d'email, invitation Auth.
- **Application via API Resend** : invitations métier, accès créé par le laboratoire, approbation, facturation, assignation et demandes RGPD.

Les modèles Auth ne sont pas déployés par Vercel ni par `supabase db push`. Les invitations métier du laboratoire utilisent leur propre modèle : changer « Invite user » dans Supabase ne modifie pas ces invitations.

## Installer les cinq modèles Auth

1. Ouvrir le projet de production dans le tableau de bord Supabase.
2. Aller dans **Authentication > Email > Templates** ou **Authentication > Email Templates**, selon l'interface.
3. Pour chaque entrée ci-dessous, renseigner l'objet et remplacer intégralement le contenu HTML par celui du fichier correspondant. Enregistrer chaque modèle.

| Entrée Supabase | Objet conseillé | Fichier HTML |
| --- | --- | --- |
| Reset password | Réinitialiser votre mot de passe \| DECERF LAB | [recovery.html](../supabase/templates/recovery.html) |
| Confirm signup | Confirmez votre adresse email \| DECERF LAB | [confirmation.html](../supabase/templates/confirmation.html) |
| Magic link | Votre lien de connexion \| DECERF LAB | [magic-link.html](../supabase/templates/magic-link.html) |
| Change email address | Confirmez votre changement d’email \| DECERF LAB | [email-change.html](../supabase/templates/email-change.html) |
| Invite user | Votre invitation \| DECERF LAB | [invite.html](../supabase/templates/invite.html) |

Conserver exactement `{{ .ConfirmationURL }}` : Supabase génère le lien personnel. Ne pas le remplacer par l'adresse du site. Les coordonnées des modèles Auth sont statiques : une modification de l'adresse du laboratoire nécessite de mettre à jour ces modèles également.

Les modèles de réauthentification par code et les alertes de sécurité Supabase sont distincts et ne sont pas couverts par ces cinq fichiers. Ne pas remplacer un modèle de code par un modèle de lien. Leur activation et leurs modèles doivent être examinés séparément si ces fonctions sont utilisées.

### SMTP et liens

- Hôte : `smtp.resend.com` ; port : `465` ; utilisateur : `resend`.
- Mot de passe SMTP : la clé Resend actuelle, saisie directement dans Supabase, jamais dans le dépôt ni dans une conversation.
- Expéditeur : `noreply@notifications.decerf-lab.be` ; nom : `DECERF LAB`.
- Site URL de production : `https://www.decerf-lab.be`. Conserver les URL de redirection nécessaires aux parcours existants ; ne pas ajouter de joker global.
- Le parcours de récupération existant demande la redirection `https://www.decerf-lab.be/api/auth/callback?next=/modifier-mot-de-passe` : vérifier qu'elle est autorisée avant le test.
- Désactiver le suivi des clics et des ouvertures pour les emails Auth s'il est activé dans Resend. La réécriture des liens et certains scanners de sécurité peuvent perturber les liens à usage unique.
- Conserver les MX Hostinger et le SPF existant du domaine principal : les envois Resend utilisent le sous-domaine déjà vérifié.

Les paramètres du fichier local `supabase/config.toml` ne prouvent pas la configuration du projet hébergé. Ne jamais afficher ou partager une configuration SMTP complète contenant sa clé.

## Vérifier les emails Auth

Après l'enregistrement du modèle de récupération, demander **une seule fois** un nouveau lien depuis « Mot de passe oublié » pour l'adresse admin. Vérifier logo, objet, texte, affichage mobile et indésirables. Recevoir le lien ne modifie pas le mot de passe ; ne le suivre que si un changement est réellement souhaité.

Pour les autres parcours, utiliser des comptes de test dédiés. Ne pas modifier l'adresse du compte admin ni créer un compte client réel uniquement pour tester un modèle. Un aperçu dans Supabase ne remplace pas un test complet du parcours ; les outils de prévisualisation ne doivent jamais diffuser un lien Auth réel.

Les deux tests initiaux (contact et récupération, avant installation de ces modèles) ont été reçus par l'admin. Ils valident le transport de ces deux emails, pas l'installation ni la réception des nouveaux modèles.

## Tester les notifications de l'application

Après déploiement des changements du site dans Vercel, ouvrir **Admin > Paramètres > Tests des emails**.

1. Sélectionner un modèle.
2. Cliquer sur **Envoyer un test**.
3. Vérifier la réception, le logo, la lisibilité et le classement éventuel en indésirables.
4. Répéter pour les autres modèles utiles, un par un.

Le destinataire est imposé côté serveur : l'adresse Auth de l'admin actif connecté. Les exemples sont marqués `[TEST DECERF LAB]`, utilisent des références fictives et ne créent ni ne modifient de compte, commande, facture, certificat ou message. Les boutons ne constituent pas une preuve de fonctionnement métier. Le journal email et le compteur de limitation sont les seules écritures liées à ces tests.

La limite est de 12 demandes par heure et par admin **sur une instance serveur** ; elle n'est pas un quota global garanti sur une infrastructure multi-instance. Le panneau ne permet pas d'envoyer une campagne ni de saisir un autre destinataire. Les tests explicites n'appliquent pas les préférences de notifications métier de l'admin.

Un résultat accepté indique que Resend a accepté l'envoi, pas que le destinataire l'a reçu. Contrôler aussi les événements dans Resend. Les envois sont consignés au mieux dans `email_log`, avec `payload.test = true` ; ce journal n'est pas un suivi de livraison ni un journal Supabase Auth.

En local, l'absence de `RESEND_API_KEY` désactive le bouton. Ne pas copier une clé dans le chat pour contourner ce blocage : utiliser l'environnement de production déjà configuré après déploiement, ou configurer une clé locale directement dans le fichier d'environnement ignoré par Git.

## Déclencheurs métier : état du code inspecté

Un déclencheur métier est l'action applicative qui décide d'envoyer un email : approuver un compte, terminer un travail ou assigner une tâche, par exemple. Tester un modèle ne prouve pas que cette action le déclenche correctement.

| Modèle | Appel applicatif identifié | Vérification réelle restant à faire |
| --- | --- | --- |
| Invitation | Invitation admin, création ou conversion de client | Invitation d'un compte de test dédié |
| Accès au compte | Création de client par l'admin | Création d'un compte de test dédié |
| Compte approuvé | Approbation d'un client | Approbation d'un compte de test |
| Facture à vérifier | Fin du travail via changement de statut admin | Cycle de commande de test |
| Facture émise | Validation ou renvoi de facture | Facture de test, sans numérotation réelle pour un simple test visuel |
| Assignation atelier | Assignation à une commande | Commande et collaborateur de test |
| Accusé RGPD | Dépôt d'une demande RGPD | Demande de test explicitement autorisée |
| Commande reçue | Aucun appel à ce modèle trouvé | Raccordement à définir avant test métier |
| Statut de commande | Aucun appel à ce modèle trouvé | Raccordement et statuts notifiables à définir |
| Nouveau message | Le formulaire de contact utilise ce libellé de journal ; pas d'appel trouvé au modèle de notification de discussion | Raccordement de la messagerie à définir |
| Certificat disponible | Aucun appel à ce modèle trouvé | Notifier lors du partage autorisé, pas à l'émission interne |

La migration email crée les préférences et le journal ; elle ne crée pas de déclencheurs SQL d'envoi. La présence d'un modèle n'implique donc pas son activation automatique. Aucun de ces parcours métier n'est déclenché par le panneau de démonstration.

## Références

- [Documentation Supabase des modèles Auth](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Modèles et transport applicatifs](../src/lib/email.ts)
- [Route de tests admin](../src/app/api/admin/emails/test/route.ts)