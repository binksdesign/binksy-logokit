import { paginateMinimumPages } from "./guideline-minimum.js";
// Serializable guide data. Logo geometry, palette values and minimum sizes stay in the project.
export const FORMATS = {
  "16:9": { width: 960, height: 540, label: "16:9" },
  landscape: { width: 841.89, height: 595.28, label: "A4 paysage" },
  portrait: { width: 595.28, height: 841.89, label: "A4 portrait" },
};
export const PAGE_TYPES = {
  cover: "Couverture",
  introduction: "Présentation de la marque",
  logos: "Logo et variantes",
  clearspace: "Zone de protection",
  minimum: "Tailles minimales",
  misuse: "Utilisations incorrectes",
  palette: "Palette de couleurs",
  pairs: "Associations de couleurs",
  fonts: "Typographies",
  hierarchy: "Hiérarchie typographique",
  applications: "Applications",
  end: "Page de fin",
  history: "Histoire",
  mission: "Mission",
  goals: "Objectifs",
  values: "Valeurs",
  positioning: "Positionnement",
  personality: "Personnalité",
  audience: "Cible",
  tagline: "Baseline",
  construction: "Construction du logo",
  distribution: "Répartition des couleurs",
  accessibility: "Accessibilité",
  photography: "Direction photographique",
  icons: "Iconographie",
  social: "Réseaux sociaux",
  contact: "Contact",
  blank: "Page vierge",
};
export const MISUSES = {
  correct: "Utilisation correcte",
  wide: "Ne pas étirer horizontalement",
  tall: "Ne pas étirer verticalement",
  proportions: "Ne pas modifier les proportions icône/logotype",
  rotate: "Ne pas tourner",
  skew: "Ne pas incliner",
  perspective: "Ne pas modifier la perspective",
  blur: "Ne pas flouter",
  glow: "Ne pas ajouter de lueur",
  shadow: "Ne pas ajouter d’ombre",
  outline: "Ne pas ajouter de contour",
  opacity: "Ne pas réduire l’opacité",
  gradient: "Ne pas ajouter de dégradé",
  colors: "Ne pas changer les couleurs",
  spacing: "Ne pas modifier l’espacement",
  crop: "Ne pas couper le logo",
  contrast: "Éviter les contrastes insuffisants",
};
export const ROLES = [
  "title",
  "subtitle",
  "heading",
  "body",
  "small",
  "caption",
];
export const uid = () => crypto.randomUUID();
export const limit = (n, min, max, fallback = min) =>
  Number.isFinite(+n) ? Math.min(max, Math.max(min, +n)) : fallback;
export const cleanText = (s, max = 6000) =>
  typeof s === "string" ? s.slice(0, max) : "";
export const hex = (s, fallback = "#171717") =>
  /^#[\da-f]{6}$/i.test(s) ? s : fallback;
export function validateMedia(source) {
  if (!source || typeof source.resource !== 'string') return null;
  return { resource: cleanText(source.resource, 100), fit: source.fit === 'contain' ? 'contain' : 'cover', zoom: limit(source.zoom, 1, 5, 1), panX: limit(source.panX, 0, 1, 0.5), panY: limit(source.panY, 0, 1, 0.5) };
}
export function emptyGuide() {
  return {
    enabled: false,
    schema: 2,
    palette: null,
    setup: null,
    format: "16:9",
    pages: [],
    resources: [],
    brief: {},
    theme: {},
    colorRoles: {},
    pairs: {},
    distribution: {},
    typography: {},
    accentTypography: {enabled:false},
    customColorRoles: [],
    exports: { pdf: true, svg: true, text: "text" },
  };
}
export function page(type = "blank") {
  return {
    id: uid(),
    type: Object.hasOwn(PAGE_TYPES, type) ? type : "blank",
    title: "",
    body: "",
    elements: [],
    variants: [],
    misuses: ["correct", "wide", "rotate", "skew", "colors", "opacity"],
    layout: "minimal",
    background: "",
    detached: false,
    styles: {},
  };
}
export function initializeGuide(p) {
  const g = (p.brandGuideline ||= emptyGuide());
  if (!g.pages.length)
    g.pages = Object.keys(PAGE_TYPES)
      .slice(0, 12)
      .map((type) => page(type));
  g.enabled = true;
  return g;
}
export function movePage(g, id, beforeId) {
  const index = g.pages.findIndex((p) => p.id === id);
  if (index < 0 || id === beforeId) return;
  const [p] = g.pages.splice(index, 1),
    target = g.pages.findIndex((p) => p.id === beforeId);
  g.pages.splice(target < 0 ? g.pages.length : target, 0, p);
}
export function duplicatePage(g, id) {
  const i = g.pages.findIndex((p) => p.id === id);
  if (i < 0) return;
  const copy = structuredClone(g.pages[i]);
  copy.id = uid();
  g.pages.splice(i + 1, 0, copy);
  return copy;
}
export function normalizeDistribution(g, colors) {
  if (!colors.length) return;
  const sum = colors.reduce(
    (n, c) => n + Math.max(0, +g.distribution[c.id] || 0),
    0,
  );
  const shares = colors.map((c) => ({
    id: c.id,
    exact: sum
      ? (Math.max(0, +g.distribution[c.id] || 0) / sum) * 100
      : 100 / colors.length,
  }));
  shares.forEach((c) => (g.distribution[c.id] = Math.floor(c.exact)));
  let remainder = 100 - shares.reduce((n, c) => n + Math.floor(c.exact), 0);
  shares
    .sort((a, b) => (b.exact % 1) - (a.exact % 1))
    .forEach((c) => {
      if (remainder-- > 0) g.distribution[c.id]++;
    });
}
export function setDistribution(g, colors, id, value) {
  const rest = colors.filter((c) => c.id !== id),
    target = rest.length ? Math.round(limit(value, 0, 100)) : 100;
  const sum = rest.reduce((n, c) => n + (g.distribution[c.id] || 0), 0);
  let remaining = 100 - target;
  rest.forEach((c, i) => {
    const share =
      i === rest.length - 1
        ? remaining
        : Math.min(
            remaining,
            Math.round(
              (100 - target) *
                (sum ? (g.distribution[c.id] || 0) / sum : 1 / rest.length),
            ),
          );
    g.distribution[c.id] = share;
    remaining -= share;
  });
  g.distribution[id] = target;
}
// Explicit allowlist: unknown fields (including credentials) never enter a loaded guide.
export function validateGuide(input, mode) {
  const g = emptyGuide();
  if (!input) return g;
  if (!Array.isArray(input.pages) || input.pages.length > 100)
    throw Error("Guide invalide : 100 pages maximum.");
  g.enabled = mode !== "clearspace" && input.enabled === true;
  g.format = Object.hasOwn(FORMATS, input.format) ? input.format : "16:9";
  if (Array.isArray(input.palette)) g.palette = input.palette.slice(0, 100).filter(c => c && /^[\w-]{1,100}$/.test(c.id)).map(c => ({
    id: c.id, sourceId: cleanText(c.sourceId, 100),
    ...(typeof c.name === 'string' ? {name: cleanText(c.name, 100)} : {}),
    ...(c.hex ? {hex: hex(c.hex)} : {}), role: cleanText(c.role, 100), spot: cleanText(c.spot, 100), percentage: limit(c.percentage, 0, 100),
  }));
  const setup = input.setup;
  if (setup) g.setup = {
    step: limit(setup.step, 0, 5), complete: setup.complete === true,
    cover: { mode: setup.cover?.mode === 'image' ? 'image' : 'logo', variant: cleanText(setup.cover?.variant, 100), media: validateMedia(setup.cover?.media) },
    mockups: (Array.isArray(setup.mockups) ? setup.mockups : []).slice(0, 3).map(m => ({id: /^[\w-]{1,100}$/.test(m.id) ? m.id : uid(), media: validateMedia(m.media), title: cleanText(m.title, 300), caption: cleanText(m.caption, 1000), layout: m.layout === 'editorial' ? 'editorial' : 'hero'})),
    misuses: (Array.isArray(setup.misuses) ? setup.misuses : []).filter(v => v !== 'correct' && Object.hasOwn(MISUSES, v)),
    misuseVariant: cleanText(setup.misuseVariant, 100),
    content: (Array.isArray(setup.content) ? setup.content : []).filter(v => Object.hasOwn(PAGE_TYPES, v)),
  };
  for (const key of [
    "description",
    "activity",
    "audience",
    "values",
    "goal",
    "tone",
    "tagline",
    "keywords",
  ])
    g.brief[key] = cleanText(input.brief?.[key]);
  for (const key of ["background", "secondary", "text", "muted", "accent", "rule"])
    if (input.theme?.[key]) g.theme[key] = input.theme[key] === "auto" ? "auto" : hex(input.theme[key]);
  for (const key of ["margin", "spacing", "grid"])
    if (Number.isFinite(input.theme?.[key]))
      g.theme[key] = limit(input.theme[key], 0, 100);
  g.theme.numbers = input.theme?.numbers !== false;
  g.theme.guides = input.theme?.guides === true;
  for (const key of ['headers', 'footers', 'brandName']) g.theme[key] = input.theme?.[key] !== false;
  g.theme.density = ['comfortable', 'compact'].includes(input.theme?.density) ? input.theme.density : 'comfortable';
  g.exports = {
    pdf: input.exports?.pdf !== false,
    svg: input.exports?.svg !== false,
    text: input.exports?.text === "paths" ? "paths" : "text",
  };
  const dict = (source, convert) =>
    Object.fromEntries(
      Object.entries(source || {})
        .filter(([k]) => /^[\w:-]{1,160}$/.test(k))
        .slice(0, 2000)
        .map(([k, v]) => [k, convert(v)]),
    );
  g.colorRoles = dict(input.colorRoles, (v) => ({
    role: cleanText(v?.role, 100),
    spot: cleanText(v?.spot, 100),
    order: limit(v?.order, 0, 1000),
  }));
  g.pairs = dict(input.pairs, (v) => ({
    allowed: v?.allowed === true,
    hidden: v?.hidden === true,
    manual: v?.manual === true,
    source: v?.source === "ai" ? "ai" : "auto",
    note: cleanText(v?.note, 500),
  }));
  g.distribution = dict(input.distribution, (v) => limit(v, 0, 100));
  g.accentTypography = {enabled:input.accentTypography?.enabled === true};
  g.customColorRoles = [...new Set((Array.isArray(input.customColorRoles)?input.customColorRoles:[]).filter(v=>typeof v === "string" && v.trim()).map(v=>cleanText(v.trim(),100)))].slice(0,100);
  g.typography = dict(input.typography, (v) => ({
    font: cleanText(v?.font, 100),
    family: cleanText(v?.family, 100),
    size: limit(v?.size, 5, 150, 12),
    pt: limit(v?.size, 5, 150, 12),
    px: limit(v?.size, 5, 150, 12) * 4 / 3,
    weight: limit(v?.weight, 100, 900, 400),
    leading: limit(v?.leading, 0.8, 3, 1.35),
    tracking: limit(v?.tracking, -3, 20, 0),
  }));
  let bytes = 0;
  for (const r of input.resources || []) {
    if (
      g.resources.length >= 60 ||
      !["font", "image"].includes(r?.type) ||
      !/^[\w-]{1,100}$/.test(r.id)
    )
      throw Error("Ressource invalide.");
    if (
      typeof r.data !== "string" ||
      !/^data:(image\/(png|jpeg|webp)|font\/(ttf|otf));base64,[A-Za-z0-9+/=]+$/.test(
        r.data,
      )
    )
      throw Error("Ressource invalide.");
    bytes += r.data.length;
    if (bytes > 24e6) throw Error("Ressources limitées à 18 Mo.");
    g.resources.push({
      id: r.id,
      type: r.type,
      name: cleanText(r.name, 200),
      data: r.data,
      family: cleanText(r.family, 100),
      weight: limit(r.weight, 100, 900, 400),
      width: limit(r.width, 0, 40000),
      height: limit(r.height, 0, 40000),
      format: r.format === "otf" ? "otf" : "ttf",
    });
  }
  const seen = new Set();
  for (const source of input.pages) {
    const a = page(source.type);
    a.id =
      /^[\w-]{1,100}$/.test(source.id) && !seen.has(source.id)
        ? source.id
        : uid();
    seen.add(a.id);
    a.title = cleanText(source.title, 300);
    a.body = cleanText(source.body);
    a.generatedKey = cleanText(source.generatedKey, 160);
    a.group = source.group === 'parts' ? 'parts' : 'full';
    a.media = validateMedia(source.media);
    a.ruleOffset = limit(source.ruleOffset, 0, 100);
    a.logoColors = dict(source.logoColors, v => cleanText(v, 300));
    a.settings = {};
    for (const key of ['guides', 'explanation', 'hex', 'rgb', 'cmyk', 'pantone', 'roles']) a.settings[key] = source.settings?.[key] !== false;
    for (const key of ['text', 'muted', 'rule', 'accent']) if (source.settings?.[key]) a.settings[key] = source.settings[key] === "auto" ? "auto" : hex(source.settings[key]);
    a.layout = [
      "minimal",
      "typographic",
      "image",
      "dominant",
      "full",
      "two",
      "three",
      "mixed",
      "mosaic",
      "hero",
      "editorial",
      "statement",
      "columns",
      "manifesto",
    ].includes(source.layout)
      ? source.layout
      : "minimal";
    a.background = source.background ? hex(source.background) : "";
    a.detached = source.detached === true;
    a.disabled = source.disabled === true;
    a.variants = (source.variants || [])
      .filter((v) => typeof v === "string")
      .slice(0, 100);
    a.misuses = (source.misuses || []).filter((v) => Object.hasOwn(MISUSES, v));
    a.elements = (source.elements || []).slice(0, 150).map((e) => ({
      id: /^[\w-]{1,100}$/.test(e.id) ? e.id : uid(),
      type: ["text", "image", "logo", "rect"].includes(e.type)
        ? e.type
        : "text",
      text: cleanText(e.text),
      resource: cleanText(e.resource, 100),
      fit: e.fit === 'contain' ? 'contain' : 'cover',
      variant: cleanText(e.variant, 100),
      role: cleanText(e.role, 100),
      x: limit(e.x, 0, 1),
      y: limit(e.y, 0, 1),
      w: limit(e.w, 0.01, 1, 0.3),
      h: limit(e.h, 0.01, 1, 0.15),
      size: limit(e.size, 5, 150, 12),
      fill: e.fill === "auto" ? "auto" : hex(e.fill),
      colorId: cleanText(e.colorId,300) || undefined,
      zoom: limit(e.zoom, 1, 5, 1),
      panX: limit(e.panX, 0, 1, 0.5),
      panY: limit(e.panY, 0, 1, 0.5),
      locked: e.locked === true,
    }));
    a.styles = dict(source.styles, (v) => ({
      x: Number.isFinite(v?.x) ? limit(v.x, 0, 1) : undefined,
      y: Number.isFinite(v?.y) ? limit(v.y, 0, 1) : undefined,
      w: Number.isFinite(v?.w) ? limit(v.w, 0.001, 1) : undefined,
      h: Number.isFinite(v?.h) ? limit(v.h, 0.001, 1) : undefined,
      text: typeof v?.text === "string" ? cleanText(v.text) : undefined,
      size: Number.isFinite(v?.size) ? limit(v.size, 5, 150, 12) : undefined,
      fill: v?.fill === "auto" ? "auto" : v?.fill ? hex(v.fill) : undefined,
      hidden: v?.hidden === true,
      role: cleanText(v?.role, 100) || undefined,
      variant: cleanText(v?.variant, 100) || undefined,
      colorId: cleanText(v?.colorId, 300) || undefined,
      resource: cleanText(v?.resource,100) || undefined,
      fit: v?.fit === "contain" ? "contain" : v?.fit === "cover" ? "cover" : undefined,
      zoom: Number.isFinite(v?.zoom) ? limit(v.zoom,1,5) : undefined,
      panX: Number.isFinite(v?.panX) ? limit(v.panX,0,1) : undefined,
      panY: Number.isFinite(v?.panY) ? limit(v.panY,0,1) : undefined,
    }));
    g.pages.push(a);
  }
  return g;
}

export function guidelineFileCount(p) {
  const g = p.brandGuideline;
  return g?.enabled && p.mode !== "clearspace"
    ? (g.exports.pdf ? 1 : 0) + (g.exports.svg ? paginateMinimumPages(p).filter(a=>!a.disabled).length : 0)
    : 0;
}
