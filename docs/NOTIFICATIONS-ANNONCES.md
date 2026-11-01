# Notifications et annonces

## Lecture du chat

- Le chat ferme est demonte : il ne lit pas les messages en arriere-plan.
- La lecture exige un fil rendu, un document visible et le focus du navigateur.
- La RPC `mark_conversation_messages_read` borne la lecture aux messages charges.
- Chaque utilisateur garde son propre `last_read_at`. La lecture d'un collaborateur ne retire pas les badges du dentiste ou des autres membres du labo.
- Les notifications navigateur sont regroupees par conversation et fermees quand le compteur devient nul. Leur affichage exige la permission du navigateur.

## Demandes de contact

- Boite admin dediee : `/admin/contacts`, distincte du chat des dentistes.
- Une demande ouverte avec le navigateur visible et au premier plan devient lue ; elle reste a traiter.
- Le bouton "Marquer comme traitee" retire la demande de la file a traiter. "Remettre a traiter" conserve la premiere lecture.
- "Repondre par email" ouvre le logiciel de messagerie ; l'application ne peut pas confirmer cet envoi et ne classe donc pas automatiquement la demande.
- Le tableau de bord distingue les demandes non lues et a traiter, avec les liens filtres correspondants et sans double comptage dans le total des actions.
- La lecture est partagee entre les admins du labo, contrairement au chat dont la lecture reste individuelle.
- Les demandes historiques n'avaient pas de suivi de lecture : aucune date passee n'est inventee. Une ancienne demande non traitee reste non lue jusqu'a son ouverture dans cette boite.
- Premiere lecture et traitement sont horodates avec l'admin concerne. Les actions `lire`, `traiter`, `reouvrir` passent par `admin_contact_action`, reservee aux admins actifs et approuves.
- La boite affiche les 500 demandes les plus recentes ; les compteurs du tableau de bord portent sur toute la base. Les metadonnees IP et user-agent ne sont pas exposees dans l'interface.

## Preferences email

- Dentiste : Mon profil. Admin : Parametres. Collaborateur : Atelier > Mes parametres.
- Les categories de fonctionnement sont actives par defaut. Les promotions sont desactivees par defaut et leur activation enregistre un horodatage de consentement.
- Les emails de securite du compte restent independants des preferences.

## Annonces

- Admin : `/admin/annonces`. Dentiste : tableau de bord et `/dashboard/annonces`.
- Brouillon, publication immediate/programmee, date de fin, archivage, image/PDF protege (5 Mo maximum).
- Les annonces actives sont visibles a tous les dentistes approuves. La lecture est individuelle et laisse l'annonce dans l'historique.
- L'option d'envoi email respecte `email_annonce` ou `email_promotion`. Une annonce deja lue, archivee ou terminee ne genere pas d'email.
- Les annonces publiees ne sont plus modifiables : creer une nouvelle annonce pour une correction qui doit renotifier les destinataires.
- L'editeur Tiptap propose gras, italique, souligne, barre, titres, listes, citations, liens, images dans le texte et annuler/retablir.
- L'apercu dentiste utilise le meme rendu que l'annonce. Les images integrees restent a leur position dans le texte ; la piece jointe se place en bas.
- Les categories peuvent etre ajoutees, renommees, desactivees et reactivees. Leur type email est fixe a la creation pour ne pas contourner le consentement commercial.
- Le contenu riche est valide et stocke en JSON ; seuls les liens autorises et les images du stockage prive sont rendus. Les anciennes annonces en texte simple restent compatibles.

## Envoi differe

- `notification_email_jobs` regroupe les nouveaux messages pendant cinq minutes et annule l'email si les messages sont lus/supprimes.
- Le worker Supabase `notification-email-worker` est appele chaque minute par pg_cron/pg_net, avec un secret dedie stocke dans Vault.
- Verrouillage par bail et cle d'idempotence Resend par job. Jusqu'a cinq essais en cas d'erreur.
- Le worker verifie a nouveau les droits, preferences et lectures avant l'envoi. Un email deja envoye ne peut pas etre retire de la boite du destinataire.
- Les pieces jointes d'annonce sont accessibles dans l'espace authentifie ; elles ne sont pas envoyees comme fichiers publics.

## Configuration requise

- Secrets Supabase : `RESEND_API_KEY`, `EMAIL_FROM` (domaine verifie), `APP_URL` (URL HTTPS de l'application), `NOTIFICATION_WORKER_SECRET`.
- Aucun secret n'est a communiquer dans le chat. Les saisir directement dans les secrets Supabase ou le terminal.
- Ajouter aussi Resend et l'expediteur a l'environnement du site pour les emails transactionnels existants.
- Le SMTP configure dans Supabase Auth est un circuit distinct : il ne fournit pas automatiquement la cle API au worker. Expediteur documente : `DECERF LAB <noreply@notifications.decerf-lab.be>`.
- Sans cle Resend, le worker repond 503 sans consommer les jobs : les envois reels restent bloques.
- Mettre en ligne les nouvelles routes du site avant de compter sur les liens d'annonces contenus dans les emails.

## Verification

- Tests PostgreSQL isoles : droits par role, lecture bornee et individuelle, regroupement, annulation apres lecture, annonces futures/brouillons invisibles et promotion sans consentement refusee.
- Tests worker avec fournisseur simule : HTML echappe, URL selon le role et idempotence stable.
- Aucun email de test ne doit etre envoye aux dentistes sans demande explicite.