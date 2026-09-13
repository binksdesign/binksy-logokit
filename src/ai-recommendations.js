import { variantIds, variantName, clearMeasure, layout } from './model.js';
import { compositionSVG, svgImage } from './svg.js';

export async function visualMessage(text, svg) {
  const image = await svgImage(svg), canvas = document.createElement('canvas');
  const ratio = image.naturalWidth / image.naturalHeight || 1;
  canvas.width = ratio >= 1 ? 1200 : Math.max(1,Math.round(1200 * ratio));
  canvas.height = ratio >= 1 ? Math.max(1,Math.round(1200 / ratio)) : 1200;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#d8d8d8';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const url=canvas.toDataURL('image/png');canvas.width=canvas.height=1;
  return [{type:'text',text},{type:'image_url',image_url:{url}}];
}
export function recommendationContext(p,kind) {
  return {kind,brand:p.brand, palette:p.colors.map(c=>({...c,rgb:c.hex.slice(1).match(/../g).map(n=>parseInt(n,16))})),variants:variantIds(p).map(id=>({id,name:variantName(p,id),minimum:{print:p.compositions[id]?.minPrint,digital:p.compositions[id]?.minDigital},clearspace:clearMeasure(p,id),width:layout(p,id).width,height:layout(p,id).height})),activeVariant:p.active};
}
export async function recommendationMessage(p,kind) {
  return visualMessage(JSON.stringify(recommendationContext(p,kind)),compositionSVG(p,p.active));
}
export function recommendationProject(p,proposal,kind,variant) {
  if(!proposal || typeof proposal.message!=='string' || !Array.isArray(proposal.actions)||proposal.actions.length>100)throw Error('Proposition invalide.');
  const next=structuredClone(p);
  for(const a of proposal.actions){
    if(!a || a.type!==kind)throw Error('Action hors recommandation.');
    const n=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
    if(kind==='clearspace'){
      if(a.variant!==variant||!n(a.multiplier,.05,5)||Object.keys(a).some(k=>!['type','variant','multiplier'].includes(k)))throw Error('Zone de sécurité invalide.');
      next.compositions[variant].clearMultiplier=a.multiplier;
    } else if(kind==='minimum'){
      if(a.variant!==variant||!n(a.print,1,1000)||!n(a.digital,1,10000)||Object.keys(a).some(k=>!['type','variant','print','digital'].includes(k)))throw Error('Taille minimale invalide.');
      Object.assign(next.compositions[variant],{minPrint:a.print,minDigital:a.digital});
    } else {
      const c=next.colors.find(c=>c.id===a.id),field=kind==='colorNames'?'name':'role';
      if(!c||typeof a.value!=='string'||!a.value.trim()||a.value.length>100||Object.keys(a).some(k=>!['type','id','value'].includes(k)))throw Error('Couleur invalide.');
      c[field]=a.value.trim();
    }
  }
  return next;
}
export const recommendationInstructions = `Return a short proposal as {message,actions}. NEVER apply changes. Only the requested kind is allowed. Use actual IDs. For clearspace analyse the attached active logo and propose {type:'clearspace',variant:activeVariant,multiplier:number .05..5}. For minimum analyse fine details of the attached active logo and propose {type:'minimum',variant:activeVariant,print:mm,digital:px}. For colorNames propose {type:'colorNames',id:colorId,value:name}. For colorRoles propose {type:'colorRoles',id:colorId,value:role}. Do not alter HEX, other variants or other fields. Explain briefly; no raw JSON in the message.`;
