import { contrast } from './model.js';
// Shared status for the canvas, controls and exports. Legacy hidden pairs remain visible.
export function pairState(g,fg,bg) {
  const decision=g.pairs[fg.id+':'+bg.id];
  if(['recommended','allowed','avoid'].includes(decision?.state))return decision.state;
  if(decision?.manual)return decision.allowed?'recommended':'avoid';
  const ratio=contrast(fg.hex,bg.hex);
  return ratio>=4.5?'recommended':ratio>=3?'allowed':'avoid';
}
