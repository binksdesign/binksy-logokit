import DOMPurify from "dompurify";
import { layout } from "./model";
export const NS = "http://www.w3.org/2000/svg";
const serialize = (n) => new XMLSerializer().serializeToString(n);
export function clean(source) {
  if (source.length > 3e6) throw Error("SVG trop volumineux (3 Mo maximum).");
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw Error("Ce fichier n’est pas un SVG valide.");
  if (doc.querySelector("image,foreignObject"))
    throw Error(
      "Le fichier contient une image ou du contenu non vectoriel. Importez des tracés SVG.",
    );
  const safe = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: [
      "foreignObject",
      "image",
      "script",
      "animate",
      "animateTransform",
      "set",
      "a",
    ],
  });
  const root = new DOMParser().parseFromString(
    safe,
    "image/svg+xml",
  ).documentElement;
  for (const el of [root, ...root.querySelectorAll("*")])
    for (const a of [...el.attributes]) {
      if (/href$/i.test(a.name) && !a.value.startsWith("#"))
        el.removeAttribute(a.name);
      if (hasExternalUrl(a.value))
        throw Error("Les ressources externes ne sont pas acceptées.");
    }
  for (const style of root.querySelectorAll("style"))
    if (/@import/i.test(style.textContent) || hasExternalUrl(style.textContent))
      throw Error("Le SVG utilise des ressources CSS externes.");
  return root;
}
export function mount(root) {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-20000px;top:0;opacity:0;pointer-events:none;width:2000px;height:2000px";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.append(root);
  document.body.append(host);
  return () => host.remove();
}
export async function importSVG(source, name, font) {
  const root = clean(source);
  root.setAttribute("xmlns", NS);
  const dispose = mount(root);
  try {
    const texts = [...root.querySelectorAll("text")];
    if (texts.length) {
      if (!font)
        throw Error(
          "Texte non vectorisé : chargez la police OTF/TTF correspondante, puis réimportez le SVG.",
        );
      for (const text of texts) {
        if (
          text.children.length ||
          text.hasAttribute("textLength") ||
          text.hasAttribute("rotate")
        )
          throw Error(
            "Texte complexe : vectorisez-le dans votre logiciel avant import.",
          );
        const s = getComputedStyle(text),
          size = parseFloat(s.fontSize) || 16;
        const content = text.textContent;
        let x = parseFloat(text.getAttribute("x")) || 0,
          y = parseFloat(text.getAttribute("y")) || 0;
        const width = font.getAdvanceWidth(content, size);
        if (s.textAnchor === "middle") x -= width / 2;
        if (s.textAnchor === "end") x -= width;
        const path = document.createElementNS(NS, "path");
        for (const a of text.attributes)
          if (!["x", "y", "dx", "dy"].includes(a.name))
            path.setAttribute(a.name, a.value);
        path.setAttribute(
          "d",
          font
            .getPath(
              content,
              x + (parseFloat(text.getAttribute("dx")) || 0),
              y + (parseFloat(text.getAttribute("dy")) || 0),
              size,
            )
            .toPathData(4),
        );
        path.setAttribute("fill", s.fill);
        text.replaceWith(path);
      }
    }
    // Inline computed presentation before namespacing IDs; imported styles cannot leak into the UI.
    const props = [
      "fill",
      "stroke",
      "stroke-width",
      "fill-rule",
      "clip-rule",
      "opacity",
      "fill-opacity",
      "stroke-opacity",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-miterlimit",
      "stroke-dasharray",
      "stroke-dashoffset",
      "display",
      "visibility",
      "color",
      "stop-color",
      "stop-opacity",
      "clip-path",
      "mask",
      "filter",
    ];
    for (const el of [root, ...root.querySelectorAll("*")]) {
      const s = getComputedStyle(el);
      for (const prop of props) {
        const value = s.getPropertyValue(prop);
        if (value)
          el.setAttribute(prop, value.replace(/url\(["']?[^#)]*#/g, "url(#"));
      }
      el.removeAttribute("style");
      el.removeAttribute("class");
    }
    root.querySelectorAll("style").forEach((n) => n.remove());
    const b = root.getBBox();
    if (!b.width || !b.height)
      throw Error("Le SVG ne contient aucune forme visible.");
    let padding = 0;
    for (const el of root.querySelectorAll(
      "path,rect,circle,ellipse,line,polygon,polyline",
    )) {
      const style = getComputedStyle(el);
      if (style.stroke !== "none") {
        const m = el.getCTM(),
          scale = Math.max(Math.hypot(m.a, m.b), Math.hypot(m.c, m.d));
        const join =
          ["path", "polygon", "polyline"].includes(el.localName) &&
          style.strokeLinejoin === "miter"
            ? parseFloat(style.strokeMiterlimit) || 4
            : 1;
        padding = Math.max(
          padding,
          ((parseFloat(style.strokeWidth) || 0) * scale * join) / 2,
        );
      }
    }
    const box = {
      x: b.x - padding,
      y: b.y - padding,
      width: b.width + padding * 2,
      height: b.height + padding * 2,
    };
    const sourceViewBox = root.getAttribute("viewBox");
    root.setAttribute(
      "viewBox",
      `${box.x} ${box.y} ${box.width} ${box.height}`,
    );
    root.setAttribute("width", box.width);
    root.setAttribute("height", box.height);
    const prefix = "a" + crypto.randomUUID().replaceAll("-", "");
    let markup = serialize(root);
    const ids = [...root.querySelectorAll("[id]")]
      .map((n) => n.id)
      .sort((a, b) => b.length - a.length);
    for (const [index, id] of ids.entries()) {
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      markup = markup
        .replace(new RegExp(`id="${escaped}"`, "g"), `id="${prefix}_${index}"`)
        .replace(
          new RegExp(`#${escaped}(?=["')\\s])`, "g"),
          `#${prefix}_${index}`,
        );
    }
    const centroid = await massCenter(markup);
    return {
      paints: [
        ...new Set(
          [
            ...root.querySelectorAll(
              "path,rect,circle,ellipse,polygon,polyline,stop",
            ),
          ]
            .filter(
              (el) =>
                !el.closest("clipPath,mask") &&
                el.getAttribute("display") !== "none",
            )
            .flatMap((el) =>
              el.localName === "stop"
                ? [el.getAttribute("stop-color")]
                : [el.getAttribute("fill"), el.getAttribute("stroke")],
            )
            .filter(Boolean)
            .flatMap((value) => {
              const rgb = value.match(/^rgb\((\d+)[, ]+(\d+)[, ]+(\d+)\)$/);
              return rgb
                ? [
                    "#" +
                      rgb
                        .slice(1)
                        .map((n) => (+n).toString(16).padStart(2, "0"))
                        .join(""),
                  ]
                : /^#[0-9a-f]{6}$/i.test(value)
                  ? [value]
                  : [];
            }),
        ),
      ],
      name,
      svg: markup,
      box,
      centroid,
      sourceViewBox,
      hasStroke: padding > 0,
    };
  } finally {
    dispose();
  }
}
async function massCenter(svg) {
  const img = await svgImage(svg);
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, 128, 128);
  const pixels = ctx.getImageData(0, 0, 128, 128).data;
  let mass = 0,
    x = 0,
    y = 0;
  for (let j = 0; j < 128; j++)
    for (let i = 0; i < 128; i++) {
      const a = pixels[(j * 128 + i) * 4 + 3];
      mass += a;
      x += (i + 0.5) * a;
      y += (j + 0.5) * a;
    }
  return mass ? { x: x / mass / 128, y: y / mass / 128 } : { x: 0.5, y: 0.5 };
}
export function svgImage(svg) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })),
      img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(Error("Impossible de lire le SVG."));
    };
    img.src = url;
  });
}
const markupCache = new WeakMap();
export function assetMarkup(asset, color, namespace = "") {
  let cache = markupCache.get(asset);
  if (!cache) {
    cache = new Map();
    markupCache.set(asset, cache);
  }
  const cacheKey = (color || "original") + namespace;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let root = new DOMParser().parseFromString(
    asset.svg,
    "image/svg+xml",
  ).documentElement;
  if (color)
    for (const el of [root, ...root.querySelectorAll("*")]) {
      if (el.closest("clipPath,mask")) continue;
      for (const prop of ["fill", "stroke"])
        if (el.getAttribute(prop) && el.getAttribute(prop) !== "none")
          el.setAttribute(prop, color);
    }
  let str = serialize(root);
  if (namespace)
    str = str
      .replace(/id="([^"]+)"/g, `id="${namespace}_$1"`)
      .replace(/#(a[a-f0-9]+_[^\s)'"<>]+)/g, `#${namespace}_$1`);
  cache.set(cacheKey, str);
  return str;
}
export function compositionSVG(p, variant, color = null, background = null) {
  const l = layout(p, variant);
  return `<svg xmlns="${NS}" width="${l.width}" height="${l.height}" viewBox="${l.x} ${l.y} ${l.width} ${l.height}">${background ? `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="${background}"/>` : ""}${l.parts.map((q) => `<g transform="translate(${q.x} ${q.y}) scale(${q.w / q.asset.box.width})"><svg x="0" y="0" width="${q.asset.box.width}" height="${q.asset.box.height}" viewBox="${q.asset.box.x} ${q.asset.box.y} ${q.asset.box.width} ${q.asset.box.height}">${assetContent(q.asset, color, q.key)}</svg></g>`).join("")}</svg>`;
}

export function assetContent(asset, color, namespace) {
  return assetMarkup(asset, color, namespace)
    .replace(
      /^<svg([^>]*)>/,
      (_, attrs) =>
        "<g" +
        attrs.replace(
          /\s(?:xmlns(?::\w+)?|width|height|viewBox|x|y|preserveAspectRatio)="[^"]*"/g,
          "",
        ) +
        ">",
    )
    .replace(/<\/svg>$/, "</g>");
}

function hasExternalUrl(value) {
  return [...value.matchAll(/url\(([^)]*)\)/gi)].some(
    (match) =>
      !match[1]
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .startsWith("#"),
  );
}
