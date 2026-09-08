import { language } from "./i18n.js";
// Paired paragraphs keep operational instructions in both languages in one structure.
const sections = [
  [
    ["1. Décisions avant génération", "1. Decisions before generation"],
    [
      [
        "Ne jamais choisir arbitrairement un paramètre important. Une valeur par défaut ne constitue pas une validation. Réutiliser les décisions explicites ; sinon expliquer brièvement les options, recommander une option, donner la raison et demander la décision finale.",
        "Never choose an important setting arbitrarily. A default is not user approval. Reuse explicit decisions; otherwise briefly explain the options, recommend one, give the reason and request the final decision.",
      ],
      [
        "Avant de générer, confirmer : constructions, dimensions des deux éléments, espacement, centrage, palette, rôles et verrous, dégradés, clearspace, associations JPEG, formats, dimensions raster, nommage et fichiers retenus.",
        "Before generating, confirm: constructions, both element dimensions, spacing, centring, palette, roles and locks, gradients, clearspace, JPEG pairings, formats, raster dimensions, naming and selected files.",
      ],
    ],
  ],
  [
    ["2. Modes et entrées", "2. Modes and inputs"],
    [
      [
        "Variantes à créer : importer deux SVG, brandmark et logotype. Choisir horizontal, vertical, icône seule ou logotype seul. Variantes déjà prêtes : importer un SVG par construction, nommer chaque variante et conserver sa composition.",
        "Build variants: import two SVGs, a brandmark and a wordmark. Choose horizontal, vertical, icon only or wordmark only. Ready-made variants: import one SVG per construction, name each variant and retain its composition.",
      ],
      [
        "SVG locaux uniquement. Les ressources externes et images intégrées sont refusées. Un texte simple peut être vectorisé avec la police exacte OTF/TTF fournie ; demander la vectorisation des textes complexes. Les dégradés linéaires/radiaux et leurs stops sont conservés.",
        "Local SVGs only. External resources and embedded images are rejected. Simple text can be outlined using the supplied exact OTF/TTF font; request outlines for complex text. Linear/radial gradients and their stops are preserved.",
      ],
    ],
  ],
  [
    ["3. Dimensions, grille et centrage", "3. Dimensions, grid and centring"],
    [
      [
        "Les hauteurs et largeurs du brandmark et du logotype sont indépendantes, en pixels/unités SVG. Modifier une largeur recalcule uniquement la hauteur du même élément, et inversement. Les proportions restent verrouillées. Les quatre poignées de l’élément sélectionné permettent un redimensionnement au pixel ; Alt autorise les fractions de pixel. Les champs restent synchronisés. Les touches fléchées sur une poignée modifient la hauteur de 1 px.",
        "Brandmark and wordmark heights and widths are independent, in pixels/SVG units. Editing a width recalculates only the same element’s height, and vice versa. Proportions remain locked. Four handles on the selected element resize to whole pixels; Alt allows fractional pixels. Fields stay synchronised. Arrow keys on a handle change height by 1 px.",
      ],
      [
        "X = hauteur actuelle du logotype / 2. La grille commence au bord gauche et en haut du logotype, et passe par son bas. Déplacer les éléments avec le snap ¼X ; Alt libère le déplacement. Real Center utilise les limites géométriques ; Optical Center utilise la masse opaque. Recommander le centrage géométrique pour commencer puis faire valider les compensations optiques et les offsets.",
        "X = current wordmark height / 2. The grid starts at the wordmark’s left and top edges and passes through its bottom edge. Move elements with ¼X snapping; Alt disables snapping. Real Center uses geometric bounds; Optical Center uses opaque mass. Recommend geometric centring first, then ask approval for optical corrections and offsets.",
      ],
    ],
  ],
  [
    ["4. Rôles colorimétriques", "4. Colour roles"],
    [
      [
        "L’import regroupe les couleurs pleines identiques des fill, stroke et stops en rôles partagés. Examiner la liste et ses éléments avant génération. Renommer les rôles pour les rendre compréhensibles. Modifier leur couleur corrige l’original. Les corrections et verrous d’un rôle partagé se propagent aux assets du même identifiant. Verrouiller un rôle empêche sa recoloration. Séparer les éléments crée des rôles indépendants ; fusionner regroupe les couleurs et états de verrouillage identiques. Les masques et tracés de découpe ne sont pas recolorés.",
        "Import groups identical solid fill, stroke and stop colours into shared roles. Review the list and its elements before generation. Rename roles for clarity. Editing a role colour corrects the original. Shared-role corrections and locks propagate to assets with the same role identifier. Locking prevents recolouring. Split elements creates independent roles; merge groups identical colours and lock states. Masks and clipping geometry are not recoloured.",
      ],
      [
        "Demander quelles parties doivent rester fixes. Recommander le regroupement par couleur de marque lorsqu’il est voulu ; proposer la séparation pour deux éléments de même couleur qui doivent varier indépendamment. Les corrections de rôles ou de palette réinitialisent la sélection générée, pour éviter de livrer des choix périmés.",
        "Ask which parts must remain fixed. Recommend grouping by brand colour when intended; propose splitting two same-colour elements that must vary independently. Role or palette edits reset generated selections to prevent stale delivery choices.",
      ],
    ],
  ],
  [
    ["5. Combinaisons et dégradés", "5. Combinations and gradients"],
    [
      [
        "Les catégories sont Original, Couleurs simples, Variantes multicolores et Dégradés. Les rôles non verrouillés peuvent utiliser noir, blanc et chaque couleur unique de la palette. Toutes les affectations multicolores sont accessibles par pagination, sans charger tout le produit cartésien. Les affectations déjà couvertes par les couleurs simples ou l’original sont retirées lorsqu’elles sont identiques.",
        "Categories are Original, Single colours, Multicolour variants and Gradients. Unlocked roles can use black, white and every unique palette colour. All multicolour assignments are accessible through pagination without loading the whole Cartesian product. Assignments already covered by single colours or the original are removed when identical.",
      ],
      [
        "Les dégradés proposés utilisent chaque paire ordonnée de la palette et chaque couleur vers une version claire ou foncée. La variation utilise OKLab, à teinte constante, avec réduction de chroma pour rester dans le gamut sRGB. Modifier les deux couleurs et l’angle si nécessaire. Un gradient importé conserve sa géométrie dans l’original et dans les recolorations de stops. Les dégradés générés couvrent chaque asset continûment dans une nouvelle direction linéaire. Un stop verrouillé conserve sa peinture et sa structure de gradient, les autres stops restent modifiables. Examiner visuellement le résultat.",
        "Suggested gradients use every ordered palette pair and each colour towards a lighter or darker version. Variations use OKLab at constant hue, reducing chroma to fit the sRGB gamut. Edit both colours and the angle when needed. An imported gradient retains its geometry in the original and in stop recolourings. Generated gradients cover each asset continuously in a new linear direction. A locked stop retains its paint and gradient structure; other stops remain editable. Visually inspect the result.",
      ],
    ],
  ],
  [
    [
      "6. JPEG, contraste et transparence",
      "6. JPEG, contrast and transparency",
    ],
    [
      [
        "Les associations JPEG sont globales par couleur/combinaison et fond. Valider blanc → noir s’applique à toutes les constructions compatibles. Les anciens forçages par construction restent des exceptions tant qu’ils ne sont pas remplacés par une règle globale. Revenir aux recommandations retire les forçages. Les associations de combinaisons multicolores et dégradées apparaissent avec la page de couleurs examinée.",
        "JPEG pairings are global per colour/combination and background. Approving white → black applies to all compatible constructions. Legacy per-construction overrides remain exceptions until replaced by a global rule. Reset to recommendations removes overrides. Multicolour and gradient pairings appear for the colour page being reviewed.",
      ],
      [
        "Le ratio utilise la luminance sRGB linéarisée : (Lmax + 0,05) / (Lmin + 0,05). Seuils 3:1, 4,5:1 ou 7:1. Recommander 3:1 comme tri initial des signes graphiques, puis faire valider les associations. Les peintures et stops sont évalués conservativement ; effets, opacités et transitions nécessitent un contrôle visuel. Ce tri n’est pas une certification d’accessibilité.",
        "The ratio uses linearised sRGB luminance: (Lmax + 0.05) / (Lmin + 0.05). Thresholds are 3:1, 4.5:1 or 7:1. Recommend 3:1 for initial graphic-mark filtering, then ask approval for pairings. Paints and stops are evaluated conservatively; effects, opacity and transitions require visual review. This filter is not an accessibility certification.",
      ],
      [
        "Seul le JPEG a un fond opaque. SVG, PNG et PDF restent transparents. Le fond clair/sombre du canvas et la taille des previews ne changent jamais les fichiers. La marge JPEG est une fraction du petit côté du logo ; les dimensions raster définissent le canvas sans déformer le logo.",
        "Only JPEG has an opaque background. SVG, PNG and PDF stay transparent. The light/dark canvas and preview sizing never alter the files. JPEG margin is a fraction of the logo’s shorter side; raster dimensions define the canvas without distorting the logo.",
      ],
    ],
  ],
  [
    [
      "7. Clearspace, sélection et livraison",
      "7. Clearspace, selection and delivery",
    ],
    [
      [
        "Choisir largeur du brandmark, hauteur du brandmark ou hauteur du logotype, puis ×0,5 / ×1 / ×1,5 / ×2. La mesure s’applique tout autour. Pour un SVG déjà assemblé, demander la mesure de référence en coordonnées SVG ; ne pas l’inventer. Recommander une dimension reconnaissable, par exemple hauteur du logotype ×0,5, puis demander confirmation.",
        "Choose brandmark width, brandmark height or wordmark height, then ×0.5 / ×1 / ×1.5 / ×2. The measure applies on every side. For an assembled SVG, ask for the reference measurement in SVG coordinates; do not invent it. Recommend a recognisable dimension, such as wordmark height ×0.5, then request confirmation.",
      ],
      [
        "Les planches claire/foncée sont monochromes et transparentes, séparées dans Clearspace/. Elles ne modifient pas les dimensions du logo. Les recommandations de taille minimale restent des informations séparées.",
        "Light/dark boards are monochrome and transparent, separate in Clearspace/. They do not change logo dimensions. Minimum size recommendations remain separate information.",
      ],
      [
        "Les sections repliables indiquent les sélections. Tout sélectionner et Tout désélectionner respectent le filtre de construction ; Recommandées uniquement retient l’original et les couleurs simples. Les variantes multicolores et gradients demandent une sélection. Dans Sélection finale, filtrer construction, catégorie, format ou fond, puis cocher/décocher chaque fichier, y compris les planches clearspace. Les choix individuels restent modifiables et sont sauvegardés, même après un changement de nom de fichier. Choisir les formats et le clearspace dans Livraison. Vérifier le nombre exact de fichiers avant export, recommandations incluses pour un ZIP. Limites : 500 fichiers et 256 Mo par lot ; utiliser plusieurs sélections pour une famille plus grande.",
        "Collapsible sections show selections. Select all and Deselect all respect the construction filter; Recommended only retains the original and single colours. Multicolour and gradient variants require selection. In Final selection, filter construction, category, format or background, then check/uncheck each file, including clearspace boards. Individual choices remain editable and are saved, even after file naming changes. Choose formats and clearspace in Delivery. Check the exact file count before exporting, including recommendations for a ZIP. Limits: 500 files and 256 MB per batch; use multiple selections for larger families.",
      ],
      [
        "Nommage : {brand}, {variant}, {orientation}, {color}, {background}, {format}, {size}. Séparateur -, _ ou . et casse configurables. Les collisions de noms reçoivent un suffixe. ZIP : Logos/format/variante, JPEG/variante, Clearspace/variante et recommandations ; l’organisation par variante inverse les niveaux des logos.",
        "Naming: {brand}, {variant}, {orientation}, {color}, {background}, {format}, {size}. Separator -, _ or . and letter case are configurable. Name collisions receive a suffix. ZIP: Logos/format/variant, JPEG/variant, Clearspace/variant and recommendations; variant organisation reverses the logo folder levels.",
      ],
    ],
  ],
  [
    [
      "8. Langue, sauvegarde et vérification",
      "8. Language, saving and verification",
    ],
    [
      [
        "FR/EN change l’interface et reste mémorisé sur l’appareil. Les noms de marques, fichiers et rôles utilisateur ne sont pas traduits. Un .binksy V3 contient les SVG, dimensions, rôles, verrous, dégradés, sélections, associations globales, références et exports. Les V1/V2 sont migrées en préservant les dimensions visibles ; une échelle historique liée devient une dimension indépendante.",
        "FR/EN changes the interface and is remembered on the device. User brand, file and role names are not translated. A V3 .binksy contains SVGs, dimensions, roles, locks, gradients, selections, global pairings, references and exports. V1/V2 projects migrate while preserving visible dimensions; historically linked scales become independent dimensions.",
      ],
      [
        "La suppression d’un projet exige une confirmation explicite. Annuler ne change rien. Exporter un .binksy avant une suppression si une sauvegarde est nécessaire. Undo/Redo couvre les modifications de composition et de couleurs ; la suppression confirmée ne s’annule pas par Undo.",
        "Deleting a project requires explicit confirmation. Cancel changes nothing. Export a .binksy before deletion if a backup is needed. Undo/Redo covers composition and colour edits; a confirmed deletion is not reversed by Undo.",
      ],
      [
        "Contrôler avant livraison : indépendance des dimensions, proportions, masses optiques, rôles verrouillés, gradients, transparence, marges JPEG, noms, liste finale, planches et réouverture .binksy. Les PDF avec filtres, masques ou motifs complexes sont refusés, sans rasterisation de secours. Couleurs RVB ; aucune promesse de CMJN ou de compatibilité Illustrator/Figma/Affinity sans test dans ces logiciels.",
        "Before delivery check independent dimensions, proportions, optical masses, locked roles, gradients, transparency, JPEG margins, names, final list, boards and .binksy reopening. PDFs with complex filters, masks or patterns are rejected without raster fallback. RGB colours; no CMYK or Illustrator/Figma/Affinity compatibility claim without testing those applications.",
      ],
      [
        "Utiliser les noms accessibles et attributs stables : data-comp pour les hauteurs/offsets, data-width, data-resize, data-role-field, data-work-select et data-global-pair. Préférer les contrôles de l’interface aux mutations de données internes. La documentation doit évoluer avec toute modification fonctionnelle.",
        "Use accessible names and stable attributes: data-comp for heights/offsets, data-width, data-resize, data-role-field, data-work-select and data-global-pair. Prefer interface controls to internal data mutation. Documentation must evolve with every functional change.",
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
