# Mémo — Intégration Billit / Peppol

**État au 25 octobre 2026**

**Mise à jour au 30 octobre 2026**

- Le stockage des jetons OAuth chiffrés a été ajouté dans `billit_connections`; la migration `20261030120000_billit_sandbox_connection.sql` est appliquée au projet Supabase lié.
- Le panneau de paramètres reconnaît une API key Sandbox ou une connexion OAuth, et permet d’envoyer une facture technique fictive au Sandbox. Aucun flux métier de facture réelle n’envoie encore vers Peppol.
- Le test peut relire l’`OrderStatus`, `IsSent` et l’indicateur de livraison via `GET /v1/orders/{OrderID}`. Le polling est manuel dans le panneau; aucun webhook n’est configuré.
- Le connecteur accepte aussi l’API key Billit privée (non commerciale) : headers `ApiKey` et `partyID`. La clé API et le Party ID doivent provenir du même compte Sandbox.
- Le code impose une URL HTTPS publique identique à l’origine du callback. Pour le domaine de production après déploiement, l’URL prévue est `https://www.decerf-lab.be/api/admin/billit/callback`.

**Test API key Sandbox au 31 octobre 2026**

- La clé API et le Party ID configurés localement ont permis la création réelle d’une facture fictive Billit (`OrderID 3488116`). La clé n’est pas enregistrée dans ce mémo.
- Billit a refusé la commande `commands/send` car le destinataire fictif n’est pas actif sur Peppol. Le GET de statut indique `OrderStatus: ToSend`, `IsSent: false`, `IsDocumentDelivered: false`.
- Ne pas relancer ce test avec le même faux destinataire. Pour valider le transport, utiliser un destinataire de test Sandbox inscrit sur Peppol ou celui recommandé par Billit.

## Point d’arrêt

Ne pas connecter Billit Production ni envoyer de facture réelle avant d’avoir le numéro BCE, le statut TVA confirmé et une intégration testée en Sandbox. Reprendre ce mémo dès que le BCE est attribué.

## État actuel de Decerf Lab

- Aucune connexion API Billit n’est encore implémentée. Aucune facture n’est envoyée à Billit ou à Peppol.
- Les factures sont créées, calculées, validées et produites en PDF dans Decerf Lab.
- Le catalogue conserve un taux et une catégorie TVA par service, avec surcharge possible par option.
- Le réglage « Activer la franchise de TVA » agit immédiatement sur les nouveaux brouillons : activé = 0 % et catégorie exonérée; désactivé = taux du catalogue. Les brouillons et factures déjà créés gardent leur snapshot.
- Le régime prévu au démarrage est la franchise, à confirmer avec le comptable et Billit avant émission réelle.

## Étapes à la réception du BCE

1. Confirmer auprès du comptable le statut TVA exact, la date d’effet et la mention légale applicable à la franchise belge.
2. Compléter les paramètres identité du labo : BCE, numéro TVA si applicable, téléphone, adresse et email de contact.
3. Créer un compte **Billit Sandbox** et obtenir le Party ID du laboratoire. La documentation Billit indique qu’un email et un numéro TVA valide sont demandés à l’inscription; si la TVA n’est pas encore activée, demander au support Billit si l’ouverture Sandbox est possible avec le BCE ou une autre procédure.
4. Créer une URL de retour HTTPS publique pour OAuth (staging recommandé; Billit indique que localhost n’est pas accepté comme redirect URI).
5. Demander à Billit les identifiants OAuth Sandbox en fournissant les quatre éléments requis : Party ID, URL de retour, nom de l’application et environnement Sandbox.
6. Stocker les identifiants uniquement dans les variables d’environnement privées du serveur. Ne jamais les envoyer dans le chat, le code source ou le navigateur.
	Variables pour API key : `BILLIT_API_KEY` et `BILLIT_PARTY_ID`.
	Variables si OAuth est choisi : `BILLIT_CLIENT_ID`, `BILLIT_CLIENT_SECRET`, `BILLIT_PARTY_ID`, `BILLIT_REDIRECT_URI` et `BILLIT_TOKEN_ENCRYPTION_KEY`.
	`BILLIT_TOKEN_ENCRYPTION_KEY` doit être une clé aléatoire Base64 de 32 octets; générer avec `openssl rand -base64 32`. Configurer ces variables dans l’environnement serveur déployé, jamais avec le préfixe `NEXT_PUBLIC_`.
7. Implémenter l’authentification OAuth côté serveur, le renouvellement sécurisé des tokens et la déconnexion/révocation d’accès.
8. Construire le mapping de facture Decerf Lab vers Billit `/v1/orders` : parties, BCE/TVA, adresses, lignes, prix, références, échéance, catégories et motifs TVA.
9. Faire confirmer par Billit le `VentilationCode` exact et le `TaxExemptionReason/Code` pour la franchise **belge**. Ne pas copier les codes français `VATEX-FR-FRANCHISE` de leur page française et ne pas assimiler le code 24 au régime franchise (leur tableau belge le décrit comme marge).
10. Envoyer uniquement des factures de test fictives via l’API Sandbox, puis vérifier la réponse, le PDF/UBL, le statut et les erreurs de réception Peppol. Ajouter une clé d’idempotence ou une référence externe pour éviter les doublons.
11. Après tests et validation comptable, créer/faire vérifier le compte Production et demander les identifiants OAuth Production séparés. L’URL Production est `https://api.billit.be`; l’API Sandbox est `https://api.sandbox.billit.be`. Les appels Production ont des effets réels.

## Documentation Billit

- [Sandbox vs Production](https://docs.billit.be/docs/sandbox-vs-production-1)
- [Developer onboarding](https://docs.billit.be/docs/developer-onboarding-workflow)
- [OAuth — démarrage](https://docs.billit.be/docs/how-do-i-get-started-with-oauth)
- [Demander Client ID et Secret](https://docs.billit.be/docs/how-do-i-request-oauth-client-id-and-secret)
- [Quick start API](https://docs.billit.be/docs/quick-start)
- [Créer une facture](https://docs.billit.be/docs/create-first-invoice)
- [Envoyer une facture](https://docs.billit.be/docs/sending-your-first-invoice)
- [Lire statut et informations](https://docs.billit.be/docs/retrieve-invoice-information)
- [Codes TVA / VentilationCode](https://docs.billit.be/docs/ventilation-codes)
- [Activation Production](https://docs.billit.be/docs/activate-on-production-environment)

## Informations à fournir à la reprise

- Numéro BCE attribué et date d’activation
- Statut TVA confirmé, numéro TVA s’il existe, et date de début de franchise confirmée
- Party ID Billit Sandbox
- URL HTTPS de retour OAuth/staging
- Confirmation Billit du mapping belge de franchise (code de ventilation et mention d’exonération)

**Ne jamais transmettre Client Secret, API key, access token ou refresh token dans ce mémo ni dans le chat.**

## Parcours actuellement implémenté

- Connexion réservée à l’administrateur depuis Paramètres > Facturation électronique Peppol.
- Vérification de l’état OAuth et déconnexion.
- API key privée envoyée dans le header `ApiKey`, avec le compte ciblé dans `partyID`; en alternative, échange/renouvellement OAuth côté serveur avec access token et refresh token chiffrés en AES-256-GCM dans une table inaccessible à `anon` et `authenticated`.
- Route de test disponible dans le code : elle crée une facture de 1 EUR avec destinataire fictif, demande son envoi Peppol dans le Sandbox, puis permet de relire son statut avec l’OrderID. Elle n’utilise aucun client ni aucune facture Decerf Lab.
- L’API et l’URL sont fixées à Sandbox dans le code. L’activation de Production nécessite une modification explicite, une validation métier et des identifiants Production séparés.

Ne pas cliquer sur le test Sandbox avant que Billit ait confirmé que le compte et l’envoi test sont prêts. Un refus de réseau ou de validation reste possible sur Sandbox.
