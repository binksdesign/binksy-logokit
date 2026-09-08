import { layout, clearMeasure } from "./model";
import { compositionSVG } from "./svg";
export function clearGuides(l, s, tone = "dark") {
  if (!s) return "";
  const ink = tone === "light" ? "#ededed" : "#333333",
    x = l.x - s,
    y = l.y - s,
    w = l.width + 2 * s,
    h = l.height + 2 * s;
  return (
    `<g fill="none" stroke="${ink}" stroke-opacity=".35" stroke-width="${Math.max(0.5, Math.min(l.width, l.height) / 350)}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/>${[l.x, l.x + l.width].map((a) => `<path d="M${a} ${y}V${y + h}"/>`).join("")}${[l.y, l.y + l.height].map((a) => `<path d="M${x} ${a}H${x + w}"/>`).join("")}</g>` +
    [
      [x, y],
      [l.x + l.width, y],
      [x, l.y + l.height],
      [l.x + l.width, l.y + l.height],
    ]
      .map(
        ([a, b]) =>
          `<g><rect x="${a}" y="${b}" width="${s}" height="${s}" fill="${ink}" fill-opacity=".10"/><path d="M${a + s * 0.42} ${b + s * 0.42}l${s * 0.16} ${s * 0.16}m0 ${-s * 0.16}l${-s * 0.16} ${s * 0.16}" fill="none" stroke="${ink}" stroke-width="${Math.max(0.6, s * 0.025)}"/></g>`,
      )
      .join("")
  );
}
export function clearspaceSVG(p, v, tone = "dark") {
  const l = layout(p, v),
    m = clearMeasure(p, v);
  if (!m.space)
    throw Error(
      "Définissez la mesure de référence du clearspace pour cette variante.",
    );
  const s = m.space,
    pad = Math.max(20, l.width * 0.08),
    x = l.x - s - pad,
    y = l.y - s - pad - 35,
    w = l.width + 2 * s + 2 * pad,
    h = l.height + 2 * s + 2 * pad + 85,
    ink = tone === "light" ? "#ededed" : "#333333";
  const fs = Math.min(14, w / 42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}"><text x="${x + w / 2}" y="${y + 24}" text-anchor="middle" font-family="Arial" font-size="${fs}" fill="${ink}">Clearspace</text>${clearGuides(l, s, tone)}<svg x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" viewBox="${l.x} ${l.y} ${l.width} ${l.height}">${compositionSVG(p, v, { hex: ink, force: true }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg><text x="${x + w / 2}" y="${y + h - 18}" text-anchor="middle" font-family="Arial" font-size="${fs}" fill="${ink}">X = ${m.label.toLowerCase()} × ${m.multiplier} · ${m.space.toFixed(2)} unités</text></svg>`;
}
