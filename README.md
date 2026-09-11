# BINKSY LOGOKIT

Atelier SVG local, sans compte ni backend. Évolution du moteur BINKSY LOGO SYSTEM, avec compatibilité des projets `.binksy` V1.

## Parcours : puissant derrière, simple devant

L’accueil propose **Variantes à créer**, **Variantes déjà prêtes** et **Juste la zone de sécurité**.

1. **Importer** : nom de marque, icône/logotype et, en complément, plusieurs SVG assemblés dans **Variantes déjà prêtes**. Chaque carte propose aperçu, nom, remplacement et suppression. La palette est disponible dès le départ dans les deux modes Logo Kit ; projet et police restent secondaires.
2. **Assembler le logo** : canvas prioritaire, navigation par previews et inspecteur Composition / Position / Guides / Plus de réglages. Tailles, déplacement, poignées, positions précises, largeurs, centrages exact/visuel, grille, magnétisme et tailles minimales sont conservés. Mode focus masque les panneaux.
3. **Versions du logo** : un seul onglet visible parmi Original, Une seule couleur, Plusieurs couleurs, Dégradés, JPEG. Recommandées présélectionne ; Tout voir ouvre le catalogue BigInt ; Système complet sélectionne toutes les combinaisons. Les réglages de rôles sont dans Modifier les couleurs du logo, l’éditeur de dégradé apparaît sur demande. JPEG montre les vrais fonds/marges avec choix individuels et associations partagées.
4. **Exporter** : previews, nombre de versions, déclinaisons et fichiers, puis export direct du kit. Les quatre formats SVG / PNG / JPEG / PDF sont activés à l’entrée dans cette étape, sans choix Web / Print / Complet. Tailles standards multiples (1000 à 5000 px), cas d’usage et formats personnalisés nommés. WEB : 72 DPI ; PRINT : 300 DPI réels. Personnaliser l’export reste facultatif ; Fichiers à exporter conserve les exclusions.

**Juste la zone de sécurité** réutilise le moteur des SVG assemblés, sans palette, recoloration ni génération de dégradés. Parcours Importer → Zone de sécurité → Exporter. Les planches transparentes SVG/PNG/PDF conservent les peintures d’origine. Le ton clair/foncé concerne uniquement les guides. Aucun logo recoloré ni JPEG n’est généré dans ce mode.

**Mesure visuelle** : dans Guides, Définir visuellement permet de tracer un carré temporaire. Taille en direct, magnétisme sur les bords des éléments, Alt pour désactiver le magnétisme. Au relâchement, la mesure devient directement X1, avec multiplicateur 1. Le nom reste modifiable dans Guides. Dimension et nom sont sauvegardés, annulables et réutilisés sur les planches. Le carré n’est jamais exporté. Appliquer à d’autres versions copie la règle aux versions cochées, en unités SVG identiques ; les fichiers à échelles différentes nécessitent une vérification. Automatique, parties du logo, mesures numériques et multiplicateurs restent disponibles.

Les ajouts restent dans `.binksy` V3 (`clearMethod`, `visualMeasure`, `jpegExceptions`). Les fichiers V1/V2/V3 historiques restent lisibles et conservent leurs choix. Les nouvelles exceptions JPEG individuelles priment sur les règles partagées, sans changer la priorité des anciennes exceptions.

### Éditeur de dégradé

**Créer un dégradé** ouvre un brouillon manuel, sans génération automatique. L’éditeur propose des points sans limite fixe : couleurs, positions, ajout, retrait, déplacement sur la barre ou au clavier via les curseurs. Le vrai logo montre chaque mode et chaque preset (horizontal, vertical, 45°, −45°). Annuler conserve le projet ; Appliquer enregistre les changements.

- **Automatique** : conserve la géométrie des dégradés importés et recolore leurs stops ; pour les aplats, utilise un espace commun, ou un espace par forme si le SVG indique ce comportement.
- **Global** : coordonnées communes sur la composition, avec `userSpaceOnUse` et compensation des transformations. Les formes restent indépendantes, y compris entre icône et logotype.
- **Par forme** : `objectBoundingBox`, le dégradé complet recommence dans chaque forme.

Les couleurs verrouillées restent préservées. Les réglages de participation permettent d’exclure une zone ; séparer ses éléments pour contrôler une forme individuellement. Les nouveaux paramètres sont des ajouts au format V3, avec repli pour les dégradés historiques.

## English workflow

**Import → Build → Variants → Export.** SVG analysis, palette extraction and initial recommendations are automatic. Each visual choice previews the actual logo. Advanced composition settings, manual color adjustments, the full combination catalog and custom exports are optional. Existing V1/V2/V3 projects remain readable and retain their export settings.

The gradient editor supports manually created gradients with any number of movable stops, live previews, automatic/global/per-shape behavior and optional zone participation. Global gradients share a coordinate field across separate, transformed paths and composition parts. Save with Apply or discard with Cancel. Entering Export enables all four kit formats directly and separates pixel dimensions from WEB (72 DPI) and PRINT (300 DPI). PNG/SVG/PDF remain transparent; only JPEG receives a background.

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
- `src/workspace.js` : parcours contextuel Importer / Construire / Variantes / Exporter.
- `src/visual-measure.js` : interaction de mesure, géométrie du carré et copie de règle.
- `src/jpeg-gallery.js` : previews paginées des JPEG et choix de fonds.
- `src/gradient.js`, `src/gradient-editor.js` : paramètres persistants et éditeur visuel de dégradés.
- `src/main.js`, `src/ui.js`, `src/style.css` : état, événements, accueil, règles agent et espace responsive.
- `public/brand` : logo, favicon et flèche fournis par Binks, conservés tels quels.

## Règles de livraison

Les SVG, PNG et PDF sont toujours transparents. Les JPEG utilisent les associations fond/logo recommandées par le ratio de luminance sRGB (3:1 par défaut, réglable). Les choix manuels sont globaux par couleur/combinaison et fond. Les exceptions héritées des anciens projets restent conservées tant qu’une règle globale ne les remplace pas. Le fond du canvas n’influence jamais les exports.

PNG et JPEG partagent un cadrage par dimension ou cas d’usage : logo centré, proportions fixes et occupation de 80 % par défaut. Taille du logo dans l’image ouvre un cadre avec poignée et curseur. Ce réglage est partagé entre versions, indépendant du clearspace et des autres formats. La résolution est inscrite dans les métadonnées PNG/JPEG.

Les planches de zone de sécurité claire et foncée sont monochromes dans les deux modes Logo Kit et conservent les couleurs originales en mode Juste la zone de sécurité, sans rectangle de fond. Elles sont générées une fois par construction sélectionnée, dans les formats transparents choisis (SVG si JPEG seul), directement dans `CLEARSPACE/Variante/`. Les recommandations de taille minimale restent séparées des logos.

## Projets

La clé locale historique `binksy-logo-system` est conservée. La liste `ready` est additive : en mode `compose`, elle complète les quatre variantes générées ; les modes `ready` et `clearspace` utilisent uniquement cette liste. Les SVG complets ne sont jamais recomposés et partagent rôles, couleurs et exports avec les variantes générées. Leurs zones de sécurité et tailles minimales sont indépendantes. Le multiplicateur sélectionné est orange et accessible via `aria-pressed`. Le fichier `.binksy` V3 contient les variantes importées, dimensions indépendantes, rôles/corrections/verrous, gradients, règles de sélection, associations JPEG globales, fichiers exclus et paramètres de livraison. V1/V2 sont migrées en conservant les dimensions visibles : la dépendance historique de l’icône à l’échelle du logotype est remplacée par une hauteur absolue. Sans référence explicite, la protection utilise le petit côté visible du SVG assemblé. Une mesure manuelle existante reste prioritaire.

FR/EN est mémorisé dans `binksy-locale` et inscrit dans le projet à la sauvegarde. La préférence active de l’appareil est conservée lors de l’import. La suppression de projet passe obligatoirement par une confirmation ; elle n’efface pas les fichiers exportés.

Les rôles regroupent les peintures identiques par défaut et ciblent des indices de nœuds et propriétés stables. Les rôles peuvent être nommés, corrigés, verrouillés, séparés par élément et fusionnés par peinture/verrou. Les coordonnées des gradients importés restent intactes en original et en mode automatique ; les combinaisons recolorent les stops. Les gradients générés utilisent une direction linéaire globale ou par forme. Les variations claires/foncées modifient L en OKLab à teinte constante, avec réduction de chroma dans le gamut sRGB.

Le catalogue expose toutes les affectations via un index BigInt et monte 12 previews par page ouverte. Les choix de catégorie sont des règles, les choix individuels des exceptions. Les doublons d’affectations déjà représentés par l’original ou les couleurs simples sont exclus. Les changements de palette/rôles réinitialisent les choix générés. Les exports restent limités à 500 fichiers et 256 Mo par lot, sans limiter l’accès au catalogue ; la sélection finale affiche le nombre de fichiers, recommandations incluses pour un ZIP.

## Vérification

Les tests Node couvrent géométrie, historique, paramètres des dégradés et recommandations automatiques. En développement :

- `/tests/browser.html` : imports, transparence, résolution, contrastes, migration, clearspace et ZIP.
- `/tests/ui.html` : parcours guidé, contrôles contextuels, palette automatique, stops et modes, export direct du kit complet, ZIP réel, sauvegarde, migrations et responsive.
- `/tests/mixed.html` : variantes générées + SVG complets, import/remplacement/suppression, noms, rôles partagés, verrous, dégradés, exports, recharge, état orange des multiplicateurs et responsive.
- `/tests/advanced.html` : SVG A à I, rôles, dégradés, opacités, indépendance des tailles, migration V3, sélection, exports et catalogue `5^30`, dégradés globaux sur formes transformées et entre composants.

Exécuter les tests UI sur une origine locale dédiée : ils créent des projets synthétiques. Une modification d’usage exige la mise à jour simultanée de la page RÈGLES AGENT IA dans les deux langues.

Les pages de tests ne font pas partie du build public.

## Limites explicites

- PDF : masques, filtres et motifs complexes refusés, sans rasterisation de secours. SVG conserve les éléments pris en charge par l’import.
- Contours non vectorisés : enveloppe conservatrice pour éviter de couper les traits ; vectoriser les contours si la grille doit suivre exactement leur limite extérieure.
- Texte simple : conversion avec la police OTF/TTF exacte fournie ; constructions typographiques complexes à vectoriser avant import.
- Contraste d’un original multicolore : minimum des peintures identifiées, contrôle visuel nécessaire pour les effets complexes.
- Couleurs RVB, sans conversion ICC/CMJN. Ouverture dans Illustrator, Figma et Affinity non certifiée par un test dans ces logiciels.
- Cache hors ligne disponible avec HTTPS ou localhost une fois les ressources mises en cache. Données locales dépendantes du stockage accordé par le navigateur ; garder un fichier `.binksy` de sauvegarde.

## Formats et livraison

Une seule arborescence : `(NOM) LOGOKIT/LOGOS/Variante/WEB/PNG|SVG|JPEG`, `PRINT` pour PDF et bitmaps 300 DPI, `CAS D’USAGE` pour les presets d’usage et formats personnalisés à 72 DPI. Aucun sous-dossier par dimension. Les planches sont directement dans `CLEARSPACE/Variante/`. Le TXT inclut toute la palette (nom, HEX, RVB, CMJN approximatif sans profil ICC).

`src/export-formats.js` centralise formats, destinations, cadrage et palette TXT ; `src/format-editor.js` porte les contrôles et le cadrage centré. `tests/delivery.html` vérifie les fichiers réels : chemins, dimensions, DPI, position des pixels, dégradés par forme et migration. `tests/export-formats.test.js` vérifie les règles communes.

Les dégradés proposent les couleurs de palette et leurs nuances claires/foncées, le remplissage, le tracé, son opacité et l’exclusion individuelle des formes avec survol de repérage. Les versions icône/logotype bicolores utilisent uniquement la palette et restent décochées par défaut. Les choix hérités sont conservés autant que possible dans V3.
