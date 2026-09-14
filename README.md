# BINKSY LOGOKIT

Atelier SVG local, sans compte ni backend. Évolution du moteur BINKSY LOGO SYSTEM, avec compatibilité des projets `.binksy` V1.

## Parcours : puissant derrière, simple devant

L’accueil propose **Variantes à créer**, **Variantes déjà prêtes** et **Juste la zone de sécurité**.

1. **Importer** : nom de marque, icône/logotype et, en complément, plusieurs SVG assemblés dans **Variantes déjà prêtes**. Chaque carte propose aperçu, nom, remplacement et suppression. La palette est disponible dès le départ dans les deux modes Logo Kit ; projet et police restent secondaires.
2. **Assembler le logo** : canvas prioritaire, navigation par previews et inspecteur Composition / Position / Guides / Tailles minimales. Tailles, déplacement, poignées, positions précises, largeurs, centrages exact/visuel, grille, magnétisme et tailles minimales sont conservés. Mode focus masque les panneaux.
3. **Versions du logo** : une vue d’ensemble ouvre le dossier de chaque variante. Original, Couleurs simples, Multicolores, Dégradés, JPEG et Dimensions se trouvent dans des sections repliables. Recommandées présélectionne ; Tout voir ouvre le catalogue BigInt ; Système complet sélectionne toutes les combinaisons. Les réglages de rôles sont dans Modifier les couleurs du logo, l’éditeur de dégradé apparaît sur demande. JPEG montre les vrais fonds/marges avec choix individuels et associations partagées.
4. **Exporter** : previews, nombre de versions, déclinaisons et fichiers, puis export direct du kit. Les quatre formats SVG / PNG / JPEG / PDF sont activés à l’entrée dans cette étape, sans choix Web / Print / Complet. Tailles standards multiples (1000 à 5000 px), cas d’usage et formats personnalisés nommés. WEB : 72 DPI ; PRINT : PDF vectoriel, bitmaps 300 DPI facultatifs. Personnaliser l’export reste facultatif ; Fichiers à exporter conserve les exclusions.

**Juste la zone de sécurité** réutilise le moteur des SVG assemblés, sans palette, recoloration ni génération de dégradés. Parcours Importer → Zone de sécurité → Exporter. Les planches transparentes SVG/PNG/PDF conservent les peintures d’origine. Le ton clair/foncé concerne uniquement les guides. Aucun logo recoloré ni JPEG n’est généré dans ce mode.

**Mesure visuelle** : dans Guides, Définir visuellement permet de tracer un carré temporaire. Taille en direct, magnétisme sur les bords des éléments, Alt pour désactiver le magnétisme. Au relâchement, la mesure devient directement X1, avec multiplicateur 1. Le nom reste modifiable dans Guides. Dimension et nom sont sauvegardés, annulables et réutilisés sur les planches. Le carré n’est jamais exporté. Appliquer à d’autres versions copie la règle aux versions cochées, en unités SVG identiques ; les fichiers à échelles différentes nécessitent une vérification. Automatique, parties du logo, mesures numériques et multiplicateurs restent disponibles.

Les ajouts restent dans `.binksy` V3 (`clearMethod`, `visualMeasure`, `jpegExceptions`). Les fichiers V1/V2/V3 historiques restent lisibles et conservent leurs choix. Les nouvelles exceptions JPEG individuelles priment sur les règles partagées, sans changer la priorité des anciennes exceptions.

### Éditeur de dégradé

**Créer un dégradé** ouvre un brouillon manuel avec un nom obligatoire, modifiable et sauvegardé. Le point actif reste sélectionné après un clic ou un déplacement, y compris le point droit. L’éditeur propose des points sans limite fixe : couleurs, positions, ajout, retrait, déplacement sur la barre ou au clavier via les curseurs. Le vrai logo montre chaque mode et chaque preset (horizontal, vertical, 45°, −45°). Annuler conserve le projet ; Appliquer enregistre les changements.

- **Automatique** : conserve la géométrie des dégradés importés et recolore leurs stops ; pour les aplats, utilise un espace commun, ou un espace par forme si le SVG indique ce comportement.
- **Global** : coordonnées communes sur la composition, avec `userSpaceOnUse` et compensation des transformations. Les formes restent indépendantes, y compris entre icône et logotype.
- **Par forme** : `objectBoundingBox`, le dégradé complet recommence dans chaque forme.

Les couleurs verrouillées restent préservées. Les réglages de participation permettent d’exclure une zone ; séparer ses éléments pour contrôler une forme individuellement. Les nouveaux paramètres sont des ajouts au format V3, avec repli pour les dégradés historiques.

## English workflow

**Import → Build → Variants → Export.** SVG analysis, palette extraction and initial recommendations are automatic. Each visual choice previews the actual logo. Advanced composition settings, manual color adjustments, the full combination catalog and custom exports are optional. Existing V1/V2/V3 projects remain readable and retain their export settings.

The gradient editor supports manually created gradients with any number of movable stops, live previews, automatic/global/per-shape behavior and optional zone participation. Global gradients share a coordinate field across separate, transformed paths and composition parts. Save with Apply or discard with Cancel. Entering Export enables all four kit formats directly and separates pixel dimensions from WEB (72 DPI) and PRINT (vector PDF, optional 300 DPI bitmaps). PNG/SVG/PDF remain transparent; only JPEG receives a background.

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

PNG et JPEG partagent un cadrage par variante et par dimension ou cas d’usage : logo centré, proportions fixes et occupation de 80 % par défaut. Taille du logo dans l’image ouvre un cadre avec poignée et curseur. Pour toutes les dimensions, ce réglage est partagé entre les couleurs de la même variante. Chaque dimension supplémentaire possède désormais un cadrage par variante, commun à toutes ses couleurs, avec curseurs et aperçu direct dans le dossier de la variante. Le cadrage reste indépendant du clearspace et des autres formats. La résolution est inscrite dans les métadonnées PNG/JPEG.

Les planches de zone de sécurité claire et foncée sont monochromes dans les deux modes Logo Kit et conservent les couleurs originales en mode Juste la zone de sécurité, sans rectangle de fond. Elles sont générées une fois par construction sélectionnée, dans les formats transparents choisis (SVG si JPEG seul), directement dans `CLEARSPACE/Variante/`. Les recommandations de taille minimale restent séparées des logos.

## Projets

La clé locale historique `binksy-logo-system` est conservée. La liste `ready` est additive : en mode `compose`, elle complète les quatre variantes générées ; les modes `ready` et `clearspace` utilisent uniquement cette liste. Les SVG complets ne sont jamais recomposés et partagent rôles, couleurs et exports avec les variantes générées. Leurs zones de sécurité et tailles minimales sont indépendantes. Le multiplicateur sélectionné est orange et accessible via `aria-pressed`. Le fichier `.binksy` V4 contient les variantes importées, dimensions indépendantes, rôles/corrections/verrous, gradients, règles de sélection, associations JPEG globales, fichiers exclus et paramètres de livraison. V1/V2/V3 sont migrées en conservant les dimensions visibles : la dépendance historique de l’icône à l’échelle du logotype est remplacée par une hauteur absolue. Sans référence explicite, la protection utilise le petit côté visible du SVG assemblé. Une mesure manuelle existante reste prioritaire.

FR/EN est mémorisé dans `binksy-locale` et inscrit dans le projet à la sauvegarde. La préférence active de l’appareil est conservée lors de l’import. La suppression de projet passe obligatoirement par une confirmation ; elle n’efface pas les fichiers exportés.

Les rôles regroupent les peintures identiques par défaut et ciblent des indices de nœuds et propriétés stables. Les rôles peuvent être nommés, corrigés, verrouillés, séparés par élément et fusionnés par peinture/verrou. Les coordonnées des gradients importés restent intactes en original et en mode automatique ; les combinaisons recolorent les stops. Les gradients générés utilisent une direction linéaire globale ou par forme. Les variations claires/foncées modifient L en OKLab à teinte constante, avec réduction de chroma dans le gamut sRGB.

Le catalogue expose toutes les affectations via un index BigInt et monte 12 previews par page ouverte. Les choix de catégorie sont des règles, les choix individuels des exceptions. Les doublons d’affectations déjà représentés par l’original ou les couleurs simples sont exclus. Les changements de palette/rôles réinitialisent les choix générés. Les exports n’ont plus de seuil de 500 fichiers ; ils conservent une protection de 256 Mo par lot, sans limiter l’accès au catalogue ; la sélection finale affiche le nombre de fichiers, recommandations incluses pour un ZIP.

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

Les dégradés proposent les couleurs de palette et leurs nuances claires/foncées, le remplissage, le tracé, son opacité et l’exclusion individuelle des formes avec survol de repérage. Les versions icône/logotype bicolores utilisent uniquement la palette et restent décochées par défaut. Les choix hérités sont conservés autant que possible dans V4.

## Brand Guideline et assistant · V4

Le parcours principal devient **Importer → Assembler le logo → Versions du logo → Brand Guideline → Exporter**. Le guide est facultatif et son bouton Ignorer conserve les exports historiques. Le parcours de zone de sécurité seule reste inchangé.

Le guide partage un rendu vectoriel entre canvas, SVG et PDF. Douze pages initiales et une bibliothèque éditoriale complètent les variantes, clearspace, tailles et palette existants. Formats exclusifs : 16:9 (960 × 540 pt), A4 paysage (297 × 210 mm), A4 portrait (210 × 297 mm). Titres de 24–28 pt et corps de 10,5–12 pt par défaut ; tailles modifiables.

- `guideline-model.js` : données V4 validées, pages, ressources et opérations de pages.
- `guideline-layout.js`, `guideline-theme.js`, `guideline-svg.js` : liste d’éléments, thèmes et rendu partagé.
- `guideline-editor.js`, `guideline-interactions.js`, `guideline-media.js` : canvas, inspecteur, saisie et images.
- `guideline-fonts.js`, `guideline-export.js` : polices exactes, PDF multipage et SVG indépendants.
- `ai-providers.js`, `ai-context.js`, `ai.js` : trois protocoles, actions limitées à l’étape, propositions validées et coffre local séparé des projets. OpenCode Go est exclu.
- `project-storage.js` : conservation du stockage historique et secours IndexedDB pour les médias volumineux.

Les textes TTF et OTF sont vectorisés dans le PDF avec les positions, métriques et retours de ligne du canvas. Le choix SVG texte conserve une dépendance aux polices d’origine ; le choix tracés convertit les textes avec leur police réelle. Flou/lueur sont rasterisés uniquement dans leur démonstration PDF ; les pages restent vectorielles. Pas de garantie de calques Illustrator ou de CMJN ICC.

Tests supplémentaires : `tests/guideline.html` génère un projet synthétique, ses PDF/SVG dans les trois formats et un kit ZIP. Pour la vérification avec de vraies polices, placer localement `Arial.ttf`, `Georgia.ttf` et `STIXGeneral.otf` dans `tests/.local-fixtures/` (ignoré par Git, polices non distribuées). `npm test` couvre données, sécurité et adaptateurs réseau avec réponses simulées ; les appels réels nécessitent la clé et l’autorisation navigateur du fournisseur.

**English:** Optional Brand Guideline adds a shared SVG canvas, page library, theme, real font/image imports and multipage vector PDF plus individual SVG exports. V1/V2/V3 migrate to V4 with the guide disabled. AI actions are scoped to the current step and require explicit application. Credentials remain outside project files. OpenCode Go is excluded. TTF and OTF text use the same exact outlines and positions as the canvas; only blur/glow demonstrations may be rasterized in PDF. No page-wide raster fallback, Illustrator-layer or ICC-CMYK guarantee.

Les repères et le magnétisme accompagnent les marges ; les alignements et le premier plan agissent sur la page. Les blocs texte réduisent leur corps si nécessaire (minimum 6 pt) et un contrôle refuse les débordements restants avant le PDF. Les poids des polices importées proviennent de leurs fichiers. Les règles de proportions/espacement sont indisponibles pour un SVG assemblé, dont les composants ne sont pas séparables. La perspective est une approximation par bandes vectorielles.

La mise en page du guide suit une grille éditoriale : couvertures colorées, titres de 24–28 pt, corps de 10,5–12 pt, marges et folios discrets. Instrument Sans est fournie localement sous licence SIL OFL (voir `public/fonts/InstrumentSans-OFL.txt`), et vectorisée dans les PDF lorsque utilisée. Les polices importées restent prioritaires. Source : https://github.com/google/fonts/tree/main/ofl/instrumentsans.

Les neuf pages éditoriales proposent des textes fictifs FR/EN signalés « Texte d’exemple · À personnaliser ». Les textes saisis sur la page ou dans le brief sont prioritaires. Réappliquer le thème conserve les textes et les positions personnalisés.

## Ajustements du parcours et du guide

Le bouton orange **Dimensions supplémentaires** est visible dans Versions du logo. Il ajoute une dimension nommée dans le dossier de la variante, depuis un preset ou des dimensions personnalisées, avec fond transparent (PNG) ou coloré (JPEG). Le 3000 × 3000 standard reste indépendant. Les sections secondaires restent repliables.

Trois formes ou davantage partageant la même peinture et le même verrou peuvent être liées par un groupe logique persistant, puis dissociées. Les formes SVG restent indépendantes et leur géométrie ne change pas.

La préparation du guide conserve sa navigation et ses boutons visibles ; son contenu central défile. Les pages de logos, zone de sécurité, tailles minimales et interdits permettent de choisir les vraies variantes colorimétriques. Les guides de clearspace réutilisent le moteur commun sans texte intégré ; les interdits n’ajoutent plus de rectangles derrière les exemples. Les tailles minimales utilisent les valeurs sources : millimètres convertis en points PDF et pixels convertis à 96 px/pouce. Les exemples sont répartis sur plusieurs pages si nécessaire, sans réduction du logo. Un exemple physiquement plus grand que la page reste une erreur d’export explicite. Les associations de couleurs proposent Conseillé, À éviter ou Masquer ; le choix manuel est prioritaire.

Le chat du guide conserve les portées Page actuelle / Tout le document. Les recommandations ciblées ouvrent aussi une conversation persistante. Les étapes précédentes disposent de quatre recommandations ciblées : zone de sécurité, taille minimale, noms et rôles des couleurs. La configuration fournisseur/modèle est partagée et séparée du projet. Les demandes visuelles envoient un aperçu PNG réel ; les modèles connus comme incompatibles avec les images sont refusés avec un message explicite.

Les propositions du chat sont validées sur une copie et restent temporaires jusqu’à **Appliquer**. Leur portée Page actuelle ou Tout le document est vérifiée, avec les IDs des pages, éléments, variantes, couleurs et ressources existants. Une application forme une seule opération Annuler. Si le projet change entre proposition et application, une nouvelle proposition est demandée. Le chat n’importe pas de nouveaux fichiers et ne modifie pas les compositions sources de LogoKit. Les aperçus du catalogue colorimétrique sont bornés, complétés par les combinaisons explicitement sélectionnées.

Tests supplémentaires : `/tests/discoverability.html` contrôle les groupes de formes, les dimensions, les recommandations visuelles et un PDF réel de tailles minimales. Les tests Node couvrent les portées IA, l’application atomique, les références invalides, les protocoles fournisseurs et la pagination sans mise à l’échelle. Le test OpenRouter authentifié nécessite une clé configurée localement ; aucune clé n’est incluse dans les tests.

### English

Additional dimensions create named formats inside each variant folder, with framing shared across its colors. Standard exports keep their existing framing. Gradient names and logical groups of at least three matching shapes persist in `.binksy`. Guide preparation scrolls inside a bounded workspace. Guide logo colors reference real catalog descriptors, minimum examples preserve physical source dimensions and paginate without scaling, and manual color-pair decisions can recommend, allow or advise against a pairing; all remain visible.

Guideline chat enforces current-page/document scope, temporary proposals and atomic Apply/Undo. Focused recommendations also remain conversational. Earlier stages expose four focused visual recommendations. Provider settings are shared and remain outside project files. Chat uses existing resources and never rewrites upstream compositions. Authenticated live provider generation requires a locally configured key.


## Corrections de fiabilité et de cadrage

Les sliders standards et supplémentaires utilisent des previews noir sur blanc et un cadrage par variante, commun aux couleurs. Le scroll est restauré après le montage de la galerie. PRINT, WEB, CAS D’USAGE et CLEARSPACE séparent les formats ; chaque cas d’usage conserve son sous-dossier nommé. La génération reste séquentielle, le ZIP est assemblé par morceaux et le plafond mémoire reste 256 Mo. La préparation garde un plafond de 10 000 déclinaisons pour protéger le catalogue BigInt.

Le guide adapte les textes et repères avec le contraste commun ; les logos utilisent les vrais descripteurs disponibles. Les valeurs explicites sont manuelles et `auto` réactive l’adaptation. Les anciens choix restent conservés. Typographie d’accent optionnelle et indépendante, rôles de couleurs recherchables et réutilisables, y compris personnalisés : tous ces champs sont persistés et accessibles à l’IA sous forme de propositions. La sérialisation des glyphes évite l’optimisation variadique d’OpenType susceptible de dépasser la pile d’appels sur des tracés complexes, sans retirer de contours.

AI: requests are non-streaming JSON. Empty/output-limited responses retry once; incomplete tool arguments are rejected as a whole. The final tool acknowledgement is parsed and used when the proposal has no message. Provider errors remain visible.


## Édition visuelle · septembre 2026

Le canvas du guide porte une toolbar contextuelle : rôle, police, graisse disponible, taille, couleur et alignement pour le texte ; variante et couleur réelle pour le logo ; remplacement direct, ajustement et zoom pour l’image. Double-clic pour saisir un texte ; `•••` conserve position, dimensions, leading, tracking, ordre et suppression. Les réglages page et document restent séparés. Une exception locale affiche **Réinitialiser au style** ; déplacer ou redimensionner un bloc ne fige plus sa typographie.

**Accent** s’ajoute depuis les réglages globaux, avec import TTF/OTF, police, graisse, taille, interlignage et tracking. La hiérarchie réserve des pages supplémentaires. Logo et variantes choisit une couleur disponible commune par défaut, sans fond individuel. Une couleur peut s’appliquer à toutes les variantes de la page lorsqu’elle est disponible partout.

Les associations utilisent un état commun (`guideline-pairs.js`) : Recommandée (contraste ≥ 4,5), Autorisée (≥ 3) ou À éviter, avec priorité aux décisions manuelles. Toutes les paires, y compris identiques, restent visibles sans atténuation. Les pages sont paginées à une taille lisible. Les anciens choix masqués restent lisibles dans les fichiers historiques et apparaissent désormais dans le guide.

Chaque page SVG propose **Texte éditable** ou **Texte vectorisé**. Les groupes BACKGROUND, DECORATION, IMAGES, LOGOS et TEXT portent des sous-groupes identifiables. Ils peuvent se répéter afin de préserver l’ordre de superposition ; ce ne sont pas des calques natifs Illustrator. Le PDF utilise les tracés des vraies polices TTF/OTF et le même placement des glyphes que le canvas ; il ne conserve donc pas de texte éditable. Le SVG éditable reste prévu à cet effet.

Les nouveaux projets livrent SVG/PNG/JPEG en WEB et PDF en PRINT. **Générer aussi les bitmaps PRINT** est facultatif ; les choix explicites des anciens projets sont conservés. Les formats digitaux ne produisent jamais de PRINT. Un format personnalisé transparent génère PNG ; un fond coloré génère JPEG. Les anciennes dimensions sans type de fond gardent leur comportement PNG + JPEG jusqu’à modification. Les options avancées permettent de choisir un format ou les deux.

Un cadrage est enregistré dans `exports.variantFraming[dimensionId][variantId]`, partagé entre toutes les couleurs PNG/JPEG. **Réinitialiser cette variante** rétablit 80 % pour cette dimension seulement. La synthèse d’export montre variantes, déclinaisons, dimensions, formats, nombres WEB/PRINT et inclusions PDF/SVG du guide ; la liste détaillée reste repliable.

Chaque recommandation IA garde son chat et son historique en mémoire de session, pour préciser ou discuter la proposition avant **Appliquer**. Le contexte initial inclut la variante active ; les questions suivantes et la proposition en attente sont transmises au fournisseur. Les secrets restent hors projet.

**English:** Variant folders replace category tabs. Contextual canvas controls keep local edits near their element, with explicit style reset and global typography roles including Accent. All palette pairs remain visible and paginate. SVG pages offer editable or outlined text and named semantic groups; PDF outlines TTF/OTF with the same glyph metrics. New projects use web bitmaps and print vector PDF, with optional print bitmaps. Custom transparent formats export PNG, colored formats JPEG; legacy choices are preserved. Dimension/variant framing is shared across colors and raster formats. Focused AI recommendations stay conversational and require Apply.

Vérification ciblée : `/tests/visual-ux.html` couvre rôles et réouverture, 25 associations, pagination, logos communs, cadrage, ZIP réel et quatre polices dans les trois formats. Les polices de test restent locales dans `tests/.local-fixtures` et ne sont pas distribuées.

Validation de cette passe : 30 tests Node ciblés et 9 scénarios navigateur passent ; build Vite réussi. La suite complète conserve deux échecs préexistants de mocks de catalogue IA, reproduits sur `0453890`. Les exports PDF sont générés réellement avec Arial/Georgia (TTF), Clash Display/STIX General (OTF), en 16:9 et A4 portrait/paysage ; leur inspection visuelle dans un lecteur PDF et Illustrator reste à effectuer. Aucun appel IA authentifié réel n’a été validé.

**English validation:** 30 focused Node tests, 9 browser scenarios and the production build pass. Two pre-existing AI model catalogue mock failures were reproduced on `0453890`. Real four-font PDF exports were generated in all three page formats; visual inspection in a PDF reader/Illustrator and authenticated provider calls remain unverified.
