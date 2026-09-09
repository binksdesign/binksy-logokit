import {
  gradientSettings,
  gradientVector,
  automaticGradientMode,
} from "./gradient.js";
import DOMPurify from "dompurify";
import { layout } from "./model";
import { detectRoles } from "./paints.js";
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
          el.setAttribute(
            prop,
            value.replace(/url\(["']?[^#)]*#([^"')]+)["']?\)/g, "url(#$1)"),
          );
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
    const paintTransforms = {};
    const rootMatrix = root.getScreenCTM();
    if (rootMatrix)
      [root, ...root.querySelectorAll("*")].forEach((el, index) => {
        if (!el.getScreenCTM) return;
        const matrix = el.getScreenCTM();
        if (!matrix) return;
        const relative = rootMatrix.inverse().multiply(matrix);
        if (
          [
            relative.a,
            relative.b,
            relative.c,
            relative.d,
            relative.e,
            relative.f,
          ].every(Number.isFinite)
        )
          paintTransforms[index] = [
            relative.a,
            relative.b,
            relative.c,
            relative.d,
            relative.e,
            relative.f,
          ];
      });
    const centroid = await massCenter(markup);
    return {
      roles: detectRoles(root),
      paintTransforms,
      hasGradient: !!root.querySelector("linearGradient,radialGradient"),
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
function setPaint(el, prop, paint) {
  const alpha = el
    .getAttribute(prop)
    ?.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/)?.[1];
  if (alpha && /^#[0-9a-f]{6}$/i.test(paint)) {
    const rgb = paint
      .slice(1)
      .match(/../g)
      .map((n) => parseInt(n, 16));
    el.setAttribute(prop, `rgba(${rgb.join(",")},${alpha})`);
  } else el.setAttribute(prop, paint);
}
export function assetMarkup(asset, color, namespace = "") {
  let cache = markupCache.get(asset);
  if (!cache) {
    cache = new Map();
    markupCache.set(asset, cache);
  }
  const cacheKey = JSON.stringify([color, asset.roles, namespace]);
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let root = new DOMParser().parseFromString(
    asset.svg,
    "image/svg+xml",
  ).documentElement;
  const nodes = [root, ...root.querySelectorAll("*")];
  const spec = typeof color === "string" ? { hex: color } : color || {};
  const roles = asset.roles || detectRoles(root);
  for (const role of roles)
    for (const target of role.targets) {
      const el = nodes[target.index];
      if (el)
        setPaint(
          el,
          target.prop,
          ((!role.locked || spec.force) &&
            (spec.mapping?.[role.id] || spec.hex)) ||
            role.paint,
        );
      if (
        el &&
        spec.gradient &&
        !role.locked &&
        !spec.gradient.excludedRoles?.includes(role.id) &&
        target.prop === "stop-color"
      ) {
        const offset = el.getAttribute("offset") || "0",
          f = Math.max(
            0,
            Math.min(1, parseFloat(offset) / (offset.endsWith("%") ? 100 : 1)),
          );
        const stops = gradientSettings(spec.gradient).stops;
        const high = stops.findIndex((s) => s.offset >= f);
        const bStop = stops[high < 0 ? stops.length - 1 : high],
          aStop = stops[Math.max(0, high < 0 ? stops.length - 1 : high - 1)];
        const blend =
          bStop.offset === aStop.offset
            ? 0
            : Math.max(
                0,
                Math.min(1, (f - aStop.offset) / (bStop.offset - aStop.offset)),
              );
        const a = aStop.color
            .slice(1)
            .match(/../g)
            .map((n) => parseInt(n, 16)),
          b = bStop.color
            .slice(1)
            .match(/../g)
            .map((n) => parseInt(n, 16));
        setPaint(
          el,
          "stop-color",
          "#" +
            a
              .map((v, i) =>
                Math.round(v + (b[i] - v) * blend)
                  .toString(16)
                  .padStart(2, "0"),
              )
              .join(""),
        );
      }
    }
  if (spec.gradient) {
    const g = spec.gradient,
      id = "generated-gradient";
    const defs = document.createElementNS(NS, "defs"),
      gradient = document.createElementNS(NS, "linearGradient");
    gradient.id = id;
    const settings = gradientSettings(g);
    const mode =
      settings.mode === "auto" ? automaticGradientMode(asset) : settings.mode;
    const box = g.box || asset.box;
    gradient.setAttribute(
      "gradientUnits",
      mode === "shape" ? "objectBoundingBox" : "userSpaceOnUse",
    );
    const vector = gradientVector(
      mode === "shape" ? { x: 0, y: 0, width: 1, height: 1 } : box,
      Number(g.angle) || 0,
    );
    for (const [key, value] of Object.entries(vector))
      gradient.setAttribute(key, value);
    for (const { offset, color: paint } of settings.stops) {
      const stop = document.createElementNS(NS, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", paint);
      gradient.append(stop);
    }
    defs.append(gradient);
    root.prepend(defs);
    const locked = new Set(
      roles
        .filter((r) => r.locked || settings.excludedRoles.includes(r.id))
        .flatMap((r) => r.targets.map((t) => t.index + ":" + t.prop)),
    );
    const gradientLocked = roles.some(
      (r) =>
        (r.locked || settings.excludedRoles.includes(r.id)) &&
        r.targets.some((t) => t.prop === "stop-color"),
    );
    nodes.forEach((el, index) => {
      if (
        !/^(path|rect|circle|ellipse|polygon|polyline|line|use)$/.test(
          el.localName,
        ) ||
        el.closest("clipPath,mask,pattern,filter")
      )
        return;
      for (const prop of ["fill", "stroke"]) {
        const old = el.getAttribute(prop);
        if (
          old &&
          old !== "none" &&
          !locked.has(index + ":" + prop) &&
          !(
            (gradientLocked || settings.mode === "auto") &&
            old.includes("url(")
          )
        ) {
          const alpha = old.match(
            /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/,
          )?.[1];
          if (alpha)
            el.setAttribute(
              prop + "-opacity",
              (+el.getAttribute(prop + "-opacity") || 1) * Number(alpha),
            );
          let paintId = id;
          const transform = asset.paintTransforms?.[index];
          if (
            mode !== "shape" &&
            transform &&
            transform.some(
              (n, i) => Math.abs(n - [1, 0, 0, 1, 0, 0][i]) > 1e-10,
            )
          ) {
            paintId = id + "-" + index;
            if (!defs.querySelector(`[id="${paintId}"]`)) {
              const copy = gradient.cloneNode(true),
                inverse = new DOMMatrix(transform).inverse();
              copy.id = paintId;
              copy.setAttribute(
                "gradientTransform",
                `matrix(${[inverse.a, inverse.b, inverse.c, inverse.d, inverse.e, inverse.f].join(" ")})`,
              );
              defs.append(copy);
            }
          }
          el.setAttribute(prop, `url(#${paintId})`);
        }
      }
    });
  }
  if (spec.highlight) {
    const role = roles.find((r) => r.id === spec.highlight);
    const marked = new Set(
      role?.targets.map((t) => nodes[t.index]).filter(Boolean),
    );
    for (const stop of [...marked])
      if (stop.localName === "stop") {
        const id = stop.parentElement.id;
        nodes
          .filter((el) =>
            ["fill", "stroke"].some((prop) =>
              el.getAttribute(prop)?.includes(`#${id}`),
            ),
          )
          .forEach((el) => marked.add(el));
      }
    for (const el of nodes)
      if (
        /^(path|rect|circle|ellipse|polygon|polyline|line|use)$/.test(
          el.localName,
        ) &&
        !el.closest("defs,clipPath,mask")
      ) {
        el.setAttribute("opacity", marked.has(el) ? "1" : ".12");
        if (marked.has(el)) {
          el.setAttribute("stroke", "#ff5500");
          el.setAttribute("stroke-width", "2");
          el.setAttribute("vector-effect", "non-scaling-stroke");
        }
      }
  }
  let str = serialize(root);
  if (namespace) {
    for (const el of root.querySelectorAll("[id]")) {
      const id = el.id,
        escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      str = str
        .replace(new RegExp(`id="${escaped}"`, "g"), `id="${namespace}_${id}"`)
        .replace(
          new RegExp(`#${escaped}(?=["')\\s])`, "g"),
          `#${namespace}_${id}`,
        );
    }
  }
  if (cache.size >= 24) cache.clear();
  if (str.length < 256000) cache.set(cacheKey, str);
  return str;
}
let compositionNamespace = 0;
export function compositionSVG(p, variant, color = null, background = null) {
  const namespace = "composition-" + ++compositionNamespace + "-";
  const l = layout(p, variant);
  return `<svg xmlns="${NS}" width="${l.width}" height="${l.height}" viewBox="${l.x} ${l.y} ${l.width} ${l.height}">${background ? `<rect x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" fill="${background}"/>` : ""}${l.parts
    .map(
      (q) =>
        `<g transform="translate(${q.x} ${q.y}) scale(${q.w / q.asset.box.width})"><svg x="0" y="0" width="${q.asset.box.width}" height="${q.asset.box.height}" viewBox="${q.asset.box.x} ${q.asset.box.y} ${q.asset.box.width} ${q.asset.box.height}">${assetContent(
          q.asset,
          color?.gradient && color.gradient.mode !== "shape"
            ? {
                ...color,
                gradient: {
                  ...color.gradient,
                  box: {
                    x: q.asset.box.x + (l.x - q.x) / (q.w / q.asset.box.width),
                    y: q.asset.box.y + (l.y - q.y) / (q.h / q.asset.box.height),
                    width: l.width / (q.w / q.asset.box.width),
                    height: l.height / (q.h / q.asset.box.height),
                  },
                },
              }
            : color,
          namespace + q.key,
        )}</svg></g>`,
    )
    .join("")}</svg>`;
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
