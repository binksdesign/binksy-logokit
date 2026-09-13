import { catalog, CATEGORIES } from './catalog.js';

// Only real descriptors; never enumerate the unbounded Cartesian catalogue.
export function logoChoices(p, variant) {
  const choices = new Map();
  for (const category of CATEGORIES) {
    const c = catalog(p, variant, category);
    const count = c.size < 100n ? c.size : 100n;
    for (let i = 0n; i < count; i++) {
      const item = c.at(i);
      choices.set(item.color.id, item.color);
    }
  }
  for (const item of Object.values(p.selectedDescriptors || {}))
    if (item.variant === variant) choices.set(item.color.id, item.color);
  return [...choices.values()];
}
export function logoColor(p, variant, id) {
  return logoChoices(p, variant).find(c => c.id === id) || null;
}
