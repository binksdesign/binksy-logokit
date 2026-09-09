// Serializable additive V3 settings. Legacy gradients keep their global behaviour.
export function gradientSettings(g) {
  const valid = (c) => /^#[a-f\d]{6}$/i.test(c || "");
  const stops = (Array.isArray(g.stops) ? g.stops : [])
    .filter((s) => valid(s.color) && Number.isFinite(s.offset))
    .slice(0, 32)
    .map((s) => ({
      color: s.color.toLowerCase(),
      offset: Math.max(0, Math.min(1, s.offset)),
    }))
    .sort((a, b) => a.offset - b.offset);
  return {
    mode: ["auto", "global", "shape"].includes(g.mode) ? g.mode : "global",
    stops:
      stops.length >= 2
        ? stops
        : [
            { offset: 0, color: g.from },
            { offset: 1, color: g.to },
          ],
    excludedRoles: Array.isArray(g.excludedRoles)
      ? g.excludedRoles.filter(
          (x) => typeof x === "string" && /^[\w-]+$/.test(x),
        )
      : [],
  };
}
export function gradientVector(box, angle = 0) {
  const radians = (angle * Math.PI) / 180,
    dx = Math.cos(radians),
    dy = Math.sin(radians);
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  const extent = (Math.abs(box.width * dx) + Math.abs(box.height * dy)) / 2;
  return {
    x1: cx - dx * extent,
    y1: cy - dy * extent,
    x2: cx + dx * extent,
    y2: cy + dy * extent,
  };
}
export function automaticGradientMode(asset) {
  // Keep the coordinate behaviour of imported per-shape gradients when present.
  return asset.hasGradient &&
    [...asset.svg.matchAll(/<(?:linearGradient|radialGradient)\b[^>]*>/g)].some(
      ([tag]) => !tag.includes('gradientUnits="userSpaceOnUse"'),
    )
    ? "shape"
    : "global";
}
