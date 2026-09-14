export const WEB_SIZES = [1000, 2000, 3000, 4000, 5000].map((n) => ({
  id: `web-${n}`,
  name: `${n} × ${n}`,
  width: n,
  height: n,
  kind: "web",
}));
export const USE_FORMATS = [
  ["profile", "Photo de profil Instagram", 1080, 1080],
  ["story", "Story Instagram", 1080, 1920],
  ["banner", "Bannière X / Twitter", 1500, 500],
  ["favicon", "Favicon", 32, 32],
  ["signature", "Signature mail", 600, 200],
].map(([id, name, width, height]) => ({
  id,
  name,
  width,
  height,
  kind: "use",
}));
export function customFormats(e) {
  const seen = new Set([...WEB_SIZES, ...USE_FORMATS].map((f) => f.id));
  seen.add("legacy-size");
  return (Array.isArray(e.customFormats) ? e.customFormats : [])
    .filter((f) => {
      if (
        !f ||
        typeof f.name !== "string" ||
        !f.name.trim() ||
        !/^[\w-]+$/.test(f.id) ||
        seen.has(f.id) ||
        ![f.width, f.height].every(
          (n) => Number.isInteger(n) && n >= 16 && n <= 8192,
        )
      )
        return false;
      seen.add(f.id);
      return true;
    })
    .map((f) => ({
      id: f.id,
      name: f.name.trim().slice(0, 100),
      width: f.width,
      height: f.height,
      kind: "use",
      background: ["transparent", "color"].includes(f.background) ? f.background : undefined,
      raster: ["png", "jpeg", "both"].includes(f.raster) ? f.raster : undefined,
    }));
}
export function normalizeFormats(e) {
  const custom = customFormats(e);
  const available = [...WEB_SIZES, ...USE_FORMATS, ...custom];
  if (
    [e.width, e.height].every(
      (n) => Number.isInteger(n) && n >= 16 && n <= 8192,
    ) &&
    !available.some(
      (f) => f.kind === "web" && f.width === e.width && f.height === e.height,
    )
  )
    available.push({
      id: "legacy-size",
      name: `${e.width} × ${e.height}`,
      width: e.width,
      height: e.height,
      kind: "web",
    });
  const ids = e.rasterFormats ?? [
    available.find(
      (f) => f.kind === "web" && f.width === e.width && f.height === e.height,
    )?.id || "web-3000",
  ];
  return { available, selected: available.filter((f) => ids.includes(f.id)) };
}
export function framing(e, id, variant) {
  return Math.max(0.05, Math.min(1, Number(e.variantFraming?.[id]?.[variant] ?? e.framing?.[id]) || 0.8));
}
export function rasterTargets(e, variant, format) {
  return normalizeFormats(e).selected.filter(f => !format || (!f.background && !f.raster) || f.raster === "both" || format === (f.raster || (f.background === "transparent" ? "png" : "jpeg"))).flatMap((f) =>
    f.kind === "use"
      ? [{ ...f, destination: "CAS D’USAGE", dpi: 72, scale: framing(e, f.id, variant) }]
      : (e.printBitmaps === undefined ? (e.destinations || ["WEB", "PRINT"]) : e.printBitmaps ? ["WEB", "PRINT"] : ["WEB"]).map((destination) => ({
          ...f,
          destination,
          dpi: destination === "PRINT" ? 300 : 72,
          scale: framing(e, f.id, variant),
        })),
  );
}
export function bitmapRect(width, height, lw, lh, occupancy = 1) {
  const s = Math.min(width / lw, height / lh) * occupancy,
    w = lw * s,
    h = lh * s;
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h };
}
export function paletteText(colors) {
  return colors
    .map((c) => {
      const rgb = c.hex
          .slice(1)
          .match(/../g)
          .map((v) => parseInt(v, 16)),
        k = 1 - Math.max(...rgb) / 255,
        cmy = rgb.map((v) =>
          k === 1 ? 0 : Math.round(((1 - v / 255 - k) / (1 - k)) * 100),
        );
      return `${c.name || c.hex}\nHEX : ${c.hex.toUpperCase()}\nRVB / RGB : ${rgb.join(" / ")}\nCMJN / CMYK : ${[...cmy, Math.round(k * 100)].join(" / ")} %`;
    })
    .join("\n\n");
}
