import { FORMATS } from "./guideline-model.js";
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
    colors = p.colors;
  const role = (name, fallback) =>
    colors.find((c) => g.colorRoles[c.id]?.role === name)?.hex || fallback;
  const background = role("background", "#ffffff");
  const ink = [...colors.map((c) => c.hex), "#171717", "#ffffff"].sort(
    (a, b) => contrast(b, background) - contrast(a, background),
  )[0];
  return {
    background,
    secondary: role("secondary-background", "#f2f2f0"),
    text: role("text", ink),
    muted: role("secondary-text", ink),
    accent: role("accent", colors[0]?.hex || ink),
    margin: 36,
    spacing: 16,
    grid: 8,
    numbers: true,
    ...g.theme,
  };
}
export function typeStyle(g, role = "body") {
  const portrait = g.format === "portrait",
    a4 = g.format !== "16:9";
  const sizes = {
    title: a4 ? 24 : 28,
    subtitle: a4 ? 17 : 20,
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
  const base = theme(p),
    background =
      page.background ||
      (["cover", "end"].includes(page.type) ? base.accent : base.background),
    text =
      page.background || ["cover", "end"].includes(page.type)
        ? inkOn(background)
        : base.text;
  return {
    ...base,
    background,
    text,
    muted: mixColor(text, background, 0.42),
    rule: mixColor(text, background, 0.82),
    surface: mixColor(base.background, base.text, 0.035),
    onAccent: inkOn(base.accent),
  };
}
