import { language } from "./i18n.js";
// Product documentation: paired FR/EN paragraphs.
const sections = [
  [["Trois parcours, un inspecteur contextuel", "Three workflows, a contextual inspector"], [
    ["L’accueil propose exactement Variantes à créer, Variantes déjà prêtes et Juste la zone de sécurité. Les deux premiers parcours conservent compositions, couleurs, dégradés et livraisons. Le troisième réutilise les SVG assemblés : plusieurs imports, un SVG par version, renommage, mesure et export de planches uniquement. Aucun réglage de palette ni recoloration. Les peintures, dégradés et opacités d’origine restent conservés, même sur les planches de ce mode.", "Home offers exactly Create variants, Ready-made variants and Just clear space. The first two workflows retain compositions, colors, gradients and deliveries. The third reuses assembled SVGs: multiple imports, one SVG per version, renaming, measurement and board exports only. No palette settings or recoloring. Original paints, gradients and opacities remain preserved, including on this mode’s boards."],
    ["L’inspecteur affiche une tâche à la fois : Composition, Position, Guides ou Plus de réglages. Les tailles indépendantes et l’espacement sont dans Composition, les positions et largeurs dans Position, grille et magnétisme dans Guides, les tailles minimales dans Plus de réglages. Cliquer/déplacer un élément cible sa position. Le zoom reste au-dessus du canvas ; Mode focus masque les panneaux et Afficher les panneaux les restaure.", "The inspector shows one task at a time: Composition, Position, Guides or More settings. Independent sizes and spacing are in Composition, positions and widths in Position, grid and snapping in Guides, minimum sizes in More settings. Clicking/dragging an element targets its position. Zoom stays above the canvas; Focus mode hides panels and Show panels restores them."],
    ["Zone de sécurité propose Automatique, Utiliser une partie du logo et Mesurer directement sur le logo. Définir visuellement active le dessin d’un carré, dans toutes les directions, avec dimension en direct. Le magnétisme vise les bords des éléments ; Alt le désactive. Le carré disparaît au relâchement, puis Cette mesure correspond à permet de le nommer. Utiliser cette mesure enregistre la dimension et la description ; Annuler ou Échap abandonne. Les corrections numériques, les anciens repères et multiplicateurs restent disponibles.", "Clear space offers Automatic, Use part of the logo and Measure on the logo. Define visually draws a square in any direction, displaying its dimension live. Snapping targets element bounds; Alt disables it. The square disappears on release, then This measurement represents lets users name it. Use this measurement saves the dimension and description; Cancel or Escape discards it. Numeric corrections, legacy references and multipliers remain available."],
    ["La mesure et son nom sont enregistrés dans .binksy V3 et dans Undo/Redo. Le carré temporaire n’entre jamais dans les exports. Le nom apparaît sur les planches et les recommandations. Appliquer à d’autres versions copie dimension, description, méthode et multiplicateur aux seules versions cochées, sans modifier leurs tailles ni leurs noms. C’est une copie en unités SVG, pas une normalisation automatique entre fichiers à échelles différentes.", "The measurement and its name are stored in .binksy V3 and Undo/Redo. The temporary square never enters exports. Its name appears on boards and recommendations. Apply to other versions copies the dimension, description, method and multiplier only to checked versions, without changing their sizes or names. This copies SVG units; it does not automatically normalize files with different scales."]
  ]],
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
        "Parcours : Importer → Assembler le logo → Versions du logo → Exporter. Le mode Juste la zone de sécurité passe directement d’Importer à Zone de sécurité puis Exporter. Binksy analyse les SVG, prépare les compositions et propose les couleurs sans configuration obligatoire. L’utilisateur vérifie les résultats puis exporte. Réutiliser ses corrections explicites ; ne jamais les remplacer silencieusement par des recommandations.",
        "Workflow: Import → Build → Variants → Export. Binksy analyzes SVGs, prepares compositions and suggests colors without mandatory configuration. The user reviews the results and exports. Reuse explicit corrections; never silently replace them with recommendations.",
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
        "Importer une icône et/ou un logotype séparés, ou un SVG par variante déjà assemblée. Binksy détecte les formes, couleurs, dégradés et centres optiques. Les couleurs détectées enrichissent la palette sans supprimer les couleurs existantes. Les ressources externes et images intégrées sont refusées.",
        "Import a separate icon and/or wordmark, or one SVG per assembled variant. Binksy detects shapes, colors, gradients and optical centers. Detected colors enrich the palette without removing existing colors. External resources and embedded images are rejected.",
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
        "Choisir Horizontal, Vertical, Icône ou Logotype dans les previews. Seuls les réglages de cette construction apparaissent : tailles indépendantes, espacement, alignement et centrage. Le centrage géométrique utilise les limites, le centrage optique la masse opaque. Les deux choix montrent leur résultat.",
        "Choose Horizontal, Vertical, Icon or Wordmark in the previews. Only that construction’s controls appear: independent sizes, spacing, alignment and centering. Geometric centering uses bounds; optical centering uses opaque mass. Both show their result.",
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
        "Modifier les couleurs du logo ouvre les réglages à la demande. Les pastilles Couleur 1, 2, 3… regroupent les peintures identiques. Cliquer une pastille surligne les formes correspondantes dans la preview dédiée. Ajuster les couleurs manuellement permet de renommer, corriger, conserver une couleur dans les variations, séparer les éléments et fusionner les couleurs identiques ayant le même état de verrouillage.",
        "Edit logo colors opens controls on demand. Color 1, 2, 3… chips group identical paints. Clicking a chip highlights matching shapes in its dedicated preview. Adjust colors manually allows renaming, correcting, retaining a color in variations, splitting elements and merging identical colors with matching lock state.",
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
        "Une seule catégorie apparaît à la fois : Original, Une seule couleur, Plusieurs couleurs, Dégradés ou JPEG. Un compteur indique les versions sélectionnées. Recommandées présélectionne originales et couleurs simples ; Tout voir ouvre le catalogue paginé BigInt sans matérialiser le produit cartésien. Système complet sélectionne toutes les combinaisons possibles et réactive toutes les versions ; Personnaliser les combinaisons conserve les sélections globales et individuelles. Les limites d’export par lot restent signalées sans limiter le catalogue.",
        "Only one category appears at a time: Original, One color, Multiple colors, Gradients or JPEG. A counter shows selected versions. Recommended preselects originals and single colors; View all opens the paginated BigInt catalog without materializing the Cartesian product. Complete system selects every possible combination and re-enables all versions; Customize combinations retains bulk and individual selection. Export batch limits remain visible without restricting the catalog.",
      ],
      [
        "Les dégradés suggérés utilisent les paires de palette et les variations claires/foncées OKLab à teinte constante, avec réduction de chroma dans le gamut sRGB. Modifier le dégradé ouvre un aperçu en direct, 2 à 32 stops déplaçables, leurs couleurs et positions, un angle et les presets horizontal, vertical, 45° et −45°. Les changements ne sont enregistrés qu’avec Appliquer.",
        "Suggested gradients use palette pairs and lighter/darker OKLab variations at constant hue, reducing chroma to fit the sRGB gamut. Edit gradient opens a live preview, 2 to 32 movable stops, colors and positions, an angle and horizontal, vertical, 45° and −45° presets. Changes are saved only with Apply.",
      ],
      [
        "Automatique conserve la géométrie d’un dégradé importé et recolore ses stops ; pour les aplats, il choisit un espace commun sauf si le SVG indique un dégradé par forme. Global partage les coordonnées sur la composition avec userSpaceOnUse, sans fusionner les tracés. Par forme applique le dégradé complet à chaque forme avec objectBoundingBox. Les transformations des formes sont compensées en mode global. Les couleurs verrouillées sont préservées. Formes participant au dégradé permet d’exclure une zone ; séparer d’abord ses éléments pour une exclusion individuelle.",
        "Automatic retains imported gradient geometry and recolors stops; for solid paints it chooses a shared space unless the SVG indicates per-shape gradients. Global shares coordinates across the composition using userSpaceOnUse without merging paths. Per shape applies the complete gradient to each shape using objectBoundingBox. Shape transforms are compensated in global mode. Locked colors are preserved. Shapes participating in the gradient lets users exclude a zone; split its elements first for individual exclusion.",
      ],
    ],
  ],
  [
    ["6. Protection et tailles minimales", "6. Clearspace and minimum sizes"],
    [
      [
        "Binksy propose une protection fondée sur la hauteur du logotype. Si cette référence manque, il utilise le petit côté visible du logo, notamment pour un SVG assemblé ou une icône seule. Une référence manuelle existante reste prioritaire. Le canvas montre la zone de sécurité. Guides révèle mesures et multiplicateurs ; Plus de réglages révèle les tailles minimales en mm et px. Les valeurs sont des recommandations à vérifier visuellement.",
        "Binksy suggests clearspace based on wordmark height. If that reference is missing, it uses the visible logo’s shorter side, including assembled SVGs and standalone icons. Existing manual references take priority. The canvas shows clear space. Guides exposes measurements and multipliers; More settings exposes minimum sizes in mm and px. Values are recommendations to review visually.",
      ],
      [
        "Les planches claires/foncées sont transparentes, séparées dans Clearspace/. Elles sont monochromes dans les deux modes Logo Kit ; Juste la zone de sécurité conserve les couleurs d’origine du logo et adapte uniquement la couleur des guides. La protection ne change jamais les dimensions des exports du logo. Les tailles minimales sont des recommandations séparées.",
        "Light/dark boards are transparent, separate in Clearspace/. They are monochrome in both Logo Kit modes; Just clear space preserves original logo colors and changes only the guides’ color. Clearspace never changes exported logo dimensions. Minimum sizes are separate recommendations.",
      ],
    ],
  ],
  [
    ["7. Exporter", "7. Export"],
    [
      [
        "Exporter le Logo Kit complet livre la sélection actuelle dans un ZIP avec recommandations. Les nouveaux projets proposent SVG, PNG, JPEG, PDF en 3000 px / 300 DPI. Les anciens projets conservent leurs formats. Presets Web : SVG/PNG, 1600 px / 144 DPI ; Print : SVG/PDF, 3000 px / 300 DPI ; Complet : les quatre formats. Personnaliser l’export donne accès aux formats, dimensions, DPI, marge JPEG, contraste, clearspace, dossiers, nommage, séparateur et casse.",
        "Export the complete Logo Kit delivers the current selection in a ZIP with recommendations. New projects suggest SVG, PNG, JPEG and PDF at 3000 px / 300 DPI. Older projects retain their formats. Web preset: SVG/PNG, 1600 px / 144 DPI; Print: SVG/PDF, 3000 px / 300 DPI; Complete: all four formats. Customize export exposes formats, dimensions, DPI, JPEG margin, contrast, clearspace, folders, naming, separator and case.",
      ],
      [
        "Seul JPEG reçoit un fond et une marge. SVG, PNG et PDF sont transparents. Le canvas ne modifie pas les fichiers. L’onglet JPEG montre le vrai fond et la marge, par pages de 12. Il propose la sélection actuelle ou chaque catégorie du catalogue. Les cases règlent chaque JPEG ; une section secondaire partage une association avec les autres versions. Les nouvelles exceptions individuelles priment sur les règles partagées ; la priorité historique règles globales/anciennes exceptions reste conservée. Revenir aux recommandations efface ces associations manuelles ; les exclusions de fichiers restent indépendantes. Seuil sRGB par défaut 3:1, réglable à 4,5:1 ou 7:1 ; ce tri ne certifie pas l’accessibilité. Fichiers à exporter permet de filtrer puis exclure chaque fichier, planches comprises. Limites : 500 fichiers et 256 Mo par lot.",
        "Only JPEG receives a background and margin. SVG, PNG and PDF are transparent. The canvas does not alter files. The JPEG tab shows actual backgrounds and margins, 12 previews per page. It offers the current selection or each catalog category. Checkboxes control each JPEG; a secondary section shares a pairing with other versions. New individual exceptions override shared rules; historical global/legacy precedence remains preserved. Reset recommendations clears manual pairings; file exclusions remain independent. Default sRGB threshold is 3:1, adjustable to 4.5:1 or 7:1; this filter does not certify accessibility. Files to export filters and excludes individual files, including boards. Limits: 500 files and 256 MB per batch.",
      ],
      [
        "Nommage : {brand}, {variant}, {orientation}, {color}, {background}, {format}, {size}. Séparateur -, _ ou . ; casse et dossiers configurables. Les collisions reçoivent un suffixe. PDF refuse filtres, masques et motifs complexes sans secours bitmap. Les couleurs sont RVB, sans conversion ICC/CMJN ni certification Illustrator/Figma/Affinity.",
        "Naming: {brand}, {variant}, {orientation}, {color}, {background}, {format}, {size}. Separator -, _ or .; configurable case and folders. Collisions get a suffix. PDF rejects complex filters, masks and patterns without bitmap fallback. Colors are RGB, without ICC/CMYK conversion or Illustrator/Figma/Affinity certification.",
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
        "La sauvegarde locale et la clé historique binksy-logo-system restent actives. Sauvegarder .binksy conserve SVG, dimensions indépendantes, palette, rôles, verrous, dégradés et stops, exclusions, sélections et exports. Les fichiers V1/V2 migrent vers V3 en préservant leurs dimensions visibles. FR/EN est mémorisé sur l’appareil ; les noms et SVG utilisateur ne sont jamais traduits.",
        "Local saving and the historical binksy-logo-system key remain active. Save .binksy retains SVGs, independent dimensions, palette, roles, locks, gradients and stops, exclusions, selections and exports. V1/V2 files migrate to V3 while preserving visible dimensions. FR/EN is remembered on the device; user names and SVGs are never translated.",
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
