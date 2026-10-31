# Mémo — Intégration Billit / Peppol

**État vérifié au 31 octobre 2026**

## État du système

- La migration de connexion privée et les migrations de synchronisation facture/avoir sont appliquées au Supabase distant.
- Le projet local utilise une API key et un Party ID Sandbox. Les variables de Production, l’activation Production et le code belge de franchise sont absents/non activés.
- Les factures Decerf restent la source du brouillon, des lignes, des montants et du solde local. Quand l’envoi Production est explicitement activé, la validation crée l’Order Billit, l’envoie à Peppol, récupère le PDF Billit et le conserve dans le stockage privé des factures.
- Le dashboard admin et le dashboard dentiste peuvent actualiser manuellement le statut Billit, la livraison et le solde. Les virements saisis par l’admin sont transmis à Billit uniquement si la facture et la configuration sont en Production.
- Le dashboard admin permet de créer un brouillon de facture libre (ex. produit hors catalogue) pour un dentiste. Il suit le même parcours de validation que les factures issues de commandes.
- Le dashboard admin permet de préparer un avoir total. Son émission est réservée à une facture réellement émise par Billit et est bloquée tant que Production n’est pas prête. Les avoirs partiels ne sont pas encore pris en charge.
- Les rappels automatiques ne sont pas implémentés dans Decerf. Le modèle Billit expose des champs de rappel, mais la configuration et le calendrier des relances doivent être confirmés dans le compte Billit. Il faudra choisir un seul système de relance pour éviter les doublons.

## Résultats Sandbox

- Facture fictive `DL-SANDBOX-1793403864498`, Billit `OrderID 3488116` : créée via API. Après action manuelle dans Billit, `IsSent: true`, `OrderStatus: ToPay`, mais `IsDocumentDelivered: false`.
- Note de crédit fictive `DL-CN-SANDBOX-1793407190609`, Billit `OrderID 3488319`, liée à la facture test : créée via API ; envoi Peppol refusé car le destinataire fictif n’est pas inscrit/actif sur Peppol. Elle reste `ToSend` et non livrée.
- Les deux tests utilisent un destinataire fictif et ne figurent pas dans les factures Decerf.

## Rappels

- Decerf envoie actuellement l’email d’émission initial, mais ne planifie pas les relances d’échéance ou d’impayé.
- Billit peut exposer `LastReminder` et `RemindersSent` dans les données de facture ; le réglage de relance n’est ni configuré ni synchronisé ici.
- Avant Production, confirmer avec Billit le réglage de rappel automatique du compte et décider si Billit ou Decerf en est l’unique expéditeur. Ne pas activer les deux sans coordination.

## Conditions avant Production

1. Confirmer avec le comptable le statut TVA, la date d’effet, la mention légale et le `VentilationCode`/`TaxExemptionReasonCode` belge exact pour la franchise. Le code `24` indiqué comme « marge » ne doit pas servir de code de franchise.
2. Terminer les essais Sandbox avec un destinataire Sandbox réellement inscrit à Peppol : facture standard, franchise après validation du code, note de crédit, livraison, PDF/UBL, paiement partiel et paiement complet.
3. Vérifier les relances dans Billit et choisir le système responsable pour éviter les emails en double.
4. Faire valider le compte MyBillit Production et son inscription Peppol si requise ; obtenir le Party ID et la clé API Production séparés.
5. Déployer la version et configurer les secrets uniquement dans l’environnement serveur sécurisé. Ne jamais copier les secrets dans le chat, le code ou une variable `NEXT_PUBLIC_`.
6. Après validation comptable et tests, activer explicitement les variables Production listées ci-dessous. Toute facture envoyée via `https://api.billit.be` est une vraie facture.

Variables Production : `BILLIT_ENV=production`, `BILLIT_PRODUCTION_API_KEY`, `BILLIT_PRODUCTION_PARTY_ID`, `BILLIT_ENABLE_PRODUCTION=true`, `BILLIT_SEND_REAL_INVOICES=true` et, après confirmation écrite par Billit, `BILLIT_FRANCHISE_VENTILATION_CODE`.

La Production reste verrouillée tant que ces variables ne sont pas configurées. Le Sandbox utilise `https://api.sandbox.billit.be`; la Production utilise `https://api.billit.be`.

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
- API key privée envoyée dans le header `ApiKey`, avec le compte ciblé dans `partyID`; OAuth reste disponible en alternative avec tokens chiffrés et séparés par environnement.
- La validation d’un brouillon Decerf crée/envoie un Order Billit uniquement si Production est explicitement activée. La création recherche d’abord l’OrderNumber pour réduire les doublons en cas de retry.
- Les PDF Billit sont stockés dans le bucket privé et utilisés dans le dashboard/email quand le flux Production est actif; les statuts et soldes peuvent être synchronisés manuellement.
- L’admin peut préparer un brouillon de facture libre et un avoir total. L’émission de l’avoir exige une facture d’origine déjà présente et envoyée dans Billit Production.
- Le test Sandbox est distinct du flux métier et n’utilise que des données fictives. Les deux tests de livraison ont confirmé que le destinataire fictif n’est pas actif sur Peppol; aucune livraison réussie n’a encore été validée.
- La synchronisation est manuelle, sans webhook ni tâche planifiée. Aucun rappel d’échéance automatique n’est envoyé par Decerf.
- Le flux métier Production n’a pas encore été testé et reste verrouillé. Ne pas activer les variables Production avant confirmation comptable du mapping de franchise et un destinataire Sandbox Peppol actif.

Ne pas cliquer sur le test Sandbox avant que Billit ait confirmé que le compte et l’envoi test sont prêts. Un refus de réseau ou de validation reste possible sur Sandbox.
