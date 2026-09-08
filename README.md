# BINKSY LOGOKIT

Atelier SVG local, sans compte ni backend. Évolution du moteur BINKSY LOGO SYSTEM, avec compatibilité des projets `.binksy` V1.

## Démarrer

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

Cloudflare : `wrangler.jsonc` sert le dossier `dist`. Aucun déploiement n’est effectué par la compilation.

## Organisation

- `src/model.js` : géométrie, grille X, variantes, palette, contraste et historique.
- `src/svg.js` : import sécurisé, limites vectorielles, couleurs et compositions SVG.
- `src/project.js` : validation et migration des fichiers V1/V2/V3.
- `src/paints.js` : détection des rôles, restauration des corrections, variations OKLab et gradients.
- `src/catalog.js` : catalogue indexé en BigInt, sélections globales et individuelles sans matérialiser le produit cartésien.
- `src/workshop.js` : génération progressive, pagination, associations JPEG globales et sélection fichier par fichier.
- `src/i18n.js`, `src/locales/en.js` : langue FR/EN persistante, catalogue de traduction et adaptateur des templates existants.
- `src/agent-doc.js` : documentation opérationnelle bilingue des agents IA, à maintenir avec chaque changement d’usage (voir `AGENTS.md`).
- `src/clearspace.js` : guides et planches vectorielles transparentes.
- `src/export.js`, `src/raster.js` : SVG/PDF vectoriels, PNG, JPEG, résolution et ZIP.
- `src/main.js`, `src/ui.js`, `src/style.css` : contrôles existants, accueil, modes, règles agent et panneaux indépendants.
- `public/brand` : logo, favicon et flèche fournis par Binks, conservés tels quels.

## Règles de livraison

Les SVG, PNG et PDF sont toujours transparents. Les JPEG utilisent les associations fond/logo recommandées par le ratio de luminance sRGB (3:1 par défaut, réglable). Les choix manuels sont globaux par couleur/combinaison et fond. Les exceptions héritées des anciens projets restent conservées tant qu’une règle globale ne les remplace pas. Le fond du canvas n’influence jamais les exports.

La marge JPEG, indépendante du clearspace, est une fraction du petit côté du logo. La taille raster est un canvas maximal, sans déformation. La résolution est inscrite dans les métadonnées PNG/JPEG.

Les planches de clearspace claire et foncée sont monochromes, sans rectangle de fond. Elles sont générées une fois par construction sélectionnée, dans les formats transparents choisis (SVG si JPEG seul), dans `Clearspace/`. Les recommandations de taille minimale restent séparées des logos.

## Projets

La clé locale historique `binksy-logo-system` est conservée. Le fichier `.binksy` V3 contient les variantes importées, dimensions indépendantes, rôles/corrections/verrous, gradients, règles de sélection, associations JPEG globales, fichiers exclus et paramètres de livraison. V1/V2 sont migrées en conservant les dimensions visibles : la dépendance historique de l’icône à l’échelle du logotype est remplacée par une hauteur absolue. Une référence non mesurable dans un SVG assemblé doit être renseignée.

FR/EN est mémorisé dans `binksy-locale` et inscrit dans le projet à la sauvegarde. La préférence active de l’appareil est conservée lors de l’import. La suppression de projet passe obligatoirement par une confirmation ; elle n’efface pas les fichiers exportés.

Les rôles regroupent les peintures identiques par défaut et ciblent des indices de nœuds et propriétés stables. Les rôles peuvent être nommés, corrigés, verrouillés, séparés par élément et fusionnés par peinture/verrou. Les coordonnées des gradients importés restent intactes ; les combinaisons recolorent les stops. Les gradients générés utilisent une direction linéaire. Les variations claires/foncées modifient L en OKLab à teinte constante, avec réduction de chroma dans le gamut sRGB.

Le catalogue expose toutes les affectations via un index BigInt et monte 12 previews par page ouverte. Les choix de catégorie sont des règles, les choix individuels des exceptions. Les doublons d’affectations déjà représentés par l’original ou les couleurs simples sont exclus. Les changements de palette/rôles réinitialisent les choix générés. Les exports restent limités à 500 fichiers et 256 Mo par lot, sans limiter l’accès au catalogue ; la sélection finale affiche le nombre de fichiers, recommandations incluses pour un ZIP.

## Vérification

Les quatre tests Node couvrent les invariants géométriques et l’historique. En développement :

- `/tests/browser.html` : imports, transparence, résolution, contrastes, migration, clearspace et ZIP.
- `/tests/ui.html` : deux parcours, sauvegarde, contrôles, associations JPEG, navigation et maintien du canvas.
- `/tests/advanced.html` : SVG A à I, rôles, dégradés, opacités, indépendance des tailles, migration V3, sélection, exports et catalogue `5^30`.

Exécuter les tests UI sur une origine locale dédiée : ils créent des projets synthétiques. Une modification d’usage exige la mise à jour simultanée de la page RÈGLES AGENT IA dans les deux langues.

Les pages de tests ne font pas partie du build public.

## Limites explicites

- PDF : masques, filtres et motifs complexes refusés, sans rasterisation de secours. SVG conserve les éléments pris en charge par l’import.
- Contours non vectorisés : enveloppe conservatrice pour éviter de couper les traits ; vectoriser les contours si la grille doit suivre exactement leur limite extérieure.
- Texte simple : conversion avec la police OTF/TTF exacte fournie ; constructions typographiques complexes à vectoriser avant import.
- Contraste d’un original multicolore : minimum des peintures identifiées, contrôle visuel nécessaire pour les effets complexes.
- Couleurs RVB, sans conversion ICC/CMJN. Ouverture dans Illustrator, Figma et Affinity non certifiée par un test dans ces logiciels.
- Cache hors ligne disponible avec HTTPS ou localhost une fois les ressources mises en cache. Données locales dépendantes du stockage accordé par le navigateur ; garder un fichier `.binksy` de sauvegarde.
