import { paginateMinimumPages } from "./guideline-minimum.js";
import { page, PAGE_TYPES, MISUSES } from "./guideline-model.js";
import { variantIds, layout } from "./model.js";

export const COLOR_ROLES = {
  surface: "Surface", contrast: "Contraste", neutral: "Neutre", brand: "Marque",
  border: "Bordure", icon: "Icône", decorative: "Décoratif", backdrop: "Arrière-plan",
  foreground: "Premier plan", light: "Clair", dark: "Foncé", support: "Support",
  complementary: "Complémentaire", highlight: "Mise en avant", interaction: "Interaction",
  button: "Bouton", link: "Lien", success: "Succès", warning: "Avertissement",
  error: "Erreur", information: "Information",
  primary: "Principale",
  secondary: "Secondaire",
  accent: "Accent",
  background: "Fond principal",
  "secondary-background": "Fond secondaire",
  text: "Texte principal",
  "secondary-text": "Texte secondaire",
};
export const EDITORIAL_TYPES = [
  "introduction",
  "history",
  "mission",
  "goals",
  "values",
  "positioning",
  "personality",
  "audience",
  "tagline",
];

// References to upstream colours remain live. Only explicit overrides and new colours are stored here.
export function finalPalette(p) {
  const g = p.brandGuideline;
  if (!Array.isArray(g.palette))
    return p.colors.map((c) => ({
      ...c,
      ...g.colorRoles[c.id],
      percentage: g.distribution[c.id],
    }));
  return g.palette
    .map((entry) => {
      const source = p.colors.find((c) => c.id === entry.sourceId);
      return {
        ...source,
        ...entry,
        name: entry.name ?? source?.name ?? "",
        hex: entry.hex ?? source?.hex,
      };
    })
    .filter((c) => /^#[\da-f]{6}$/i.test(c.hex));
}
export function prepareGuide(p) {
  const g = p.brandGuideline;
  if (!Array.isArray(g.palette))
    g.palette = p.colors.map((c) => ({
      id: c.id,
      sourceId: c.id,
      ...g.colorRoles[c.id],
      percentage: g.distribution[c.id],
    }));
  if (!g.setup) {
    const cover = g.pages.find((a) => a.type === "cover"),
      misuses = g.pages.filter((a) => a.type === "misuse");
    g.setup = {
      step: 0,
      complete: false,
      associationsReviewed: false,
      cover: {
        mode: cover?.media ? "image" : "logo",
        variant: cover?.variants[0] || p.enabled[0] || p.active,
        media: cover?.media || null,
      },
      mockups: [],
      misuses: [
        ...new Set(
          misuses.flatMap((a) => a.misuses).filter((v) => v !== "correct"),
        ),
      ],
      misuseVariant: misuses[0]?.variants[0] || p.enabled[0] || p.active,
      content: g.pages
        .filter((a) => EDITORIAL_TYPES.includes(a.type))
        .map((a) => a.type),
    };
    const used = new Set();
    for (const a of g.pages) {
      let key = EDITORIAL_TYPES.includes(a.type)
        ? "content-" + a.type
        : [
              "cover",
              "logos",
              "palette",
              "pairs",
              "fonts",
              "hierarchy",
              "end",
            ].includes(a.type)
          ? a.type
          : a.type === "minimum"
            ? "minimum-full"
            : a.type === "clearspace"
              ? "clearspace-" + (a.variants[0] || p.enabled[0])
              : a.type === "misuse"
                ? "misuse-" + misuses.indexOf(a)
                : "";
      if (key && !used.has(key)) {
        a.generatedKey = key;
        used.add(key);
      }
    }
  }
  return g;
}
export function guideVariants(p) {
  return p.enabled.filter(
    (v) => variantIds(p).includes(v) && layout(p, v).parts.length,
  );
}
export function generateGuide(p) {
  const g = prepareGuide(p),
    s = g.setup,
    variants = guideVariants(p);
  const before = new Map(
    g.pages.filter((a) => a.generatedKey && !a.paginationRoot).map((a) => [a.generatedKey, a]),
  );
  const generated = [];
  const add = (type, key, attrs = {}) => {
    const existing = before.get(key);
    const a = existing || page(type);
    Object.assign(a, attrs, { generatedKey: key });
    generated.push(a);
    return a;
  };
  add("cover", "cover", {
    variants: [s.cover.variant || variants[0]].filter(Boolean),
    media: s.cover.mode === "image" ? s.cover.media : null,
  });
  for (const type of s.content)
    if (EDITORIAL_TYPES.includes(type)) add(type, "content-" + type);
  add("logos", "logos", { variants });
  for (const variant of variants)
    add("clearspace", "clearspace-" + variant, { variants: [variant] });
  const full = variants.filter((v) => !["icon", "wordmark"].includes(v));
  const parts = variants.filter((v) => ["icon", "wordmark"].includes(v));
  if (full.length)
    add("minimum", "minimum-full", {
      variants: full,
      title: "",
      group: "full",
    });
  if (parts.length)
    add("minimum", "minimum-parts", {
      variants: parts,
      title: "",
      group: "parts",
    });
  const rules = [...new Set(s.misuses)].filter(
    (v) => v !== "correct" && Object.hasOwn(MISUSES, v),
  );
  for (let i = 0; i < rules.length; i += 6)
    add("misuse", "misuse-" + i / 6, {
      variants: [s.misuseVariant || variants[0]],
      misuses: rules.slice(i, i + 6),
      ruleOffset: i,
    });
  add("palette", "palette");
  add("pairs", "pairs");
  add("fonts", "fonts");
  add("hierarchy", "hierarchy");
  for (const mockup of s.mockups.slice(0, 3))
    add("applications", "mockup-" + mockup.id, {
      media: mockup.media,
      title: mockup.title || "",
      body: mockup.caption || "",
      layout: mockup.layout || "hero",
    });
  add("end", "end");
  // Manually added pages and legacy guides are never deleted by the preparation assistant.
  g.pages = [
    ...generated.slice(0, -1),
    ...g.pages.filter((a) => !a.generatedKey || a.paginationRoot),
    generated.at(-1),
  ];
  g.enabled = true;
  s.complete = true;
  p.version = 5;
  g.pages=paginateMinimumPages(p);
  return g;
}
export function fontChoices(g) {
  return g.resources.filter((r) => r.type === "font");
}
export function assignFontRoles(g) {
  const fonts = fontChoices(g);
  const target = {
    title: 700,
    subtitle: 600,
    heading: 500,
    body: 400,
    small: 400,
    caption: 400,
  };
  for (const [role, weight] of Object.entries(target)) {
    if (g.typography[role]?.font || !fonts.length) continue;
    const family = fonts[0].family;
    const f = fonts
      .filter((f) => f.family === family)
      .sort(
        (a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight),
      )[0];
    const size = {
      title: 36,
      subtitle: 26,
      heading: 18,
      body: 12,
      small: 10,
      caption: 8,
    }[role];
    g.typography[role] = {
      font: f.id,
      family: f.family,
      weight: f.weight,
      size,
      pt: size,
      px: (size * 4) / 3,
      leading: 1.35,
      tracking: 0,
    };
  }
}

export function colorRoles(g){return {...COLOR_ROLES,...Object.fromEntries((g.customColorRoles||[]).map(name=>[name,name]))};}
