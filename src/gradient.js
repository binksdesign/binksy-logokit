// Serializable additive V3 settings. Legacy gradients keep their global behaviour.
export function gradientSettings(g) {
  const valid = (c) => /^#[a-f\d]{6}$/i.test(c || "");
  const stops = (Array.isArray(g.stops) ? g.stops : [])
    .filter((s) => valid(s.color) && Number.isFinite(s.offset))
    .map((s) => ({
      color: s.color.toLowerCase(),
      offset: Math.max(0, Math.min(1, s.offset)),
    }))
    .sort((a, b) => a.offset - b.offset);
  return {
    paint: ["fill", "stroke", "both"].includes(g.paint) ? g.paint : "both",
    strokeOpacity: Number.isFinite(g.strokeOpacity)
      ? Math.max(0, Math.min(1, g.strokeOpacity))
      : 1,
    excludedTargets: Array.isArray(g.excludedTargets)
      ? g.excludedTargets.filter(
          (x) => typeof x === "string" && /^[\w:-]+$/.test(x),
        )
      : [],
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

// p.gradients is authoritative. Descriptor-only legacy definitions are promoted
// once on load; all references with the same ID then share that definition.
export function synchronizeGradients(p) {
  const definitions = new Map((p.gradients || []).map((g) => [g.id, g]));
  for (const item of Object.values(p.selectedDescriptors || {})) {
    const g = item.color?.gradient;
    if (!g?.id) continue;
    if (!definitions.has(g.id)) definitions.set(g.id, g);
    item.color.gradient = definitions.get(g.id);
  }
  p.gradients = [...definitions.values()];
}
export function updateGradient(p, gradient) {
  const g = { ...structuredClone(gradient), ...gradientSettings(gradient) };
  g.from = g.stops[0].color;
  g.to = g.stops.at(-1).color;
  p.gradients ||= [];
  const index = p.gradients.findIndex((entry) => entry.id === g.id);
  if (index < 0) p.gradients.push(g);
  else p.gradients[index] = g;
  synchronizeGradients(p);
}
