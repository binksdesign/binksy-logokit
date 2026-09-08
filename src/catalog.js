import { layout, colors, jpegPairs } from "./model.js";
import { gradientOptions } from "./paints.js";

export function rolesFor(p, variant) {
  const roles = new Map();
  for (const part of layout(p, variant).parts)
    for (const role of part.asset.roles || []) {
      if (!roles.has(role.id)) roles.set(role.id, { ...role, sources: [] });
      roles.get(role.id).locked &&= role.locked;
      roles.get(role.id).sources.push(part.key);
    }
  return [...roles.values()];
}
export function catalog(p, variant, category) {
  const parts = layout(p, variant).parts;
  if (
    !parts.length ||
    (p.mode !== "ready" &&
      ["horizontal", "vertical"].includes(variant) &&
      parts.length !== 2)
  )
    return { size: 0n, at: () => null };
  const roles = rolesFor(p, variant).filter((r) => !r.locked);
  const palette = [
    ...new Map(
      colors(p)
        .filter((c) => c.hex)
        .map((c) => [c.hex.toLowerCase(), c]),
    ).values(),
  ];
  const gradients = gradientOptions(p);
  const n = BigInt(palette.length),
    r = roles.length;
  const originalRank =
    r &&
    roles.every((role) =>
      palette.some((c) => c.hex.toLowerCase() === role.paint),
    )
      ? roles.reduce(
          (v, role) =>
            v * n +
            BigInt(
              palette.findIndex((c) => c.hex.toLowerCase() === role.paint),
            ),
          0n,
        )
      : -1n;
  const repeated = r ? (n ** BigInt(r) - 1n) / (n - 1n) : 0n;
  const skipped = r > 1 ? palette.map((_, i) => BigInt(i) * repeated) : [];
  if (originalRank >= 0n && !skipped.includes(originalRank))
    skipped.push(originalRank);
  skipped.sort((a, b) => (a < b ? -1 : 1));
  const mono = palette.filter(
    (c) =>
      !roles.length ||
      !roles.every((role) => role.paint === c.hex.toLowerCase()),
  );
  const size =
    category === "original"
      ? 1n
      : category === "mono"
        ? BigInt(roles.length ? mono.length : 0)
        : category === "gradient"
          ? BigInt(roles.length ? gradients.length : 0)
          : r > 1
            ? n ** BigInt(r) - BigInt(skipped.length)
            : 0n;
  return {
    size,
    at(index) {
      index = BigInt(index);
      if (index < 0n || index >= size) return null;
      let color;
      if (category === "original")
        color = { id: "original", name: "Original", hex: null };
      if (category === "mono") color = { ...mono[Number(index)] };
      if (category === "gradient") {
        const g = gradients[Number(index)];
        color = { id: g.id, name: g.name, hex: null, gradient: g };
      }
      if (category === "multi") {
        let rank = index;
        for (const skip of skipped) if (rank >= skip) rank++;
        const choices = [];
        for (let i = r - 1; i >= 0; i--) {
          choices[i] = palette[Number(rank % n)];
          rank /= n;
        }
        const mapping = Object.fromEntries(
          roles.map((role, i) => [role.id, choices[i].hex]),
        );
        color = {
          id:
            "m-" +
            roles
              .map((role, i) => role.id + "_" + choices[i].hex.slice(1))
              .join("-"),
          name: choices.map((c) => c.name).join(" + "),
          hex: null,
          mapping,
        };
      }
      return {
        id: variant + ":" + color.id,
        variant,
        color,
        category,
        recommended: category === "original" || category === "mono",
      };
    },
  };
}
export const CATEGORIES = ["original", "mono", "multi", "gradient"];
export function selectedItem(p, item) {
  const s = p.colorSelection || {},
    rule =
      s[item.variant + ":" + item.category] ??
      (item.category === "original" || item.category === "mono");
  return s[item.id] ?? (p.excluded.includes(item.id) ? false : rule);
}
export function selectedCount(p, variant, category) {
  const c = catalog(p, variant, category),
    s = p.colorSelection || {},
    rule =
      s[variant + ":" + category] ?? ["original", "mono"].includes(category);
  let count = rule ? c.size : 0n;
  // Only persisted single-item choices are counted; source changes clear these choices in the UI.
  for (const [id, value] of Object.entries(s))
    if (
      id.startsWith(variant + ":") &&
      id !== variant + ":" + category &&
      !CATEGORIES.some((k) => id === variant + ":" + k)
    ) {
      const kind = id.includes(":g-")
        ? "gradient"
        : id.includes(":m-")
          ? "multi"
          : id.endsWith(":original")
            ? "original"
            : "mono";
      if (kind === category && value !== rule) count += value ? 1n : -1n;
    }
  return count < 0n ? 0n : count;
}
export function setCategory(p, variants, categories, mode) {
  p.colorSelection ||= {};
  for (const v of variants)
    for (const cat of categories) {
      for (const id of Object.keys(p.colorSelection)) {
        if (
          !id.startsWith(v + ":") ||
          CATEGORIES.some((k) => id === v + ":" + k)
        )
          continue;
        const kind = id.includes(":g-")
          ? "gradient"
          : id.includes(":m-")
            ? "multi"
            : id.endsWith(":original")
              ? "original"
              : "mono";
        if (kind === cat) delete p.colorSelection[id];
      }
      p.colorSelection[v + ":" + cat] =
        mode === "all" ||
        (mode === "recommended" && ["original", "mono"].includes(cat));
    }
}
export function selectedItems(p, limit = 500) {
  const result = [];
  for (const variant of p.enabled)
    for (const category of CATEGORIES) {
      const c = catalog(p, variant, category),
        count = selectedCount(p, variant, category);
      if (count > BigInt(limit - result.length))
        throw Error(
          "Plus de 500 déclinaisons sélectionnées. Exportez en plusieurs lots.",
        );
      if (!count) continue;
      const rule =
        p.colorSelection?.[variant + ":" + category] ??
        ["original", "mono"].includes(category);
      if (!rule && c.size > 1000n) {
        // Resolve sparse selection using stored descriptors; never scan the Cartesian product.
        for (const item of Object.values(p.selectedDescriptors || {}))
          if (
            item.variant === variant &&
            item.category === category &&
            selectedItem(p, item)
          )
            result.push(item);
      } else
        for (let i = 0n; i < c.size; i++) {
          const item = c.at(i);
          if (selectedItem(p, item)) result.push(item);
        }
    }
  return result;
}
export function deliveries(p, items) {
  return items.flatMap((item) => [
    ...(p.exports.formats.some((f) => f !== "jpeg") ? [item] : []),
    ...(p.exports.formats.includes("jpeg")
      ? jpegPairs(p, item).filter(
          (x) => x.enabled && !p.excluded.includes(x.id),
        )
      : []),
  ]);
}
