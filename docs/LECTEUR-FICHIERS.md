# Lecteur de fichiers du labo

## Acces

- Admin : menu Lecteur de fichiers, `/admin/lecteur`.
- Collaborateur : icone Lecteur de fichiers de l'atelier, `/atelier/lecteur`.
- Commande/travail : Ouvrir le lecteur sur les fichiers compatibles. Les fichiers du bucket prive sont recuperes avec une URL signee.
- Chat : icone Ouvrir le lecteur sur une piece jointe compatible, pour admin/collaborateur.
- L'ouverture directe de fichiers locaux ne les transfere pas au serveur. Les uploads de commandes et de chat restent des operations distinctes.

## Formats

- STL binaire/ASCII, PLY, OBJ, GLB et glTF : rotation, zoom, vues, grille, filaire, recentrage.
- OBJ colore : charger aussi le MTL et ses textures, de preference dans un ZIP complet.
- glTF : charger ses fichiers BIN et textures associes. GLB autonome recommande. Les extensions de compression 3D qui demandent des decodeurs additionnels ne sont pas garanties dans cette version.
- ZIP : choix des fichiers apres extraction, sans ecriture sur le disque. Une archive renomme en TW/autre extension est ouverte seulement si sa signature est effectivement ZIP et si son contenu est compatible.
- JPEG, PNG, WebP, BMP : affichage natif du navigateur. PDF : lecteur PDF.js avec navigation de pages.
- DICOM : series, coupes/multiframe, zoom et fenetre/niveau, avec Cornerstone. Detection de l'en-tete DICM pour les images sans extension ; DICOMDIR et objets sans pixels ignores.
- TIFF, RAR, 7Z, TAR/gzip et maillages proprietaires fermes ne sont pas decodes ici. Un export standard reste necessaire.

## Limites Et Securite

- Fichier local : 100 Mo maximum ; selection totale : 200 Mo maximum.
- Archive : 500 entrees maximum, 200 Mo maximum apres decompression ; chemins dangereux et rapports de compression excessifs refuses.
- DICOM : 3000 coupes maximum au total. Les volumes CBCT lourds demandent une phase de validation/performance distincte ; pas de reconstruction MPR/volumique dans cette version.
- Commandes : la limite du bucket existant reste 50 Mo par fichier ; elle n'a pas ete modifiee.
- Les textures et ressources HTTP externes declarees par un modele sont bloquees. Seuls les fichiers selectionnes et les ressources internes du modele sont resolves.
- Fermeture/changement : objets URL, moteurs, geometries, textures et caches de lecture liberes.
- L'affichage est un outil de consultation. Les STL n'ont pas une unite physique garantie ; aucune mesure ou certification diagnostique n'est proposee.

## Verification

- Fichiers synthetiques non cliniques : STL decale, PLY, OBJ, GLB, ZIP standard/renomme, PDF, DICOM non compresse (deux coupes) et DICOM JPEG encapsule.
- Pixels verifies : geometrie 3D visible, rotation modifiant le canvas, DICOM et PDF non vides.
- Controle responsive et captures a 375 et 1280 px ; molette DICOM verifiee sans erreur passive.
- Les exports reels de fabricants, syntaxes DICOM supplementaires et appareils mobiles reels restent a tester avec des donnees anonymisees.
- Dependance transitive adm-zip corrigee via override 0.6.1+ ; audit au changement : aucune alerte high/critical, alertes moderate restantes.