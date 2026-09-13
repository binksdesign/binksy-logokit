import {
  ACTIONS,
  validateActions,
  applyActions,
  actionInstructions,
} from "./ai-context.js";
import { variantIds, variantName, clearMeasure } from "./model.js";
import { prepareGuide, finalPalette, COLOR_ROLES } from "./guideline-config.js";
import { PAGE_TYPES, ROLES } from "./guideline-model.js";
import { pageElements } from "./guideline-layout.js";
import { t } from "./i18n.js";

const legacyTypes = Object.values(ACTIONS).flat();
const globalTypes = [
  "pageColors",
  "globalColors",
  "finalColor",
  "addColor",
  "removeColor",
  "pageSettings",
  "removePage",
  "selectVariant",
  "variantSettings",
  "typography",
];
export function projectContext(p, stage, selection = {}) {
  const g = p.brandGuideline;
  return {
    stage,
    brand: p.brand,
    activeVariant: p.active,
    ...selection,
    actions: [...legacyTypes, ...globalTypes],
    logoAssets: Object.entries(p.assets)
      .filter(([, v]) => v)
      .map(([id, v]) => ({ id, name: v.name })),
    variants: variantIds(p).map((id) => ({
      id,
      name: variantName(p, id),
      enabled: p.enabled.includes(id),
      minimum: {
        print: p.compositions[id]?.minPrint,
        digital: p.compositions[id]?.minDigital,
      },
      clearspace: clearMeasure(p, id),
    })),
    palette: finalPalette(p),
    logoColors: p.colors,
    typography: g.typography,
    fonts: g.resources
      .filter((r) => r.type === "font")
      .map(({ id, family, weight }) => ({ id, family, weight })),
    theme: g.theme,
    format: g.format,
    exports: p.exports.formats,
    pages: g.pages.map((a, i) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      body: a.body,
      variants: a.variants,
      settings: a.settings,
      background: a.background,
      ...(a.id === selection.pageId
        ? {
            texts: pageElements(p, a, i)
              .filter((e) => e.type === "text")
              .map(({ id, text, role }) => ({ id, text, role })),
          }
        : {}),
    })),
    brief: g.brief,
    allowedPageTypes: Object.keys(PAGE_TYPES),
  };
}
const exact = (a, keys) =>
  a &&
  typeof a === "object" &&
  !Array.isArray(a) &&
  Object.keys(a).every((k) => keys.includes(k));
const string = (v, max = 300) => typeof v === "string" && v.length <= max;
const numeric = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
const colorKeys = [
  "background",
  "text",
  "muted",
  "rule",
  "accent",
  "secondary",
];
function checkExtra(a, p) {
  const g = p.brandGuideline,
    colors = finalPalette(p),
    page = g.pages.find((v) => v.id === a.pageId);
  const hex = (v) =>
    colors.some((c) => c.hex.toLowerCase() === String(v).toLowerCase());
  if (a.type === "pageColors" || a.type === "globalColors")
    return (
      exact(a, ["type", "pageId", "values"]) &&
      (a.type === "globalColors" || page) &&
      exact(a.values, colorKeys) &&
      Object.keys(a.values).length &&
      Object.values(a.values).every(hex)
    );
  if (a.type === "finalColor")
    return (
      exact(a, ["type", "id", "name", "hex", "role", "spot"]) &&
      colors.some((c) => c.id === a.id) &&
      (!("name" in a) || string(a.name, 100)) &&
      (!("hex" in a) || /^#[\da-f]{6}$/i.test(a.hex)) &&
      (!("spot" in a) || string(a.spot, 100)) &&
      (!("role" in a) || Object.hasOwn(COLOR_ROLES, a.role))
    );
  if (a.type === "addColor")
    return (
      exact(a, ["type", "name", "hex", "role"]) &&
      colors.length < 100 &&
      string(a.name, 100) &&
      /^#[\da-f]{6}$/i.test(a.hex) &&
      Object.hasOwn(COLOR_ROLES, a.role)
    );
  if (a.type === "removeColor")
    return (
      exact(a, ["type", "id"]) &&
      colors.length > 1 &&
      colors.some((c) => c.id === a.id)
    );
  if (a.type === "removePage")
    return exact(a, ["type", "pageId"]) && page && g.pages.length > 1;
  if (a.type === "selectVariant")
    return exact(a, ["type", "variant"]) && variantIds(p).includes(a.variant);
  if (a.type === "variantSettings")
    return (
      exact(a, ["type", "variant", "values"]) &&
      variantIds(p).includes(a.variant) &&
      exact(a.values, ["minPrint", "minDigital", "clearMultiplier", "gap"]) &&
      Object.entries(a.values).every(([k, v]) =>
        numeric(
          v,
          k === "minPrint" || k === "minDigital" ? 1 : 0,
          k === "minPrint" ? 1000 : k === "minDigital" ? 10000 : 5,
        ),
      )
    );
  if (a.type === "pageSettings")
    return (
      exact(a, ["type", "pageId", "values"]) &&
      page &&
      exact(a.values, [
        "guides",
        "explanation",
        "hex",
        "rgb",
        "cmyk",
        "pantone",
        "roles",
      ]) &&
      Object.values(a.values).every((v) => typeof v === "boolean")
    );
  if (a.type === "typography")
    return (
      exact(a, ["type", "role", "font", "size", "leading", "tracking"]) &&
      ROLES.includes(a.role) &&
      g.resources.some((r) => r.id === a.font && r.type === "font") &&
      numeric(a.size, 5, 150) &&
      numeric(a.leading, 0.8, 3) &&
      numeric(a.tracking, -3, 20)
    );
  return false;
}
function applyExtra(a, p) {
  const g = prepareGuide(p),
    page = g.pages.find((v) => v.id === a.pageId);
  if (a.type === "pageColors") {
    const { background, ...rest } = a.values;
    if (background) page.background = background;
    Object.assign((page.settings ||= {}), rest);
  }
  if (a.type === "globalColors") Object.assign(g.theme, a.values);
  if (a.type === "pageSettings")
    Object.assign((page.settings ||= {}), a.values);
  if (a.type === "finalColor") {
    const c = g.palette.find((c) => c.id === a.id);
    for (const k of ["name", "hex", "role", "spot"]) if (k in a) c[k] = a[k];
  }
  if (a.type === "addColor")
    g.palette.push({
      id: crypto.randomUUID(),
      name: a.name,
      hex: a.hex,
      role: a.role,
    });
  if (a.type === "removeColor")
    g.palette = g.palette.filter((c) => c.id !== a.id);
  if (a.type === "removePage")
    g.pages = g.pages.filter((v) => v.id !== a.pageId);
  if (a.type === "selectVariant") p.active = a.variant;
  if (a.type === "variantSettings")
    Object.assign(p.compositions[a.variant], a.values);
  if (a.type === "typography") {
    const f = g.resources.find((f) => f.id === a.font);
    g.typography[a.role] = {
      font: f.id,
      family: f.family,
      weight: f.weight,
      size: a.size,
      pt: a.size,
      px: (a.size * 4) / 3,
      leading: a.leading,
      tracking: a.tracking,
    };
  }
}
export function proposalProject(p, proposal) {
  if (
    !exact(proposal, ["message", "actions"]) ||
    !string(proposal.message, 12000) ||
    !Array.isArray(proposal.actions) ||
    proposal.actions.length > 30
  )
    throw Error("Proposition invalide.");
  const clone = structuredClone(p);
  for (const a of proposal.actions) {
    if (!a || typeof a.type !== "string") throw Error("Action IA invalide.");
    if (globalTypes.includes(a.type)) {
      if (!checkExtra(a, clone)) throw Error("Action IA invalide.");
      applyExtra(a, clone);
    } else {
      const stage = Object.keys(ACTIONS).find((s) =>
        ACTIONS[s].includes(a.type),
      );
      if (!stage) throw Error("Action IA invalide.");
      const one = { message: "", actions: [a] };
      validateActions(JSON.stringify(one), stage, clone);
      applyActions(clone, stage, one);
    }
  }
  return clone;
}
// Transient state lives outside .binksy and outside Undo/Redo. Validation runs against a clone.
export class ProposalSession {
  constructor() {
    this.messages = [];
    this.active = null;
    this.revision = 0;
  }
  propose(p, proposal) {
    proposalProject(p, proposal);
    this.active = structuredClone(proposal);
    this.base = JSON.stringify(p);
    this.revision++;
    return this.active;
  }
  apply(p, edit) {
    if (!this.active) throw Error("Aucune proposition.");
    if (this.base !== JSON.stringify(p))
      throw Error("Le projet a changé. Demandez une proposition actualisée.");
    const next = proposalProject(p, this.active);
    edit(() => {
      for (const key of Object.keys(p)) delete p[key];
      Object.assign(p, next);
    });
    this.active = null;
  }
}
export function actionSummary(a, p) {
  const colors = finalPalette(p),
    name = (v) => colors.find((c) => c.hex === v)?.name || v;
  if (a.values)
    return Object.entries(a.values)
      .map(
        ([k, v]) =>
          `${t(k)} : ${typeof v === "boolean" ? t(v ? "Oui" : "Non") : name(v)}`,
      )
      .join(" · ");
  return (
    {
      pageText: () => a.title,
      elementText: () => a.text,
      brand: () => a.value,
      formats: () => a.value.join(" · "),
      finalColor: () => a.name || a.hex || t(COLOR_ROLES[a.role]) || a.spot,
      addColor: () => a.name,
      removeColor: () => colors.find((c) => c.id === a.id)?.name,
      removePage: () =>
        p.brandGuideline.pages.find((v) => v.id === a.pageId)?.title,
      selectVariant: () => variantName(p, a.variant),
      typography: () => `${t(a.role)} · ${a.size} pt`,
      addPage: () => t(PAGE_TYPES[a.pageType]),
      minimum: () => `${a.print} mm · ${a.digital} px`,
    }[a.type]?.() || t("Réglages mis à jour")
  );
}
export const agentInstructions =
  actionInstructions +
  ` You can act across all steps, with explicit proposals ONLY. Current pageId/elementId identify what 'this page' means. NEVER claim changes are applied. Keep proposals temporary and return the COMPLETE revised actions when refining an active proposal. Never change brand content not requested. Colour selections in document actions MUST use a hex present in final palette; suggest adding missing colours explicitly instead. Extra schemas: pageColors {type,pageId,values:{background?,text?,muted?,rule?,accent?}}; globalColors {type,values:{background?,text?,muted?,accent?,secondary?}}; finalColor {type,id,name?,hex?,role?,spot?}; addColor {type,name,hex,role}; removeColor {type,id}; removePage {type,pageId}; selectVariant {type,variant}; variantSettings {type,variant,values:{minPrint?,minDigital?,clearMultiplier?,gap?}}; pageSettings {type,pageId,values:{guides?,explanation?,hex?,rgb?,cmyk?,pantone?,roles?}}; typography {type,role,font,size,leading,tracking}. Colours roles: ${Object.keys(COLOR_ROLES).join(",")}. Use propose_changes tool when available to return the complete proposal. Tool only validates a temporary proposal; it never applies changes.`;
export const proposalTool = {
  name: "propose_changes",
  description:
    "Prepare a temporary change proposal for explicit user approval. No project mutations.",
  parameters: {
    type: "object",
    properties: {
      message: { type: "string" },
      actions: {
        type: "array",
        items: {
          type: "object",
          properties: { type: { type: "string" } },
          required: ["type"],
          additionalProperties: true,
        },
      },
    },
    required: ["message", "actions"],
    additionalProperties: false,
  },
};
