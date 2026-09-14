import { emptyGuide } from './guideline-model.js';
import { t } from "./i18n.js";
export const VARIANTS = ["horizontal", "vertical", "icon", "wordmark"];
export const LABELS = {
  horizontal: "Horizontal",
  vertical: "Vertical",
  icon: "Icône",
  wordmark: "Logotype",
};
export const clone = (x) => structuredClone(x);
export function project(mode = "compose") {
  return {
    version: 5,
    brandGuideline: emptyGuide(),
    gradients: [],
    colorSelection: {},
    jpegGlobal: {},
    mode,
    ready: [],
    canvas: "#ffffff",
    jpegOverrides: {},
    jpegExceptions: {},
    id: crypto.randomUUID(),
    brand: t("Sans titre"),
    assets: { icon: null, wordmark: null },
    active: "horizontal",
    enabled: [...VARIANTS],
    grid: true,
    snap: true,
    clear: true,
    colors: [],
    compositions: Object.fromEntries(
      VARIANTS.map((v) => [
        v,
        {
          iconSize: 2.5,
          wordSize: 1,
          gap: 1,
          align: "center",
          center: "real",
          iconX: 0,
          iconY: 0,
          wordmarkX: 0,
          wordmarkY: 0,
          clear: 1,
          clearRef: "wordmarkHeight",
          clearMultiplier: 0.5,
          references: {},
          minPrint: { horizontal: 30, vertical: 25, icon: 8, wordmark: 22 }[v],
          minDigital: { horizontal: 144, vertical: 120, icon: 32, wordmark: 110 }[v],
        },
      ]),
    ),
    excluded: [],
    naming: {
      pattern: "{brand}-{variant}-{color}-{background}",
      separator: "-",
      uppercase: false,
    },
    exports: {
      formats: mode === "clearspace" ? ["svg", "png", "pdf"] : ["svg", "png", "jpeg", "pdf"],
      width: 3000,
      height: 3000,
      dpi: 300,
      jpegMargin: 0.5,
      contrast: 3,
      clearspace: true,
      destinations: ["WEB", "PRINT"],
      printBitmaps: false,
      rasterFormats: ["web-3000"],
      customFormats: [],
      framing: {},
    },
  };
}
export function layout(p, v = p.active) {
  if (isReadyVariant(p, v) || p.mode !== "compose") {
    const variant = p.ready.find((r) => r.id === v);
    if (!variant) return { X: 50, parts: [], x: 0, y: 0, width: 1, height: 1 };
    const asset = variant.asset;
    return {
      X: asset.box.height / 2,
      parts: [
        {
          key: "ready",
          asset,
          x: 0,
          y: 0,
          w: asset.box.width,
          h: asset.box.height,
        },
      ],
      x: 0,
      y: 0,
      width: asset.box.width,
      height: asset.box.height,
    };
  }

  const c = p.compositions[v],
    w = p.assets.wordmark,
    i = p.assets.icon;
  const X = (c.wordmarkHeight ?? (w?.box.height || 100) * c.wordSize) / 2;
  const parts = [];
  if (i && v !== "wordmark")
    parts.push({
      key: "icon",
      asset: i,
      w:
        (i.box.width / i.box.height) *
        (c.iconHeight ?? (c.iconSize * (w?.box.height || 100)) / 2),
      h: c.iconHeight ?? (c.iconSize * (w?.box.height || 100)) / 2,
      x: 0,
      y: 0,
    });
  if (w && v !== "icon")
    parts.push({
      key: "wordmark",
      asset: w,
      w:
        (w.box.width / w.box.height) *
        (c.wordmarkHeight ?? w.box.height * c.wordSize),
      h: c.wordmarkHeight ?? w.box.height * c.wordSize,
      x: 0,
      y: 0,
    });
  if (parts.length === 2) {
    const [a, b] = parts;
    const optical = c.center === "optical";
    const center = (p, axis) => (optical ? p.asset.centroid[axis] : 0.5);
    if (v === "horizontal") {
      b.x = a.w + c.gap * X;
      const h = Math.max(a.h, b.h);
      for (const q of parts)
        q.y =
          c.align === "start"
            ? 0
            : c.align === "end"
              ? h - q.h
              : h / 2 - q.h * center(q, "y");
    } else {
      b.y = a.h + c.gap * X;
      const width = Math.max(a.w, b.w);
      for (const q of parts)
        q.x =
          c.align === "start"
            ? 0
            : c.align === "end"
              ? width - q.w
              : width / 2 - q.w * center(q, "x");
    }
  }
  for (const q of parts) {
    q.x += c[q.key + "X"] * X;
    q.y += c[q.key + "Y"] * X;
  }
  const x = Math.min(...parts.map((q) => q.x), 0),
    y = Math.min(...parts.map((q) => q.y), 0);
  const minX = parts.length ? Math.min(...parts.map((q) => q.x)) : x,
    minY = parts.length ? Math.min(...parts.map((q) => q.y)) : y;
  return {
    X,
    parts,
    x: minX,
    y: minY,
    width: Math.max(1, ...parts.map((q) => q.x + q.w - minX)),
    height: Math.max(1, ...parts.map((q) => q.y + q.h - minY)),
  };
}
export function colors(p) {
  if (p.mode === "clearspace") return [{ id: "original", name: "Original", hex: null }];
  return [
    { id: "original", name: "Original", hex: null },
    { id: "black", name: t("Noir · positif"), hex: "#000000" },
    { id: "white", name: t("Blanc · négatif"), hex: "#ffffff" },
    ...p.colors,
  ];
}
export function baseFamily(p) {
  return p.enabled.flatMap((variant) => {
    const l = layout(p, variant);
    if (
      !l.parts.length ||
      (p.mode === "compose" &&
        ["horizontal", "vertical"].includes(variant) &&
        l.parts.length < 2)
    )
      return [];
    return colors(p).map((color) => ({
      id: variant + ":" + color.id,
      variant,
      color,
    }));
  });
}
export function slug(s, separator = "-") {
  return (
    String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, separator)
      .replace(/^[-_.]+|[-_.]+$/g, "") || "logo"
  );
}
export function filename(p, item, format, background) {
  const values = {
    brand: p.brand,
    variant: variantName(p, item.variant),
    orientation: ["horizontal", "vertical"].includes(item.variant)
      ? item.variant
      : "standalone",
    color:
      item.color.id === "original"
        ? "original"
        : item.color.id === "black"
          ? "black"
          : item.color.id === "white"
            ? "white"
            : item.color.name,
    background:
      background === "transparent"
        ? "transparent"
        : backgrounds(p).find(
            (c) => c.hex.toLowerCase() === background?.toLowerCase(),
          )?.name || background,
    size: ["png", "jpeg"].includes(format)
      ? `${p.exports.width}x${p.exports.height}`
      : "vector",
    format,
  };
  let name = p.naming.pattern.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? "");
  name = slug(name, p.naming.separator);
  return (
    (p.naming.uppercase ? name.toUpperCase() : name.toLowerCase()) +
    "." +
    format
  );
}
export class History {
  past = [];
  future = [];
  push(p) {
    this.past.push(clone(p));
    if (this.past.length > 60) this.past.shift();
    this.future = [];
  }
  undo(p) {
    if (!this.past.length) return p;
    this.future.push(clone(p));
    return this.past.pop();
  }
  redo(p) {
    if (!this.future.length) return p;
    this.past.push(clone(p));
    return this.future.pop();
  }
}

export function variantIds(p) {
  return [...(p.mode === "compose" ? VARIANTS : []), ...(p.ready || []).map((r) => r.id)];
}
export function isReadyVariant(p, id = p.active) {
  return !!p.ready?.some((r) => r.id === id);
}
export function variantName(p, id) {
  return p.ready?.find((r) => r.id === id)?.name || t(LABELS[id] || id);
}
// Names are also export path components: avoid collisions after slug normalization.
export function uniqueVariantName(p, name, exceptId) {
  const base = String(name).trim().slice(0, 90) || t("Variante");
  const used = new Set(variantIds(p).filter(id => id !== exceptId).map(id => slug(variantName(p, id)).toLowerCase()));
  let candidate = base, n = 2;
  while (used.has(slug(candidate).toLowerCase())) candidate = `${base} ${n++}`;
  return candidate;
}
export function backgrounds(p) {
  return [
    { id: "black", name: "noir", hex: "#000000" },
    { id: "white", name: "blanc", hex: "#ffffff" },
    ...p.colors,
  ];
}
export function luminance(hex) {
  const c = hex
    .slice(1)
    .match(/../g)
    .map((n) => parseInt(n, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function originalPaints(p, variant) {
  return [
    ...new Set(layout(p, variant).parts.flatMap((q) => q.asset.paints || [])),
  ];
}
export function jpegPairs(p, item) {
  return backgrounds(p).map((bg) => {
    const paints = layout(p, item.variant).parts.flatMap((q) =>
      (q.asset.roles || []).flatMap((r) =>
        r.locked
          ? [r.paint]
          : item.color.gradient
            ? []
            : [item.color.partColors?.[q.key] || item.color.mapping?.[r.id] || item.color.hex || r.paint],
      ),
    );
    if (item.color.gradient)
      paints.push(
        ...(item.color.gradient.stops?.map((s) => s.color) || [
          item.color.gradient.from,
          item.color.gradient.to,
        ]),
      );
    if (!paints.length)
      paints.push(
        ...(item.color.hex
          ? [item.color.hex]
          : originalPaints(p, item.variant)),
      );
    const ratio = paints.length
      ? Math.min(...paints.map((hex) => contrast(hex, bg.hex)))
      : 0;
    const id = item.id + ":jpeg:" + bg.id;
    return {
      ...item,
      id,
      background: bg,
      ratio,
      recommended: ratio >= p.exports.contrast,
      globalId: item.color.id + ":jpeg:" + bg.id,
      enabled:
        p.jpegExceptions?.[id] ??
        p.jpegGlobal?.[item.color.id + ":jpeg:" + bg.id] ??
        p.jpegOverrides[id] ??
        ratio >= p.exports.contrast,
    };
  });
}
export function family(p) {
  const base = baseFamily(p);
  return [
    ...base,
    ...(p.exports.formats.includes("jpeg")
      ? base.flatMap((item) =>
          jpegPairs(p, item).filter((pair) => pair.enabled),
        )
      : []),
  ];
}
export const CLEAR_REFS = {
  brandmarkWidth: "Largeur du brandmark",
  brandmarkHeight: "Hauteur du brandmark",
  wordmarkHeight: "Hauteur du logotype",
};
export function clearMeasure(p, v = p.active) {
  const c = p.compositions[v] || project().compositions.horizontal,
    l = layout(p, v);
  let value;
  if (c.clearMethod === "visual") value = c.visualMeasure?.value;
  else if (c.clearMethod === "auto") value = Math.min(l.width, l.height);
  else if (isReadyVariant(p, v) || p.mode !== "compose")
    value = c.references?.[c.clearRef] || Math.min(l.width, l.height);
  else {
    const icon = l.parts.find((q) => q.key === "icon");
    const word = l.parts.find((q) => q.key === "wordmark");
    const iconH =
      icon?.h ||
      (p.assets.icon
        ? (c.iconHeight ??
          (c.iconSize * (p.assets.wordmark?.box.height || 100)) / 2)
        : 0);
    value =
      c.clearRef === "brandmarkWidth"
        ? icon?.w ||
          (p.assets.icon
            ? (iconH * p.assets.icon.box.width) / p.assets.icon.box.height
            : 0)
        : c.clearRef === "brandmarkHeight"
          ? iconH
          : word?.h ||
            (p.assets.wordmark
              ? (c.wordmarkHeight ?? p.assets.wordmark.box.height * c.wordSize)
              : 0);
  }
  return {
    reference: c.clearRef,
    label: c.clearMethod === "visual" ? (c.visualMeasure?.label || t("Mesure dessinée")) : c.clearMethod === "auto" ? t("Petit côté du logo") : t(CLEAR_REFS[c.clearRef]),
    value: value || (l.parts.length ? Math.min(l.width, l.height) : 0),
    multiplier: c.clearMultiplier,
    space:
      (value || (l.parts.length ? Math.min(l.width, l.height) : 0)) *
      c.clearMultiplier,
  };
}
