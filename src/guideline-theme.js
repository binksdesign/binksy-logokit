import { FORMATS } from "./guideline-model.js";
import { finalPalette } from './guideline-config.js';
import { contrast } from './model.js';
export { contrast } from './model.js';
export function paletteInk(p, background, preferred) {
  const colors=finalPalette(p);
  const candidate=colors.find(c=>c.hex===preferred);
  if(candidate && contrast(candidate.hex,background)>=4.5)return candidate.hex;
  return [...colors].sort((a,b)=>contrast(b.hex,background)-contrast(a.hex,background))[0]?.hex || background;
}
export function theme(p) {
  const g = p.brandGuideline,
    colors = finalPalette(p);
  const role = (name, fallback) =>
    colors.find((c) => c.role === name)?.hex || fallback;
  const background = role("background", colors[0]?.hex || "#ffffff");
  const ink = (colors.length ? colors.map((c) => c.hex) : ["#171717", "#ffffff"]).sort(
    (a, b) => contrast(b, background) - contrast(a, background),
  )[0];
  const overrides = { ...g.theme };
  for (const key of ['background', 'secondary', 'text', 'muted', 'accent', 'rule']) {
    if (overrides[key] && !colors.some(c => c.hex.toLowerCase() === overrides[key].toLowerCase())) delete overrides[key];
  }
  return {
    background,
    secondary: role("secondary-background", background),
    text: role("text", ink),
    muted: role("secondary-text", ink),
    accent: role("accent", colors[0]?.hex || ink),
    margin: 36,
    spacing: 16,
    grid: 8,
    numbers: true,
    ...overrides,
  };
}
export function typeStyle(g, role = "body") {
  const portrait = g.format === "portrait",
    a4 = g.format !== "16:9";
  const sizes = {
    title: a4 ? 30 : 36,
    subtitle: a4 ? 22 : 26,
    heading: 14,
    body: a4 ? 10.5 : 12,
    small: 9,
    caption: 8,
  };
  const style = {
    size: sizes[role] || 12,
    weight: role === "title" ? 600 : 400,
    leading: 1.4,
    tracking: 0,
    font: g.typography.body?.font || "",
    ...g.typography[role],
  };
  const font = g.resources.find(
    (r) => r.id === style.font && r.type === "font",
  );
  style.weight = font?.weight || 400;
  style.family = font?.family || 'Instrument Sans';
  style.pt = style.size;
  style.px = style.size * 4 / 3;
  return style;
}
export function colorValues(h) {
  const [r, g, b] = h.match(/[a-f\d]{2}/gi).map((v) => parseInt(v, 16)),
    k = 1 - Math.max(r, g, b) / 255;
  return {
    rgb: `${r}, ${g}, ${b}`,
    cmyk: [r, g, b]
      .map((v) => Math.round(k === 1 ? 0 : ((1 - v / 255 - k) / (1 - k)) * 100))
      .concat(Math.round(k * 100))
      .join(" / "),
  };
}
export function dimensions(g) {
  return FORMATS[g.format] || FORMATS["16:9"];
}

export function mixColor(a, b, weight = 0.5) {
  const channels = (h) => h.match(/[a-f\d]{2}/gi).map((v) => parseInt(v, 16));
  return (
    "#" +
    channels(a)
      .map((v, i) =>
        Math.round(v * (1 - weight) + channels(b)[i] * weight)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function inkOn(color) {
  return contrast("#181a18", color) > contrast("#ffffff", color)
    ? "#181a18"
    : "#ffffff";
}
export function pageTheme(p, page) {
  const colors=finalPalette(p), base=theme(p), settings=page.settings || {};
  const allowed=value=>colors.some(c=>c.hex.toLowerCase()===String(value).toLowerCase());
  const background=allowed(settings.background)?settings.background:allowed(page.background)?page.background:['cover','end'].includes(page.type)?base.accent:base.background;
  const manual=key=>allowed(settings[key])?settings[key]:settings[key]==='auto'?null:allowed(p.brandGuideline.theme[key])?p.brandGuideline.theme[key]:null;
  const text=manual('text') || paletteInk(p,background,colors.find(c=>c.role==='text')?.hex);
  return {...base,background,text,secondary:allowed(settings.secondary)?settings.secondary:base.secondary,
    muted:manual('muted') || paletteInk(p,background,colors.find(c=>c.role==='secondary-text')?.hex),
    accent:manual('accent') || base.accent,
    rule:paletteInk(p,background),surface:base.secondary,onAccent:paletteInk(p,base.accent),
  };
}
