import { language } from "./i18n.js";
// Product documentation: paired FR/EN paragraphs.
const sections = [
  [
    ["Palette et réglages partagés", "Palette and shared settings"],
    [
      [
        "La carte Palette de couleurs est visible dès Importer, sous les imports, puis dans Variantes. Cliquer sur un swatch ou Ajouter une couleur ouvre un éditeur avec sélecteur natif, HEX, nom et suppression. Appliquer valide ; Annuler abandonne. La palette peut être créée avant tout SVG. Les imports complètent les couleurs existantes sans doublon ni suppression.",
        "The Color palette card is visible in Import below the upload blocks, and in Variants. Click a swatch or Add color to open an editor with a native picker, HEX, name and deletion. Apply saves; Cancel discards. Create the palette before any SVG. Imports supplement existing colors without duplicates or removal.",
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
        "Parcours : Importer → Construire → Variantes → Exporter. Binksy analyse les SVG, prépare les compositions et propose les couleurs sans configuration obligatoire. L’utilisateur vérifie les résultats puis exporte. Réutiliser ses corrections explicites ; ne jamais les remplacer silencieusement par des recommandations.",
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
        "Les proportions sont verrouillées. Une largeur recalcule seulement la hauteur du même élément. Les poignées redimensionnent au pixel ; Alt autorise les fractions. Les flèches sur une poignée changent la hauteur de 1 px. Réglages avancés contient les positions X/Y, largeurs, grille, snap et zoom. X = hauteur actuelle du logotype / 2. Le déplacement utilise le snap ¼X ; Alt le désactive. Undo/Redo conserve les réglages.",
        "Proportions are locked. A width changes only the same element’s height. Handles resize to whole pixels; Alt allows fractions. Arrow keys on a handle change height by 1 px. Advanced settings contains X/Y positions, widths, grid, snapping and zoom. X = current wordmark height / 2. Dragging uses ¼X snapping; Alt disables it. Undo/Redo retains settings.",
      ],
    ],
  ],
  [
    ["4. Couleurs du logo", "4. Logo colors"],
    [
      [
        "Les pastilles Couleur 1, 2, 3… regroupent les peintures identiques. Cliquer une pastille surligne les formes correspondantes dans la preview dédiée. Ajuster les couleurs manuellement permet de renommer, corriger, conserver une couleur dans les variations, séparer les éléments et fusionner les couleurs identiques ayant le même état de verrouillage.",
        "Color 1, 2, 3… chips group identical paints. Clicking a chip highlights matching shapes in its dedicated preview. Adjust colors manually allows renaming, correcting, retaining a color in variations, splitting elements and merging identical colors with matching lock state.",
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
        "La galerie filtre Toutes, Originales, Couleurs simples, Multicolores et Dégradés. Les originales et couleurs simples sont sélectionnées par défaut. Ajouter individuellement les autres versions souhaitées. Voir toutes les combinaisons ouvre la pagination BigInt : ne jamais matérialiser le produit cartésien. Full System réactive les constructions et les recommandations ; les contrôles de sélection globale restent dans Personnaliser les combinaisons.",
        "The gallery filters All, Originals, Single colors, Multicolor and Gradients. Originals and single colors are selected by default. Add other desired versions individually. See all combinations opens BigInt pagination: never materialize the Cartesian product. Full System restores constructions and recommendations; bulk selection controls remain in Customize combinations.",
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
        "Binksy propose une protection fondée sur la hauteur du logotype. Si cette référence manque, il utilise le petit côté visible du logo, notamment pour un SVG assemblé ou une icône seule. Une référence manuelle existante reste prioritaire. Les previews montrent protection et taille minimale. Ajuster la protection révèle références et multiplicateurs ; Ajuster les tailles minimales révèle mm et px. Les valeurs sont des recommandations à vérifier visuellement.",
        "Binksy suggests clearspace based on wordmark height. If that reference is missing, it uses the visible logo’s shorter side, including assembled SVGs and standalone icons. Existing manual references take priority. Previews show clearspace and minimum size. Adjust protection reveals references and multipliers; Adjust minimum sizes reveals mm and px. Values are recommendations to review visually.",
      ],
      [
        "Les planches claires/foncées sont monochromes et transparentes, séparées dans Clearspace/. La protection ne change jamais les dimensions des exports du logo. Les tailles minimales sont des recommandations séparées.",
        "Light/dark boards are monochrome and transparent, separate in Clearspace/. Clearspace never changes exported logo dimensions. Minimum sizes are separate recommendations.",
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
        "Seul JPEG reçoit un fond et une marge. SVG, PNG et PDF sont transparents. Le canvas ne modifie pas les fichiers. Fonds recommandés conserve les associations globales couleur/fond et les anciennes exceptions. Seuil sRGB par défaut 3:1, réglable à 4,5:1 ou 7:1 ; ce tri ne certifie pas l’accessibilité. Sélection finale permet de filtrer puis exclure chaque fichier, planches comprises. Limites : 500 fichiers et 256 Mo par lot.",
        "Only JPEG receives a background and margin. SVG, PNG and PDF are transparent. The canvas does not alter files. Recommended backgrounds retains global color/background pairings and legacy exceptions. Default sRGB threshold is 3:1, adjustable to 4.5:1 or 7:1; this filter does not certify accessibility. Final selection filters and excludes individual files, including boards. Limits: 500 files and 256 MB per batch.",
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
