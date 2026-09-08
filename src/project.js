import { project, VARIANTS, variantIds, CLEAR_REFS } from "./model";
import { importSVG } from "./svg";
import { restoreRoles, hexColor } from "./paints.js";
export async function validate(data) {
  if (
    ![1, 2, 3].includes(data?.version) ||
    typeof data.brand !== "string" ||
    !data.assets ||
    !data.compositions
  )
    throw Error("Format de projet non reconnu.");
  const result = project(data.mode === "ready" ? "ready" : "compose");
  result.id = typeof data.id === "string" ? data.id : result.id;
  result.brand = data.brand.slice(0, 100);
  for (const key of ["icon", "wordmark"])
    if (data.assets[key]) {
      result.assets[key] = await importSVG(
        data.assets[key].svg,
        String(data.assets[key].name || key),
      );
      restoreRoles(result.assets[key], data.assets[key].roles);
    }
  for (const v of VARIANTS) {
    const c = data.compositions[v];
    if (!c) throw Error("Composition manquante.");
    for (const key of [
      "iconSize",
      "wordSize",
      "gap",
      "iconX",
      "iconY",
      "wordmarkX",
      "wordmarkY",
      "clear",
      "minPrint",
      "minDigital",
    ]) {
      if (!Number.isFinite(c[key]))
        throw Error("Valeur de composition invalide.");
      const limits = {
        iconSize: [0.25, 8],
        wordSize: [0.25, 3],
        gap: [0, 5],
        clear: [0, 5],
        minPrint: [1, 1000],
        minDigital: [1, 10000],
      };
      const [min, max] = limits[key] || [-10, 10];
      result.compositions[v][key] = Math.max(min, Math.min(max, c[key]));
    }
    for (const [key, allowed] of [
      ["align", ["start", "center", "end"]],
      ["center", ["real", "optical"]],
    ])
      if (allowed.includes(c[key])) result.compositions[v][key] = c[key];
    const wordHeight =
      (result.assets.wordmark?.box.height || 100) *
      result.compositions[v].wordSize;
    result.compositions[v].wordmarkHeight = Number.isFinite(c.wordmarkHeight)
      ? Math.max(1, Math.min(100000, c.wordmarkHeight))
      : wordHeight;
    result.compositions[v].iconHeight = Number.isFinite(c.iconHeight)
      ? Math.max(1, Math.min(100000, c.iconHeight))
      : (result.compositions[v].iconSize * wordHeight) / 2;
  }
  if (VARIANTS.includes(data.active)) result.active = data.active;
  result.enabled = Array.isArray(data.enabled)
    ? [...new Set(data.enabled.filter((v) => VARIANTS.includes(v)))]
    : VARIANTS;
  for (const key of ["grid", "snap", "clear"])
    result[key] = data[key] !== false;
  result.colors = Array.isArray(data.colors)
    ? data.colors
        .filter(
          (c) =>
            typeof c.name === "string" &&
            /^#[a-f0-9]{6}$/i.test(c.hex) &&
            typeof c.id === "string" &&
            /^[\w-]+$/.test(c.id) &&
            !["original", "black", "white"].includes(c.id),
        )
        .map((c) => ({ id: c.id, name: c.name.slice(0, 100), hex: c.hex }))
    : [];
  result.excluded = Array.isArray(data.excluded)
    ? data.excluded.filter((x) => typeof x === "string")
    : [];
  if (data.naming) {
    if (typeof data.naming.pattern === "string")
      result.naming.pattern = data.naming.pattern.slice(0, 200);
    if (["-", "_", "."].includes(data.naming.separator))
      result.naming.separator = data.naming.separator;
    result.naming.uppercase = data.naming.uppercase === true;
  }
  const e = data.exports || {};
  result.exports.formats = Array.isArray(e.formats)
    ? [
        ...new Set(
          e.formats.filter((f) => ["svg", "png", "jpeg", "pdf"].includes(f)),
        ),
      ]
    : ["svg"];
  for (const [key, min, max] of [
    ["width", 16, 8192],
    ["height", 16, 8192],
    ["dpi", 72, 1200],
  ])
    if (Number.isFinite(e[key]))
      result.exports[key] = Math.round(Math.min(max, Math.max(min, e[key])));
  result.exports.organization =
    e.organization === "variant" ? "variant" : "format";
  result.canvas = data.canvas === "#000000" ? "#000000" : "#ffffff";
  result.jpegOverrides = Object.fromEntries(
    Object.entries(data.jpegOverrides || {}).filter(
      ([key, value]) => /^[\w:-]+$/.test(key) && typeof value === "boolean",
    ),
  );
  result.exports.contrast = [3, 4.5, 7].includes(e.contrast) ? e.contrast : 3;
  result.exports.jpegMargin = Number.isFinite(e.jpegMargin)
    ? Math.min(3, Math.max(0.1, e.jpegMargin))
    : 0.5;
  result.exports.clearspace = e.clearspace !== false;
  if (result.mode === "ready") {
    for (const item of data.ready || []) {
      if (
        !/^v-[\w-]+$/.test(item.id) ||
        result.ready.some((v) => v.id === item.id)
      )
        throw Error("Identifiant de variante invalide.");
      const asset = await importSVG(
        item.asset.svg,
        String(item.asset.name || item.name),
      );
      restoreRoles(asset, item.asset.roles);
      result.ready.push({
        id: item.id,
        name: String(item.name).slice(0, 100),
        asset,
      });
      result.compositions[item.id] = { ...project().compositions.horizontal };
    }
    result.active = result.ready.some((v) => v.id === data.active)
      ? data.active
      : result.ready[0]?.id || "horizontal";
    result.enabled = result.ready
      .map((v) => v.id)
      .filter((id) => data.enabled?.includes(id));
  }
  for (const v of variantIds(result)) {
    const old = data.compositions[v] || {};
    const c = result.compositions[v];
    c.clearRef = Object.hasOwn(CLEAR_REFS, old.clearRef)
      ? old.clearRef
      : "wordmarkHeight";
    c.clearMultiplier = Number.isFinite(old.clearMultiplier)
      ? Math.max(0.05, Math.min(5, old.clearMultiplier))
      : (old.clear ?? 1) / 2;
    c.references = Object.fromEntries(
      Object.keys(CLEAR_REFS).map((key) => [
        key,
        Number.isFinite(old.references?.[key]) && old.references[key] > 0
          ? old.references[key]
          : null,
      ]),
    );
    if (result.mode === "ready") {
      c.minPrint = Number.isFinite(old.minPrint)
        ? Math.max(1, old.minPrint)
        : 25;
      c.minDigital = Number.isFinite(old.minDigital)
        ? Math.max(1, old.minDigital)
        : 120;
    }
  }
  const booleans = (object) =>
    Object.fromEntries(
      Object.entries(object || {}).filter(
        ([k, v]) =>
          k.length < 20000 && /^[\w:-]+$/.test(k) && typeof v === "boolean",
      ),
    );
  result.jpegGlobal = booleans(data.jpegGlobal);
  result.excludedFiles = Array.isArray(data.excludedFiles)
    ? data.excludedFiles.filter((x) => typeof x === "string" && x.length < 4000)
    : [];
  result.colorSelection = booleans(data.colorSelection);
  result.selectedDescriptors = {};
  for (const [id, item] of Object.entries(data.selectedDescriptors || {})) {
    const color = item?.color;
    if (
      !color ||
      !variantIds(result).includes(item.variant) ||
      !["original", "mono", "multi", "gradient"].includes(item.category) ||
      id !== item.variant + ":" + color.id ||
      !/^[\w:-]+$/.test(id)
    )
      continue;
    const mapping = Object.fromEntries(
      Object.entries(color.mapping || {}).filter(
        ([k, v]) => /^[\w-]+$/.test(k) && hexColor(v),
      ),
    );
    const gradient =
      color.gradient &&
      hexColor(color.gradient.from) &&
      hexColor(color.gradient.to)
        ? {
            id: String(color.gradient.id),
            name: String(color.gradient.name).slice(0, 100),
            from: hexColor(color.gradient.from),
            to: hexColor(color.gradient.to),
            angle: Number(color.gradient.angle) || 0,
          }
        : undefined;
    result.selectedDescriptors[id] = {
      id,
      variant: item.variant,
      category: item.category,
      color: {
        id: color.id,
        name: String(color.name).slice(0, 2000),
        hex: hexColor(color.hex),
        mapping,
        gradient,
      },
    };
  }
  result.gradients = (Array.isArray(data.gradients) ? data.gradients : [])
    .filter((g) => /^[\w-]+$/.test(g.id) && hexColor(g.from) && hexColor(g.to))
    .map((g) => ({
      id: g.id,
      name: String(g.name).slice(0, 100),
      from: hexColor(g.from),
      to: hexColor(g.to),
      angle: Number(g.angle) || 0,
    }));
  result.locale = data.locale === "en" ? "en" : "fr";
  return result;
}
