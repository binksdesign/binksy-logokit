# BINKSY LOGOKIT

Atelier SVG local, sans compte ni backend. Évolution du moteur BINKSY LOGO SYSTEM, avec compatibilité des projets `.binksy` V1.

## Parcours : automatique, puis modifier

1. **Importer** : nom de marque, icône et/ou logotype, ou variantes assemblées. Les couleurs, formes, dégradés et centres optiques sont analysés ; une preview apparaît immédiatement. Les couleurs détectées enrichissent automatiquement la palette.
2. **Construire** : choisir une construction dans ses previews. Tailles indépendantes, espacement et choix visuels d’alignement/centrage ; positions précises, grille, snap et largeurs dans **Réglages avancés**. La protection et les tailles minimales ont leurs propres previews et corrections facultatives.
3. **Variantes** : galerie filtrable, originales et couleurs simples sélectionnées par défaut. **Couleurs du logo** surligne les zones sélectionnées. **Ajuster les couleurs manuellement** conserve correction, verrous, séparation et fusion. **Personnaliser les combinaisons** conserve Full System et les sélections globales. **Voir toutes les combinaisons** ouvre le catalogue paginé BigInt.
4. **Exporter** : **Exporter le Logo Kit complet** livre la sélection actuelle. Les nouveaux projets proposent les quatre formats. Presets Web (SVG/PNG, 1600 px, 144 DPI), Print (SVG/PDF, 3000 px, 300 DPI) et Complet (quatre formats, 3000 px, 300 DPI). **Personnaliser l’export** conserve tous les réglages ; **Fonds recommandés** et **Sélection finale** conservent les exceptions et exclusions individuelles.

Aucun passage dans les réglages avancés n’est obligatoire. Les étapes sont accessibles après le premier import. Les anciens projets conservent leurs formats et corrections.

### Éditeur de dégradé

**Modifier le dégradé** propose 2 à 32 stops : couleurs, positions, ajout, retrait, déplacement sur la barre ou au clavier via les curseurs. Le vrai logo montre chaque mode et chaque preset (horizontal, vertical, 45°, −45°). Annuler conserve le projet ; Appliquer enregistre les changements.

- **Automatique** : conserve la géométrie des dégradés importés et recolore leurs stops ; pour les aplats, utilise un espace commun, ou un espace par forme si le SVG indique ce comportement.
- **Global** : coordonnées communes sur la composition, avec `userSpaceOnUse` et compensation des transformations. Les formes restent indépendantes, y compris entre icône et logotype.
- **Par forme** : `objectBoundingBox`, le dégradé complet recommence dans chaque forme.

Les couleurs verrouillées restent préservées. Les réglages de participation permettent d’exclure une zone ; séparer ses éléments pour contrôler une forme individuellement. Les nouveaux paramètres sont des ajouts au format V3, avec repli pour les dégradés historiques.

## English workflow

**Import → Build → Variants → Export.** SVG analysis, palette extraction and initial recommendations are automatic. Each visual choice previews the actual logo. Advanced composition settings, manual color adjustments, the full combination catalog and custom exports are optional. Existing V1/V2/V3 projects remain readable and retain their export settings.

The gradient editor supports 2–32 movable stops, live previews, automatic/global/per-shape behavior and optional zone participation. Global gradients share a coordinate field across separate, transformed paths and composition parts. Save with Apply or discard with Cancel. The complete kit exports the current selection; Web, Print and Complete presets are available. PNG/SVG/PDF remain transparent; only JPEG receives a background.

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
- `src/gradient.js`, `src/gradient-editor.js` : paramètres persistants et éditeur visuel de dégradés.
- `src/main.js`, `src/ui.js`, `src/style.css` : état, événements, accueil, règles agent et espace responsive.
- `public/brand` : logo, favicon et flèche fournis par Binks, conservés tels quels.

## Règles de livraison

Les SVG, PNG et PDF sont toujours transparents. Les JPEG utilisent les associations fond/logo recommandées par le ratio de luminance sRGB (3:1 par défaut, réglable). Les choix manuels sont globaux par couleur/combinaison et fond. Les exceptions héritées des anciens projets restent conservées tant qu’une règle globale ne les remplace pas. Le fond du canvas n’influence jamais les exports.

La marge JPEG, indépendante du clearspace, est une fraction du petit côté du logo. La taille raster est un canvas maximal, sans déformation. La résolution est inscrite dans les métadonnées PNG/JPEG.

Les planches de clearspace claire et foncée sont monochromes, sans rectangle de fond. Elles sont générées une fois par construction sélectionnée, dans les formats transparents choisis (SVG si JPEG seul), dans `Clearspace/`. Les recommandations de taille minimale restent séparées des logos.

## Projets

La clé locale historique `binksy-logo-system` est conservée. Le fichier `.binksy` V3 contient les variantes importées, dimensions indépendantes, rôles/corrections/verrous, gradients, règles de sélection, associations JPEG globales, fichiers exclus et paramètres de livraison. V1/V2 sont migrées en conservant les dimensions visibles : la dépendance historique de l’icône à l’échelle du logotype est remplacée par une hauteur absolue. Sans référence explicite, la protection utilise le petit côté visible du SVG assemblé. Une mesure manuelle existante reste prioritaire.

FR/EN est mémorisé dans `binksy-locale` et inscrit dans le projet à la sauvegarde. La préférence active de l’appareil est conservée lors de l’import. La suppression de projet passe obligatoirement par une confirmation ; elle n’efface pas les fichiers exportés.

Les rôles regroupent les peintures identiques par défaut et ciblent des indices de nœuds et propriétés stables. Les rôles peuvent être nommés, corrigés, verrouillés, séparés par élément et fusionnés par peinture/verrou. Les coordonnées des gradients importés restent intactes en original et en mode automatique ; les combinaisons recolorent les stops. Les gradients générés utilisent une direction linéaire globale ou par forme. Les variations claires/foncées modifient L en OKLab à teinte constante, avec réduction de chroma dans le gamut sRGB.

Le catalogue expose toutes les affectations via un index BigInt et monte 12 previews par page ouverte. Les choix de catégorie sont des règles, les choix individuels des exceptions. Les doublons d’affectations déjà représentés par l’original ou les couleurs simples sont exclus. Les changements de palette/rôles réinitialisent les choix générés. Les exports restent limités à 500 fichiers et 256 Mo par lot, sans limiter l’accès au catalogue ; la sélection finale affiche le nombre de fichiers, recommandations incluses pour un ZIP.

## Vérification

Les tests Node couvrent géométrie, historique, paramètres des dégradés et recommandations automatiques. En développement :

- `/tests/browser.html` : imports, transparence, résolution, contrastes, migration, clearspace et ZIP.
- `/tests/ui.html` : parcours guidé, contrôles contextuels, palette automatique, stops et modes, presets, ZIP réel, sauvegarde, migrations et responsive.
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
