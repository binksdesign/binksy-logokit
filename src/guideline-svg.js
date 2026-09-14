import { glyphPathData } from './glyph-path.js';
import { logoColor } from "./guideline-logos.js";
import { pageElements } from "./guideline-layout.js";
import { dimensions, theme, pageTheme } from "./guideline-theme.js";
import { compositionSVG } from "./svg.js";
import { clearspaceSVG } from "./clearspace.js";
import { imageFrame } from './guideline-media.js';
import {
  parsedFont,
  fontFor,
  fontResources,
  fontFamily,
  fontRun,
} from "./guideline-fonts.js";
export const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const inner = (s) => s.replace(/^<svg[^>]*>|<\/svg>$/g, "");
function fitSVG(svg, x, y, w, h) {
  return svg.replace(/^<svg\b[^>]*>/, (root) =>
    root
      .replace(/\s(?:width|height|x|y)="[^"]*"/g, "")
      .replace("> ", ">")
      .replace(
        />$/,
        ` x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet">`,
      ),
  );
}
export function textLines(e, g) {
  const font = fontFor(g, e),
    measure = (s) =>
      (font ? fontRun(font, s, e.size).width : s.length * e.size * 0.53) +
      Math.max(0, Array.from(s).length - 1) * (e.tracking || 0);
  const lines = [];
  for (const paragraph of String(e.text).normalize("NFC").split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? line + " " + word : word;
      if (measure(next) <= e.w) {
        line = next;
        continue;
      }
      if (line) {
        lines.push(line);
        line = "";
      }
      for (const character of word) {
        if (line && measure(line + character) > e.w) {
          lines.push(line);
          line = "";
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}
export function textMetrics(e,g) {
  const resource=fontFor(g,e), font=resource ? parsedFont(resource) : null;
  const ascent=font?Math.max(0,font.ascender)/font.unitsPerEm*e.size:e.size;
  const descent=font?Math.max(0,-font.descender)/font.unitsPerEm*e.size:e.size*.25;
  return {ascent,descent,height:(textLines(e,g).length-1)*e.size*(e.leading || 1.4)+ascent+descent};
}
export function fittedText(e, g) {
  let result = { ...e };
  while (
    result.size > 6 &&
    textMetrics(result,g).height >
      result.h
  )
    result.size = Math.max(6, result.size - 0.25);
  return result;
}
export function renderText(e, g, paths = false) {
  e = fittedText(e, g);
  const font = fontFor(g, e),
    family = font ? "bg-" + font.id : "Helvetica",
    lines = textLines(e, g),
    leading = (e.leading || 1.4) * e.size,
    baseline = textMetrics(e,g).ascent;
  if (paths && font)
    return lines
      .map((line, i) => {
        const run = fontRun(font, line, e.size, e.tracking || 0);
        const offset = e.align === "center" ? (e.w-run.width)/2 : e.align === "right" ? e.w-run.width : 0;
        return run.placements
          .map(
            ({ glyph, x }) =>
              `<path fill="${e.fill}" d="${glyphPathData(glyph.getPath(e.x + offset + x, e.y + baseline + i * leading, e.size, {}, run.font))}"/>`,
          )
          .join("");
      })
      .join("");
  return `<text xml:space="preserve" font-variant-ligatures="none" font-kerning="none" font-family="${family}" font-size="${e.size}" font-weight="${e.weight || 400}" fill="${e.fill}">${lines.map((line, i) => {
    const run = font ? fontRun(font,line,e.size,e.tracking || 0) : null;
    const width = run?.width || line.length*e.size*.53;
    const offset = e.align === "center" ? (e.w-width)/2 : e.align === "right" ? e.w-width : 0;
    const positions = run ? run.placements.map(a=>e.x+offset+a.x).join(" ") : e.x+offset;
    return `<tspan x="${positions}" y="${e.y + baseline + i * leading}">${escape(line)}</tspan>`;
  }).join("")}</text>`;
}
function effectSVG(svg, e, id) {
  const w = e.w,
    h = e.h,
    pad = e.effect ? 0.18 : 0,
    base = fitSVG(svg, w * pad, h * pad, w * (1 - 2 * pad), h * (1 - 2 * pad)),
    center = `translate(${w / 2} ${h / 2})`,
    back = `translate(${-w / 2} ${-h / 2})`;
  const transforms = {
    wide: "scale(1.4 1)",
    tall: "scale(.65 1.18)",
    rotate: "rotate(22)",
    skew: "skewX(22)",
  };
  if (e.effect === "perspective") {
    // Thin clipped vector strips approximate the projective plane without flattening artwork.
    const count = 32,
      strip = w / count;
    return Array.from({ length: count }, (_, i) => {
      const x = i * strip,
        t = (i + 0.5) / count,
        scale = 1 - 0.48 * t,
        clip = id + "-" + i;
      return `<defs><clipPath id="${clip}"><rect x="${x}" width="${strip + 0.5}" height="${h}"/></clipPath></defs><g transform="translate(0 ${(h * (1 - scale)) / 2}) scale(1 ${scale})"><g clip-path="url(#${clip})">${base}</g></g>`;
    }).join("");
  }
  if (transforms[e.effect])
    return `<g transform="${center} ${transforms[e.effect]} ${back}">${base}</g>`;
  if (e.effect === "opacity") return `<g opacity=".25">${base}</g>`;
  if (e.effect === "crop")
    return `<defs><clipPath id="${id}"><rect width="${w * 0.67}" height="${h}"/></clipPath></defs><g clip-path="url(#${id})">${base}</g>`;
  if (e.effect === "blur" || e.effect === "glow")
    return `<defs><filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${e.effect === "blur" ? 3 : 5}"/></filter></defs>${e.effect === "glow" ? `<g filter="url(#${id})">${base}</g>${base}` : `<g filter="url(#${id})">${base}</g>`}`;
  if (e.effect === "shadow")
    return `<g transform="translate(7 7)" opacity=".3">${base}</g>${base}`;
  if (e.effect === "outline") {
    const root = new DOMParser().parseFromString(
      base,
      "image/svg+xml",
    ).documentElement;
    root
      .querySelectorAll("path,rect,circle,ellipse,polygon,polyline")
      .forEach((n) => {
        n.setAttribute("fill", "none");
        n.setAttribute("stroke", "#ff5500");
        n.setAttribute("stroke-width", "3");
      });
    return new XMLSerializer().serializeToString(root);
  }
  return base;
}
export function elementSVG(p, e, prefix = "g", paths = false) {
  const g = p.brandGuideline;
  if (e.type === "text") return renderText(e, g, paths);
  if (e.type === "rect")
    return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${e.fill}"${e.stroke ? ` stroke="${e.stroke}" stroke-width=".4"` : ""}/>`;
  if (e.type === "placeholder")
    return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="${e.fill}" stroke="#b5b5b5" stroke-dasharray="4 4"/>`;
  if (e.type === "image") {
    const r = g.resources.find((r) => r.id === e.resource);
    if (!r) return "";
    const frame = imageFrame(e, r, e), id = prefix + '-clip';
    return `<defs><clipPath id="${id}"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}"/></clipPath></defs><image clip-path="url(#${id})" href="${r.data}" x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" preserveAspectRatio="none"/>`;
  }
  if (e.type === "logo") {
    let source = p;
    if (["proportions", "spacing"].includes(e.effect))
      source = {
        ...p,
        compositions: {
          ...p.compositions,
          [e.variant]: {
            ...p.compositions[e.variant],
            ...(e.effect === "spacing"
              ? { gap: 4 }
              : {
                  iconHeight:
                    (p.compositions[e.variant]?.iconHeight || 100) * 0.45,
                }),
          },
        },
      };
    const color =
      e.effect === "colors"
        ? { hex: "#ed24ae", force: true }
        : e.effect === "contrast"
          ? { hex: "#eeeeee", force: true }
          : e.effect === "gradient"
            ? {
                gradient: {
                  from: "#ed24ae",
                  to: "#36d4ee",
                  angle: 35,
                  mode: "global",
                },
                force: true,
              }
          : e.colorId ? logoColor(p, e.variant, e.colorId) : e.fill ? {hex: e.fill, force: true} : null;
    const svg = e.clearspace
      ? clearspaceSVG(p, e.variant, "dark", {graphicOnly:true,color,guideColor:e.guideColor})
      : compositionSVG(source, e.variant, color);
    return `<g transform="translate(${e.x} ${e.y})">${effectSVG(svg, e, prefix)}</g>`;
  }
  return "";
}
export function guidelineSVG(
  p,
  page,
  index = 0,
  { paths = false, editor = false, portable = false } = {},
) {
  const g = p.brandGuideline,
    { width: W, height: H } = dimensions(g),
    T = pageTheme(p, page);
  const groups = {text:'TEXT',logo:'LOGOS',image:'IMAGES',rect:'DECORATION',placeholder:'IMAGES'};
  const counts = {};
  const content = pageElements(p,page,index).map(e=>{
    const group=groups[e.type] || 'DECORATION';
    counts[group]=(counts[group] || 0)+1;
    return `<g id="${group}_${counts[group]}" data-name="${group}"><g id="${escape(page.id+'-'+e.id)}" data-name="${escape(e.id)}" ${editor ? `data-guide-element="${escape(e.id)}" tabindex="0" role="button" aria-label="${escape(e.text || e.type)}"` : ''}>${elementSVG(p,e,'bg-'+page.id+'-'+e.id,paths)}</g></g>`;
  }).join('');
  let result = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}pt" height="${H}pt" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(page.title || page.type)}"><g id="BACKGROUND"><rect width="${W}" height="${H}" fill="${page.background || T.background}"/></g>${content}</svg>`;
  if (portable)
    for (const r of fontResources(g))
      result = result.replaceAll(
        'font-family="bg-' + r.id + '"',
        'font-family="' + escape(fontFamily(r)) + '"',
      );
  return result;
}
