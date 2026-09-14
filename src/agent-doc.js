import { language } from "./i18n.js";
// Product documentation: paired FR/EN paragraphs.
const sections = [
  [["Réglages automatiques et fiabilité", "Automatic settings and reliability"], [
    ["Les cadrages standards PNG/JPEG et supplémentaires proposent un aperçu noir sur blanc indépendant des couleurs. Chaque variante conserve son occupation du canvas par dimension, commune à toutes ses couleurs. Les anciens cadrages partagés restent les valeurs par défaut.", "Standard PNG/JPEG and additional framing controls show a black-on-white preview independent of logo colours. Each variant retains its canvas occupancy per dimension across all its colours. Legacy shared values remain defaults."],
    ["Le guide choisit automatiquement les couleurs de texte et de repères dans la palette finale, et le logo parmi les versions disponibles selon le fond réel. Une couleur ou version choisie manuellement reste prioritaire ; Automatique réactive le calcul. L’épaisseur des zones de sécurité reste inchangée. La typographie d’accent est optionnelle et réservée aux légendes. Les rôles de couleurs sont recherchables et les rôles personnalisés sont réutilisables et sauvegardés.", "The guide automatically selects text and guide colours from the final palette and real logo versions according to the actual background. Manual colours and logo choices remain authoritative; Automatic restores contrast calculation. Clearspace stroke widths are unchanged. Accent typography is optional and limited to captions. Colour roles are searchable; custom roles are reusable and saved."],
    ["Les appels IA utilisent des réponses JSON complètes, sans streaming. Une réponse vide ou limitée en sortie est retentée une fois ; une proposition tronquée est refusée sans application partielle. Les résultats des outils sont confirmés au fournisseur. Toute modification IA reste une proposition à appliquer explicitement, y compris les modes automatiques, les rôles et la typo d’accent.", "AI calls use complete JSON responses without streaming. Empty or output-limited responses are retried once; truncated proposals cannot be partially applied. Tool results are acknowledged to the provider. All AI changes remain explicit proposals, including automatic modes, colour roles and accent typeface."],
  ]],
  [
    ["Dimensions et livraison unique", "Dimensions and unified delivery"],
    [
      [
        "Les tailles standards 1000, 2000, 3000, 4000 et 5000 px sont cochables séparément. Les cas d’usage (profil, story, bannière, favicon, signature) et les formats personnalisés avec nom obligatoire sont distincts. Les tailles standards et les dimensions supplémentaires possèdent un cadrage par variante, partagé entre ses couleurs : logo centré, proportions fixes, poignées et curseur, 80 % par défaut. Le réglage d’un profil ne modifie pas une story ni une taille standard.",
        "Standard sizes 1000, 2000, 3000, 4000 and 5000 px are independently selectable. Use cases (profile, story, banner, favicon, signature) and custom formats with required names are separate. Standard and additional dimensions have framing per logo variant, shared across its colors: centered logo, fixed proportions, handle and slider, 80% by default. A profile adjustment does not change a story or a standard size.",
      ],
      [
        "Le ZIP utilise (NOM) LOGOKIT/LOGOS/Variante/WEB/PNG, SVG, JPEG ; PRINT sépare PDF, PNG et JPEG 300 DPI dans leurs sous-dossiers ; CAS D’USAGE sépare chaque nom de format puis PNG et JPEG à 72 DPI. Les dimensions standards ne deviennent jamais des cas d’usage. CLEARSPACE/Variante sépare aussi SVG, PNG et PDF. Le TXT contient chaque couleur, son nom, HEX, RVB et CMJN approximatif sans profil ICC.",
        "ZIP structure is (NAME) LOGOKIT/LOGOS/Variant/WEB/PNG, SVG, JPEG; PRINT separates PDF, PNG and JPEG at 300 DPI into format folders; CAS D’USAGE separates each named use case, then PNG and JPEG at 72 DPI. Standard dimensions never become use cases. CLEARSPACE/Variant also separates SVG, PNG and PDF. TXT includes every palette color, name, HEX, RGB and approximate CMYK without an ICC profile.",
      ],
      [
        "Plusieurs couleurs propose aussi icône et logotype de couleurs différentes, uniquement dans la palette. Ces suggestions sont décochées par défaut et présentées progressivement. Un dégradé créé est disponible sur chaque variante compatible ; son identifiant partage les modifications sans fusionner les dégradés distincts.",
        "Multiple colors also offers different icon and wordmark colors exclusively from the palette. These suggestions start unchecked and appear progressively. A created gradient is available on every compatible variant; its identifier shares edits without merging distinct gradients.",
      ],
    ],
  ],
  [
    [
      "Trois parcours, un inspecteur contextuel",
      "Three workflows, a contextual inspector",
    ],
    [
      [
        "L’accueil propose exactement Variantes à créer, Variantes déjà prêtes et Juste la zone de sécurité. Les deux premiers parcours partagent couleurs, dégradés et livraisons. Variantes à créer combine les variantes générées depuis icon / wordmark et les SVG complets supplémentaires de ready. Variantes déjà prêtes utilise uniquement ready. Le troisième réutilise les SVG assemblés : plusieurs imports, un SVG par version, renommage, mesure et export de planches uniquement. Aucun réglage de palette ni recoloration. Les peintures, dégradés et opacités d’origine restent conservés, même sur les planches de ce mode.",
        "Home offers exactly Create variants, Ready-made variants and Just clear space. The first two workflows share colors, gradients and deliveries. Create variants combines variants generated from icon / wordmark with additional complete SVGs in ready. Ready-made variants uses ready only. The third reuses assembled SVGs: multiple imports, one SVG per version, renaming, measurement and board exports only. No palette settings or recoloring. Original paints, gradients and opacities remain preserved, including on this mode’s boards.",
      ],
      [
        "Pour une variante générée, l’inspecteur affiche une tâche à la fois : Composition, Position, Guides ou Tailles minimales. Les tailles indépendantes et l’espacement sont dans Composition, les positions et largeurs dans Position, grille et magnétisme dans Guides, les tailles minimales dans Tailles minimales. Cliquer/déplacer un élément cible sa position. Le zoom reste au-dessus du canvas ; Mode focus masque les panneaux et Afficher les panneaux les restaure.",
        "For a generated variant, the inspector shows one task at a time: Composition, Position, Guides or Minimum sizes. Independent sizes and spacing are in Composition, positions and widths in Position, grid and snapping in Guides, minimum sizes in Minimum sizes. Clicking/dragging an element targets its position. Zoom stays above the canvas; Focus mode hides panels and Show panels restores them.",
      ],
      [
        "Zone de sécurité propose Automatique, Utiliser une partie du logo et Mesurer directement sur le logo. Définir visuellement active le dessin d’un carré, dans toutes les directions, avec dimension en direct. Le magnétisme vise les bords des éléments ; Alt le désactive. Au relâchement, la dimension devient immédiatement X1 et le multiplicateur passe à 1. Le nom reste modifiable dans Guides. Échap abandonne le dessin en cours. Les corrections numériques, les anciens repères et multiplicateurs restent disponibles.",
        "Clear space offers Automatic, Use part of the logo and Measure on the logo. Define visually draws a square in any direction, displaying its dimension live. Snapping targets element bounds; Alt disables it. On release, the dimension immediately becomes X1 and the multiplier becomes 1. Rename it in Guides. Escape cancels drawing. Numeric corrections, legacy references and multipliers remain available.",
      ],
      [
        "La mesure et son nom sont enregistrés dans .binksy V3 et dans Undo/Redo. Le carré temporaire n’entre jamais dans les exports. Le nom apparaît sur les planches et les recommandations. Appliquer à d’autres versions copie dimension, description, méthode et multiplicateur aux seules versions cochées, sans modifier leurs tailles ni leurs noms. C’est une copie en unités SVG, pas une normalisation automatique entre fichiers à échelles différentes.",
        "The measurement and its name are stored in .binksy V3 and Undo/Redo. The temporary square never enters exports. Its name appears on boards and recommendations. Apply to other versions copies the dimension, description, method and multiplier only to checked versions, without changing their sizes or names. This copies SVG units; it does not automatically normalize files with different scales.",
      ],
    ],
  ],
  [
    ["Palette et réglages partagés", "Palette and shared settings"],
    [
      [
        "La palette est visible dès Importer, sous les imports, puis accessible dans l’inspecteur de Versions du logo. Elle est absente du mode Juste la zone de sécurité. Cliquer sur un swatch ou Ajouter une couleur ouvre un éditeur avec sélecteur natif, HEX, nom et suppression. Appliquer valide ; Annuler abandonne. La palette peut être créée avant tout SVG. Les imports complètent les couleurs existantes sans doublon ni suppression.",
        "The color palette is visible in Import below the upload blocks and accessible in the Logo versions inspector. It is absent from Just clear space mode. Click a swatch or Add color to open an editor with a native picker, HEX, name and deletion. Apply saves; Cancel discards. Create the palette before any SVG. Imports supplement existing colors without duplicates or removal.",
      ],
      [
        "Les nouveaux projets affichent la grille et les guides de protection par défaut. Leur désactivation reste sauvegardée, y compris dans les anciens projets. Ces options ne changent ni les mesures de clearspace ni les planches d’export.",
        "New projects show the grid and protection guides by default. Disabling them remains saved, including in older projects. These options change neither clearspace measurements nor export boards.",
      ],
      [
        "Appliquer un dégradé met à jour toutes les variantes de même gradient.id : stops, couleurs, positions, angle, mode et participation. Les IDs différents restent indépendants même à couleurs identiques. La sélection reste intacte ; Undo/Redo et la réouverture V3 conservent la définition partagée.",
        "Applying a gradient updates every variant with the same gradient.id: stops, colors, positions, angle, mode and participation. Different IDs remain independent even with identical colors. Selection stays intact; Undo/Redo and V3 reopening preserve the shared definition.",
      ],
    ],
  ],
  [
    ["1. Automatique, puis modifier", "1. Automatic, then edit"],
    [
      [
        "Parcours : Importer → Assembler le logo → Versions du logo → Exporter → Brand Guideline. Le mode Juste la zone de sécurité passe directement d’Importer à Zone de sécurité puis Exporter. Binksy analyse les SVG, prépare les compositions et propose les couleurs sans configuration obligatoire. L’utilisateur vérifie les résultats puis exporte. Réutiliser ses corrections explicites ; ne jamais les remplacer silencieusement par des recommandations.",
        "Workflow: Import → Build → Variants → Export → Brand Guideline. Binksy analyzes SVGs, prepares compositions and suggests colors without mandatory configuration. The user reviews the results and exports. Reuse explicit corrections; never silently replace them with recommendations.",
      ],
      [
        "Les étapes sont accessibles librement après un premier import. Réglages avancés, Ajuster les couleurs manuellement, Personnaliser les combinaisons et Personnaliser l’export sont facultatifs. Chaque choix visuel montre le vrai logo.",
        "Steps are freely accessible after the first import. Advanced settings, Adjust colors manually, Customize combinations and Customize export are optional. Every visual choice shows the actual logo.",
      ],
    ],
  ],
  [
    ["2. Importer", "2. Import"],
    [
      [
        "Importer une icône et/ou un logotype séparés. Sous ces imports, Variantes déjà prêtes → Ajouter une variante SVG accepte plusieurs compositions complètes, sans limite de nombre imposée par l’interface. Chaque carte permet de prévisualiser, renommer, remplacer le SVG et supprimer la variante. Un nom déjà utilisé reçoit un suffixe numérique pour éviter les collisions d’export. Le remplacement conserve le nom, la sélection de construction, les mesures et tailles minimales ; les choix de couleurs générés sont recalculés. Binksy détecte les formes, couleurs, dégradés et centres optiques. Les couleurs détectées enrichissent la palette sans supprimer les couleurs existantes. Les ressources externes et images intégrées sont refusées.",
        "Import a separate icon and/or wordmark. Below these imports, Ready-made variants → Add an SVG variant accepts multiple complete compositions, with no interface-imposed count limit. Each card offers preview, rename, SVG replacement and removal. Duplicate names receive a numeric suffix to avoid export collisions. Replacement keeps the name, construction selection, measurements and minimum sizes; generated color choices are recalculated. Binksy detects shapes, colors, gradients and optical centers. Detected colors enrich the palette without removing existing colors. External resources and embedded images are rejected.",
      ],
      [
        "Les dégradés importés linéaires et radiaux sont conservés. Pour du texte simple, charger la police exacte OTF/TTF avant le SVG. Les textes complexes doivent être vectorisés dans le logiciel source. Les noms utilisateur ne sont pas traduits.",
        "Imported linear and radial gradients are preserved. For simple text, load the exact OTF/TTF font before the SVG. Complex text must be outlined in the source application. User names are not translated.",
      ],
    ],
  ],
  [
    ["3. Construire", "3. Build"],
    [
      [
        "Choisir Horizontal, Vertical, Icône, Logotype ou une variante prête dans les previews. Une variante prête reste un SVG complet : ne jamais la décomposer, la recomposer ni la remplacer automatiquement par une reconstruction icon / wordmark. Sa structure vectorielle et sa construction graphique sont conservées par le moteur SVG sécurisé. Aucun espacement, alignement, positionnement ou redimensionnement des composants ne s’applique à ready ; seuls Guides et Tailles minimales sont disponibles. Pour les variantes générées, seuls les réglages de cette construction apparaissent : tailles indépendantes, espacement, alignement et centrage. Le centrage géométrique utilise les limites, le centrage optique la masse opaque. Les deux choix montrent leur résultat.",
        "Choose Horizontal, Vertical, Icon, Wordmark or a ready-made variant in the previews. A ready-made variant remains a complete SVG: never split, recompose or automatically replace it with an icon / wordmark reconstruction. The secure SVG engine preserves its vector structure and graphic construction. Component spacing, alignment, positioning and resizing never apply to ready; only Guides and Minimum sizes are available. For generated variants, only that construction’s controls appear: independent sizes, spacing, alignment and centering. Geometric centering uses bounds; optical centering uses opaque mass. Both show their result.",
      ],
      [
        "Les proportions sont verrouillées. Une largeur recalcule seulement la hauteur du même élément. Les poignées redimensionnent au pixel ; Alt autorise les fractions. Les flèches sur une poignée changent la hauteur de 1 px. Position contient les positions X/Y et largeurs ; Guides contient la grille et le magnétisme ; le zoom est au-dessus du canvas. X = hauteur actuelle du logotype / 2. Le déplacement utilise le snap ¼X ; Alt le désactive. Undo/Redo conserve les réglages.",
        "Proportions are locked. A width changes only the same element’s height. Handles resize to whole pixels; Alt allows fractions. Arrow keys on a handle change height by 1 px. Position contains X/Y positions and widths; Guides contains grid and snapping; zoom is above the canvas. X = current wordmark height / 2. Dragging uses ¼X snapping; Alt disables it. Undo/Redo retains settings.",
      ],
    ],
  ],
  [
    ["4. Couleurs du logo", "4. Logo colors"],
    [
      [
        "Modifier les couleurs du logo ouvre les réglages à la demande. Les variantes générées et prêtes utilisent les mêmes rôles. Les fills, strokes et stops de dégradés sont analysés sans aplatir ni rasteriser les SVG. Chaque couleur distincte reste indépendante ; les peintures identiques partagent un rôle, y compris entre variantes. Modifier un rôle partagé suit toutes ses utilisations. Les pastilles Couleur 1, 2, 3… regroupent les peintures identiques. Cliquer une pastille surligne les formes correspondantes dans la preview dédiée. Ajuster les couleurs manuellement permet de renommer, corriger, conserver une couleur dans les variations, séparer les éléments et fusionner les couleurs identiques ayant le même état de verrouillage.",
        "Edit logo colors opens controls on demand. Generated and ready-made variants use the same roles. Fills, strokes and gradient stops are analyzed without flattening or rasterizing SVGs. Each distinct color stays independent; identical paints share a role across variants. Editing a shared role updates every use. Color 1, 2, 3… chips group identical paints. Clicking a chip highlights matching shapes in its dedicated preview. Adjust colors manually allows renaming, correcting, retaining a color in variations, splitting elements and merging identical colors with matching lock state.",
      ],
      [
        "Le moteur conserve ses rôles et indices de nœuds ; ils ne sont pas nécessaires à l’utilisation. Une correction de couleur ou un verrou se propage aux rôles partagés de même identifiant. Séparer crée des identifiants indépendants. Les masques et tracés de découpe ne sont pas recolorés. Corriger une couleur ou la palette réinitialise les sélections générées pour éviter des choix périmés.",
        "The engine retains roles and node indices; using the app does not require knowing them. A color correction or lock propagates to shared roles with the same identifier. Splitting creates independent identifiers. Masks and clipping geometry are not recolored. Color or palette edits reset generated selections to avoid stale choices.",
      ],
    ],
  ],
  [
    ["5. Variantes et dégradés", "5. Variants and gradients"],
    [
      [
        "Une seule catégorie apparaît à la fois : Original, Une seule couleur, Plusieurs couleurs, Dégradés ou JPEG. Original et Une seule couleur affichent directement leur catalogue complet, par pages de 12 avec Précédente / Suivante et accès au numéro de page. Toutes les couleurs distinctes de la palette sont accessibles pour chaque version active ; une couleur identique à l’original reste dans Original pour éviter les doublons. Les verrous restent prioritaires. Un compteur indique les versions sélectionnées. Recommandées présélectionne originales et couleurs simples ; dans Plusieurs couleurs et Dégradés, Tout voir ouvre le catalogue paginé BigInt sans matérialiser le produit cartésien. Système complet sélectionne toutes les combinaisons possibles et réactive toutes les versions ; Personnaliser les combinaisons conserve les sélections globales et individuelles. Les limites d’export par lot restent signalées sans limiter le catalogue.",
        "Only one category appears at a time: Original, One color, Multiple colors, Gradients or JPEG. Original and One color show their complete catalog directly, 12 previews per page with Previous / Next and page-number access. Every distinct palette color is accessible for each enabled version; a color identical to the original stays in Original to avoid duplicates. Locks still take priority. A counter shows selected versions. Recommended preselects originals and single colors; in Multiple colors and Gradients, View all opens the paginated BigInt catalog without materializing the Cartesian product. Complete system selects every possible combination and re-enables all versions; Customize combinations retains bulk and individual selection. Export batch limits remain visible without restricting the catalog.",
      ],
      [
        "Créer un dégradé ouvre un brouillon manuel : aucun dégradé automatique. Ajouter des points sans limite fixe, déplacer les points, choisir une couleur de palette ou une variation claire/foncée OKLab, régler les positions et l’angle. Application du dégradé choisit remplissage, tracé ou les deux, opacité du tracé et participation de chaque forme. Survoler ou cibler au clavier une forme l’isole dans l’aperçu. Les autres formes conservent leurs peintures. Les changements ne sont enregistrés qu’avec Appliquer.",
        "Create a gradient opens a manual draft; gradients are no longer automatic. Add points without a fixed cap, move points, choose palette colors or lighter/darker OKLab shades, positions and angle. Gradient application chooses fill, stroke or both, stroke opacity and individual shape participation. Hover or focus a shape to isolate it in the preview. Other shapes retain their paints. Changes are saved only with Apply.",
      ],
      [
        "Automatique conserve la géométrie d’un dégradé importé et recolore ses stops ; pour les aplats, il choisit un espace commun sauf si le SVG indique un dégradé par forme. Global partage les coordonnées sur la composition avec userSpaceOnUse, sans fusionner les tracés. Par forme applique le dégradé complet à chaque forme avec objectBoundingBox. Les transformations des formes sont compensées en mode global. Les couleurs verrouillées sont préservées. Formes participant au dégradé permet d’exclure une zone ; séparer d’abord ses éléments pour une exclusion individuelle.",
        "Automatic retains imported gradient geometry and recolors stops; for solid paints it chooses a shared space unless the SVG indicates per-shape gradients. Global shares coordinates across the composition using userSpaceOnUse without merging paths. Per shape applies the complete gradient to each shape using objectBoundingBox. Shape transforms are compensated in global mode. Locked colors are preserved. Shapes participating in the gradient lets users exclude a zone; individual shape exclusions are available in Gradient application.",
      ],
    ],
  ],
  [
    ["6. Protection et tailles minimales", "6. Clearspace and minimum sizes"],
    [
      [
        "Binksy propose une protection fondée sur la hauteur du logotype. Si cette référence manque, il utilise le petit côté visible du logo, notamment pour un SVG assemblé ou une icône seule. Une référence manuelle existante reste prioritaire. Chaque variante prête possède ses propres règles de clearspace et tailles minimales ; la zone entoure le SVG complet, indépendamment du logotype du projet. Le canvas montre la zone de sécurité. Le multiplicateur actif (0,5x / 1x / 1,5x / 2x) est orange et reflété par aria-pressed ; son état est conservé par variante, dans Undo/Redo et après réouverture. Guides révèle mesures et multiplicateurs ; Tailles minimales révèle les tailles minimales en mm et px. Les valeurs sont des recommandations à vérifier visuellement.",
        "Binksy suggests clearspace based on wordmark height. If that reference is missing, it uses the visible logo’s shorter side, including assembled SVGs and standalone icons. Existing manual references take priority. Each ready-made variant has its own clearspace rules and minimum sizes; the zone surrounds the complete SVG independently of the project wordmark. The canvas shows clear space. The active multiplier (0.5x / 1x / 1.5x / 2x) is orange and reflected by aria-pressed; its state persists per variant, in Undo/Redo and after reopening. Guides exposes measurements and multipliers; Minimum sizes exposes minimum sizes in mm and px. Values are recommendations to review visually.",
      ],
      [
        "Les planches claires/foncées sont transparentes, séparées dans CLEARSPACE/Variante/. Elles sont monochromes dans les deux modes Logo Kit ; Juste la zone de sécurité conserve les couleurs d’origine du logo et adapte uniquement la couleur des guides. La protection ne change jamais les dimensions des exports du logo. Les tailles minimales sont des recommandations séparées.",
        "Light/dark boards are transparent, separate in CLEARSPACE/Variant/. They are monochrome in both Logo Kit modes; Just clear space preserves original logo colors and changes only the guides’ color. Clearspace never changes exported logo dimensions. Minimum sizes are separate recommendations.",
      ],
    ],
  ],
  [
    ["7. Exporter", "7. Export"],
    [
      [
        "Les variantes générées et prêtes participent à la même famille de couleurs, aux sélections et à tous les formats. {variant} utilise le nom personnalisé, également utilisé pour les dossiers du ZIP. Exporter le Logo Kit complet livre la sélection actuelle dans un ZIP avec recommandations, sans choix Web / Print / Complet. Entrer dans Exporter active directement SVG, PNG, JPEG et PDF, même après un ancien choix Web ou Print ; les anciens pixels restent disponibles, WEB utilise 72 DPI et PRINT 300 DPI dans les métadonnées. Le mode Juste la zone de sécurité conserve ses formats transparents. Personnaliser l’export reste facultatif pour modifier formats, dimensions multiples, destinations, contraste, clearspace, nommage, séparateur et casse.",
        "Generated and ready-made variants participate in the same color family, selections and all formats. {variant} uses the custom name, also used for ZIP folders. Export the complete Logo Kit delivers the current selection in a ZIP with recommendations, without Web / Print / Complete choices. Entering Export directly enables SVG, PNG, JPEG and PDF, including after an older Web or Print choice; legacy pixel dimensions remain available; WEB uses 72 DPI and PRINT uses 300 DPI in actual metadata. Just clear space keeps its transparent formats. Customize export remains optional for formats, multiple dimensions, destinations, contrast, clearspace, naming, separator and case.",
      ],
      [
        "Seul JPEG reçoit un fond. PNG et JPEG partagent un cadrage centré et proportionnel par variante et par dimension, réglable dans Taille du logo dans l’image. SVG, PNG et PDF sont transparents. Le canvas ne modifie pas les fichiers. L’onglet JPEG montre le vrai fond et la marge, par pages de 12. Il propose la sélection actuelle ou chaque catégorie du catalogue. Les cases règlent chaque JPEG ; une section secondaire partage une association avec les autres versions. Les nouvelles exceptions individuelles priment sur les règles partagées ; la priorité historique règles globales/anciennes exceptions reste conservée. Revenir aux recommandations efface ces associations manuelles ; les exclusions de fichiers restent indépendantes. Seuil sRGB par défaut 3:1, réglable à 4,5:1 ou 7:1 ; ce tri ne certifie pas l’accessibilité. Fichiers à exporter permet de filtrer puis exclure chaque fichier, planches comprises. Pas de limite de 500 fichiers ; génération séquentielle et ZIP par morceaux, limite mémoire de 256 Mo. La préparation du catalogue garde un plafond de 10 000 déclinaisons pour éviter une expansion combinatoire incontrôlée.",
        "Only JPEG receives a background. PNG and JPEG share centered proportional framing per variant and dimension, adjustable in Logo size in the image. SVG, PNG and PDF are transparent. The canvas does not alter files. The JPEG tab shows actual backgrounds and margins, 12 previews per page. It offers the current selection or each catalog category. Checkboxes control each JPEG; a secondary section shares a pairing with other versions. New individual exceptions override shared rules; historical global/legacy precedence remains preserved. Reset recommendations clears manual pairings; file exclusions remain independent. Default sRGB threshold is 3:1, adjustable to 4.5:1 or 7:1; this filter does not certify accessibility. Files to export filters and excludes individual files, including boards. No 500-file limit; sequential generation and chunked ZIP with a 256 MB memory guard. Catalog preparation retains a 10,000-variant guard against uncontrolled combinatorial expansion.",
      ],
      [
        "Nommage : {brand}, {variant}, {orientation}, {color}, {background}, {format}, {size}. Séparateur -, _ ou . ; casse configurable ; une seule arborescence. Les collisions reçoivent un suffixe. PDF refuse filtres, masques et motifs complexes sans secours bitmap. Les couleurs sont RVB, sans conversion ICC/CMJN ni certification Illustrator/Figma/Affinity.",
        "Naming: {brand}, {variant}, {orientation}, {color}, {background}, {format}, {size}. Separator -, _ or .; configurable case; a single folder structure. Collisions get a suffix. PDF rejects complex filters, masks and patterns without bitmap fallback. Colors are RGB, without ICC/CMYK conversion or Illustrator/Figma/Affinity certification.",
      ],
    ],
  ],
  [
    [
      "8. Sauvegarde, langue et vérification",
      "8. Saving, language and verification",
    ],
    [
      [
        "La sauvegarde locale et la clé historique binksy-logo-system restent actives. Sauvegarder .binksy conserve SVG, dimensions indépendantes, palette, rôles, verrous, dégradés et stops, exclusions, sélections et exports. ready est une liste additive en V3, également en mode compose ; un ancien projet sans ready reste valide. Lors de toute préparation ou modification par un agent, conserver les entrées ready, leurs SVG, identifiants, noms, rôles, mesures et tailles minimales. Les fichiers V1/V2 migrent vers V3 en préservant leurs dimensions visibles. FR/EN est mémorisé sur l’appareil ; les noms et SVG utilisateur ne sont jamais traduits.",
        "Local saving and the historical binksy-logo-system key remain active. Save .binksy retains SVGs, independent dimensions, palette, roles, locks, gradients and stops, exclusions, selections and exports. ready is an additive V3 list, also in compose mode; older projects without ready remain valid. When an agent prepares or edits a project, preserve ready entries, SVGs, IDs, names, roles, measurements and minimum sizes. V1/V2 files migrate to V3 while preserving visible dimensions. FR/EN is remembered on the device; user names and SVGs are never translated.",
      ],
      [
        "La suppression d’un projet exige une confirmation. Annuler ne change rien. Elle ne supprime pas les fichiers exportés et ne s’annule pas avec Undo. Vérifier imports, verrous, dégradés, transparence, ZIP et réouverture .binksy avant livraison. Tester les parcours dans les deux langues, sur une origine dédiée aux projets synthétiques.",
        "Deleting a project requires confirmation. Cancel changes nothing. Deletion does not remove exported files and cannot be undone with Undo. Verify imports, locks, gradients, transparency, ZIP and .binksy reopening before delivery. Test workflows in both languages on a dedicated origin for synthetic projects.",
      ],
    ],
  ],
];
export function agentContent() {
  const index = language() === "en" ? 1 : 0;
  return sections
    .map(
      ([title, paragraphs]) =>
        `<section><h2>${title[index]}</h2>${paragraphs.map((p) => `<p>${p[index]}</p>`).join("")}</section>`,
    )
    .join("");
}

// V4 additions describe the shipped controls and the actual PDF limitations.
sections.unshift([
  ["Brand Guideline et assistant · V5", "Brand Guideline and assistant · V5"],
  [
    [
      "Le parcours suit Importer, Assembler, Versions, Exporter puis Brand Guideline. Avant génération, sept étapes préparent les polices, la palette finale, les Pantone facultatifs, toutes les associations texte/fond à valider ou éviter, la couverture, jusqu’à trois mockups et les interdits. Les anciennes sauvegardes restent importables ; les nouvelles utilisent V5.",
      "The workflow follows Import, Assemble, Versions, Export, then Brand Guideline. Before generation, seven steps prepare fonts, the final palette, optional Pantone references, every foreground/background pairing to approve or avoid, the cover, up to three mockups and logo misuses. Older saves remain importable; new saves use V5.",
    ],
    [
      "Les seuls formats sont 16:9, A4 paysage et A4 portrait. Les titres sont mesurés et les corps de texte compacts. Le thème partage fonds, texte, accent, marges et espacements. La bibliothèque permet ajout, duplication, suppression et déplacement de pages par glisser-déposer ou boutons. Le canvas partage le rendu SVG utilisé par les exports ; le zoom ne change pas les dimensions du document.",
      "The only formats are 16:9, A4 landscape and A4 portrait. Titles and body copy use restrained sizes. The theme shares backgrounds, text, accent, margins and spacing. The library supports adding, duplicating, deleting and reordering pages by drag and drop or buttons. The canvas shares the SVG export renderer; zoom does not change document dimensions.",
    ],
    [
      "Les neuf pages de marque sont facultatives et conservent le contenu fourni. Les couleurs de mise en page proviennent de la palette finale. Chaque rôle typographique, y compris Légende, garde sa propre police, taille, interlignage et tracking ; Accent reste un rôle distinct. Instrument Sans reste disponible localement sous licence SIL OFL.",
      "The nine brand-content pages are optional and retain supplied copy. Layout colors come from the final palette. Every type role, including Caption, keeps its own font, size, line spacing and tracking; Accent remains a separate role. Instrument Sans remains bundled locally under SIL OFL.",
    ],
    [
      "Sélectionnez un élément pour le déplacer, redimensionnez avec la poignée ou les valeurs précises. Double-cliquez un texte pour le saisir sur la page. Importez vos JPEG/PNG/WebP et polices TTF/OTF. Les images restent des ressources réutilisées, avec cadrage et zoom ; les polices peuvent être affectées aux rôles typographiques. Aucun visuel n’est généré par IA. Les modifications utilisent l’historique et la sauvegarde locale, avec IndexedDB lorsque les médias dépassent le quota localStorage.",
      "Select an element to move it, resize using its handle or precise values. Double-click text to edit on the page. Import your own JPEG/PNG/WebP and TTF/OTF fonts. Images remain shared resources with crop and zoom; fonts can be assigned to typographic roles. No images are AI-generated. Changes use history and local saving, with IndexedDB when media exceeds the localStorage quota.",
    ],
    [
      "Le PDF conserve les logos et formes en vectoriel et incorpore les TTF. Les textes OTF sont convertis en tracés. Les grandes images sont transmises au moteur PDF par URL temporaire afin d’éviter un dépassement de pile, sans modifier le projet ni rasteriser la page. Seuls les exemples flou/lueur deviennent raster. Aucun CMJN ICC ni calque Illustrator n’est garanti.",
      "PDF retains vector logos and shapes and embeds TTF fonts. OTF text is outlined. Large images are passed to the PDF engine through temporary URLs to prevent call-stack overflow, without changing the project or rasterizing the page. Only blur/glow examples become raster. ICC CMYK and Illustrator layers are not guaranteed.",
    ],
    [
      "Les actions IA utilisent un bouton orange animé commun. Le modèle actif se change directement dans le chat. Le catalogue affiche uniquement les modèles compatibles images et outils, avec recherche instantanée et filtres Gratuit, Peu cher, Moyennement cher et Cher ; un ID non vérifié reste dans Avancé. Seul Appliquer modifie le projet et les clés restent séparées du .binksy.",
      "AI actions share an animated orange button style. The active model can be changed directly in the chat. The catalogue only shows models compatible with images and tools, with instant search and Free, Low cost, Mid-price and Expensive filters; an unverified ID remains under Advanced. Only Apply changes the project and keys stay outside the .binksy file.",
    ],
  ],
]);

sections.push([
  ["Réglages visibles et propositions ciblées", "Visible controls and scoped proposals"],
  [
    ["Dégradés : nom obligatoire, stops sélectionnables au clic ou au clavier et déplaçables. Les groupes de trois formes de même couleur ou plus utilisent un identifiant persistant ; dissocier rétablit les choix indépendants sans modifier les tracés SVG.", "Gradients require a name and support clickable, keyboard-selectable and draggable stops. Groups of three or more same-color shapes use a persistent identifier; unlinking restores independent choices without changing SVG paths."],
    ["Dimensions supplémentaires ajoute un onglet JPEG depuis un preset ou un format nommé. Le même réglage Taille du logo dans l’image est présent dans JPEG et chaque dimension exportée. Chaque aperçu reprend le ratio réel, dont 9:16 pour une Story, avec un cadrage propre au format et à la variante.", "Additional dimensions adds a JPEG tab from a preset or named custom size. The same Logo size in image control is available in JPEG and every exported size. Each preview uses the actual ratio, including 9:16 for a Story, with framing specific to the format and logo variant."],
    ["Le guide réutilise les graphiques de zone de sécurité sans leurs textes. Les tailles minimales utilisent les valeurs sources : mm × 72 / 25,4 en PDF, px × 0,75 pour le digital. Les exemples sont répartis sur plusieurs pages si nécessaire, sans réduction des tailles. Un exemple plus grand que la page doit être revu avant export. La hiérarchie présente famille, graisse et tailles, sans interlignage ni tracking. Les pages proposent les variantes et couleurs réelles. Les associations peuvent être recommandées, à éviter ou masquées.", "The guide reuses clear-space artwork without embedded labels. Minimum sizes use source values: mm × 72 / 25.4 in PDF, px × 0.75 for digital. Hierarchy shows family, weight and sizes, without leading or tracking. Pages offer real logo variants and colors. Color pairs may be recommended, avoided or hidden."],
    ["Avant le guide, les recommandations concernent zone de sécurité, taille minimale, noms et rôles des couleurs. Le contexte et une image sont préparés automatiquement. La configuration fournisseur est partagée, les clés restent hors .binksy. Aucun changement avant Appliquer.", "Before the guide, recommendations cover clear space, minimum size, color names and roles. Context and an image are prepared automatically. Provider configuration is shared and keys stay outside .binksy. No changes occur before Apply."],
    ["Le chat propose des actions sur pages, textes, couleurs, typographie, logos, images déjà importées, cadrages, visibilité, ordre et associations. Page actuelle limite les actions à son identifiant ; Tout le document permet une proposition groupée. La portée reste attachée à la proposition. Les données sources des étapes 01 à 04 restent en lecture seule. Une proposition s’annule en une opération. Importer un nouveau fichier nécessite l’utilisateur ; l’IA ne crée pas de média.", "The chat proposes actions on pages, text, colors, typography, logos, adding or removing elements, existing images, crops, visibility, order, pairs and guide export formats. Current page confines changes to its ID; Whole document permits grouped proposals. Scope stays attached to the proposal. Source data from steps 01–04 is read-only. A proposal undoes in one operation. Importing a new file requires the user; AI does not generate media."],
  ],
]);
