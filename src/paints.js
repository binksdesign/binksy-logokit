// Paint targets use document-order element indices, stable across .binksy imports.
export function hexColor(value) {
  if (/^#[\da-f]{6}$/i.test(value || "")) return value.toLowerCase();
  const m = (value || "").match(
    /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/,
  );
  return m
    ? "#" +
        m
          .slice(1)
          .map((n) => Math.round(+n).toString(16).padStart(2, "0"))
          .join("")
    : null;
}
export function detectRoles(root) {
  const groups = new Map();
  [root, ...root.querySelectorAll("*")].forEach((el, index) => {
    if (
      el.closest("clipPath,mask,pattern,filter") ||
      el.getAttribute("display") === "none"
    )
      return;
    const props =
      el.localName === "stop"
        ? ["stop-color"]
        : /^(path|rect|circle|ellipse|polygon|polyline|line|use)$/.test(
              el.localName,
            )
          ? ["fill", "stroke"]
          : [];
    for (const prop of props) {
      const paint = hexColor(el.getAttribute(prop));
      if (!paint) continue;
      if (!groups.has(paint))
        groups.set(paint, {
          id: "paint-" + paint.slice(1),
          name: paint.toUpperCase(),
          paint,
          locked: false,
          targets: [],
        });
      groups.get(paint).targets.push({ index, prop });
    }
  });
  return [...groups.values()];
}
export function restoreRoles(asset, saved) {
  if (!Array.isArray(saved)) return;
  const available = new Map(
    asset.roles.flatMap((r) =>
      r.targets.map((t) => [t.index + ":" + t.prop, t]),
    ),
  );
  const used = new Set(),
    roles = [];
  for (const r of saved) {
    if (!/^[\w-]+$/.test(r.id) || roles.some((x) => x.id === r.id)) continue;
    const targets = (r.targets || []).filter((t) => {
      const key = t.index + ":" + t.prop;
      if (!available.has(key) || used.has(key)) return false;
      used.add(key);
      return true;
    });
    if (targets.length)
      roles.push({
        id: r.id,
        name: String(r.name || r.id).slice(0, 100),
        paint: hexColor(r.paint) || "#000000",
        locked: r.locked === true,
        targets,
      });
  }
  for (const r of asset.roles) {
    const targets = r.targets.filter((t) => !used.has(t.index + ":" + t.prop));
    if (targets.length)
      roles.push({
        ...r,
        id: roles.some((x) => x.id === r.id) ? r.id + "-rest" : r.id,
        targets,
      });
  }
  asset.roles = roles;
}

// OKLab lightness changes at fixed hue. Reduce chroma only to fit the sRGB gamut.
export function shade(hex, delta) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((n) => parseInt(n, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = rgb;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
    m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
    s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = Math.min(
    0.98,
    Math.max(
      0.02,
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s + delta,
    ),
  );
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const convert = (f) => {
    const a = A * f,
      b = B * f,
      l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3,
      m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
      s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
  };
  let low = 0,
    high = 1;
  for (let n = 0; n < 24; n++) {
    const mid = (low + high) / 2;
    if (convert(mid).every((v) => v >= 0 && v <= 1)) low = mid;
    else high = mid;
  }
  return (
    "#" +
    convert(low)
      .map((v) =>
        Math.round(
          255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function gradientOptions(p) {
  return [...new Map((p.gradients || []).map(g => [g.id,g])).values()];
}
