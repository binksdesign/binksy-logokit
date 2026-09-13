import { FORMATS } from "./guideline-model.js";
import { finalPalette } from './guideline-config.js';
export function contrast(a, b) {
  const l = (h) => {
    const c = h
      .match(/[a-f\d]{2}/gi)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const x = l(a),
    y = l(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
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
  const colors = finalPalette(p);
  const allowed = value => colors.some(c => c.hex.toLowerCase() === String(value).toLowerCase());
  const foreground = bg => [...colors].sort((a,b) => contrast(b.hex,bg)-contrast(a.hex,bg))[0]?.hex || inkOn(bg);
  const settings = { ...page.settings };
  for (const key of ['background', 'secondary', 'text', 'muted', 'accent', 'rule']) if (settings[key] && !allowed(settings[key])) delete settings[key];
  const base = theme(p),
    background =
      (allowed(page.background) ? page.background : '') ||
      (["cover", "end"].includes(page.type) ? base.accent : base.background),
    text =
      page.background || ["cover", "end"].includes(page.type)
        ? foreground(background)
        : base.text;
  return {
    ...base,
    background,
    text,
    muted: base.muted,
    rule: base.text,
    surface: base.secondary,
    onAccent: foreground(base.accent),
    ...settings,
  };
}
