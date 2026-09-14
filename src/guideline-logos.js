import { layout, contrast, originalPaints } from './model.js';
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

export function bestLogoColor(p,variant,background) {
  const choices=logoChoices(p,variant);
  const score=c=>{
    const paints=layout(p,variant).parts.flatMap(part=>(part.asset.roles||[]).map(r=>r.locked?r.paint:c.partColors?.[part.key]||c.mapping?.[r.id]||c.hex||r.paint));
    if(c.gradient)paints.push(...(c.gradient.stops?.map(s=>s.color)||[c.gradient.from,c.gradient.to]));
    if(!paints.length)paints.push(...originalPaints(p,variant));
    const valid=paints.filter(h=>/^#[\da-f]{6}$/i.test(h));
    return valid.length?valid.reduce((min,h)=>Math.min(min,contrast(h,background)),Infinity):0;
  };
  return choices.map(c=>({c,score:score(c)})).sort((a,b)=>b.score-a.score)[0]?.c.id || 'original';
}

export function commonLogoColor(p, variants, background) {
  if (!variants.length) return null;
  const choices = variants.map(v=>logoChoices(p,v));
  return choices[0].filter(c=>c.hex && !c.gradient && choices.every(list=>list.some(other=>other.id===c.id && other.hex===c.hex)))
    .sort((a,b)=>contrast(b.hex,background)-contrast(a.hex,background))[0]?.id || null;
}
