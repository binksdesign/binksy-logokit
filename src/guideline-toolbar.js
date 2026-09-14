import { pageElements } from "./guideline-layout.js";
import { t } from './i18n.js';
import { escape as esc } from './guideline-svg.js';
import { ROLES } from './guideline-model.js';
import { typeStyle, dimensions, pageTheme } from './guideline-theme.js';
import { logoChoices } from './guideline-logos.js';
import { variantIds, variantName } from './model.js';
import { finalPalette } from './guideline-config.js';
import { importResource } from './guideline-fonts.js';
const keys=['font','size','weight','leading','tracking','align','fill'];
export function mountContextToolbar(canvas,p,page,e,update,notice) {
  const bar=canvas.querySelector('.bg-context-toolbar');
  if(!bar)return;
  const g=p.brandGuideline;
  const own=()=>page.elements.find(a=>a.id===e?.id) || (page.styles[e.id] ||= {});
  const patch=values=>update(()=>Object.assign(own(),values));
  const select=(key,label,values,value)=>`<select data-context="${key}" aria-label="${esc(t(label))}" title="${esc(t(label))}">${values.map(([id,name])=>`<option value="${esc(id)}" ${String(id)===String(value)?'selected':''}>${esc(t(name))}</option>`).join('')}</select>`;
  const input=(key,label,value,min,max,step=1)=>`<input data-context="${key}" aria-label="${esc(t(label))}" title="${esc(t(label))}" type="number" min="${min}" max="${max}" step="${step}" value="${value}">`;
  const colors=finalPalette(p).map(c=>[c.hex,c.name]);
  let html='';
  if(!e) html=select('background','Fond de page',colors,pageTheme(p,page).background);
  else if(e.type==='text') {
    const fonts=g.resources.filter(r=>r.type==='font'),s=typeStyle(g,e.role);
    const local=page.elements.find(a=>a.id===e.id) || page.styles[e.id] || {},custom=keys.some(k=>local[k]!==undefined && local[k]!=='auto');
    html=select('role','Rôle typographique',[...ROLES,...(g.accentTypography?.enabled?['accent']:[])].map(r=>[r,r]),e.role)+
      select('font','Police',[['','Instrument Sans'],...fonts.map(f=>[f.id,`${f.family} · ${f.weight}`])],e.font || '')+
      select('weight','Graisse',[...new Set([e.weight || s.weight,...fonts.filter(f=>f.family===(fonts.find(f=>f.id===e.font)?.family || s.family)).map(f=>f.weight)])].map(w=>[w,String(w)]),e.weight || s.weight)+
      input('size','Taille',e.size,5,150,.25)+select('fill','Couleur',[['auto','Automatique'],...colors],local.fill || 'auto')+
      select('align','Alignement',[['left','Gauche'],['center','Centre'],['right','Droite']],e.align || 'left')+
      (custom?`<button type="button" data-context-reset title="${t('Personnalisé localement')}">${t('Réinitialiser au style')}</button>`:'');
  } else if(e.type==='logo') {
    html=select('variant','Variante',variantIds(p).map(v=>[v,variantName(p,v)]),e.variant)+select('colorId','Version colorimétrique',[['auto','Automatique'],...logoChoices(p,e.variant).map(c=>[c.id,c.name])],e.colorId);
    if(page.type==='logos')html+=`<button type="button" data-context-all title="${t('Appliquer à toutes les variantes de cette page')}" aria-label="${t('Appliquer à toutes les variantes de cette page')}">⇉</button>`;
  } else if(e.type==='image' || e.type==='placeholder') {
    html=`<label class="file-button">${t('Remplacer')}<input data-context-image type="file" accept="image/png,image/jpeg,image/webp" hidden></label>`+select('fit','Cadrage',[['contain','Ajuster'],['cover','Remplir']],e.fit || 'cover')+input('zoom','Zoom',e.zoom || 1,1,5,.05);
  } else html=select('fill','Couleur',colors,e.fill);
  bar.insertAdjacentHTML('afterbegin',`<div class="bg-context-primary">${html}</div>`);
  bar.onpointerdown=event=>event.stopPropagation();
  bar.querySelectorAll('[data-context]').forEach(el=>el.onchange=()=>{
    if(!el.validity.valid)return;
    const key=el.dataset.context,value=el.type==='number'?+el.value:el.value;
    if(key==='background'){update(()=>page.background=value);return;}
    if(key==='role'){update(()=>{const target=own();keys.forEach(k=>delete target[k]);target.role=value;});return;}
    if(key==='weight') {
      const family=g.resources.find(f=>f.id===e.font)?.family;
      const font=g.resources.find(f=>f.type==='font' && f.family===family && f.weight===+value);
      patch({weight:+value,...(font?{font:font.id}:{})});return;
    }
    if(key==='font'){patch({font:value,weight:g.resources.find(f=>f.id===value)?.weight || 400});return;}
    patch({[key]:value,...(key==='variant'?{colorId:'auto'}:{})});
  });
  bar.querySelector('[data-context-reset]')?.addEventListener('click',()=>update(()=>keys.forEach(k=>delete own()[k])));
  bar.querySelector('[data-context-all]')?.addEventListener('click',()=>update(()=>{
    const id=page.elements.find(a=>a.id===e.id)?.colorId || page.styles[e.id]?.colorId || e.colorId;
    const variants=page.variants.length?page.variants:p.enabled;
    if(id!=='auto' && variants.some(v=>!logoChoices(p,v).some(c=>c.id===id))){notice(t('Cette couleur n’est pas disponible pour toutes les variantes.'));return;}
    variants.forEach(v=>(page.logoColors ||= {})[v]=id);
    const ids = new Set(pageElements(p,page).filter(a=>a.type==='logo').map(a=>a.id));
    for(const id of ids) if(page.styles[id])delete page.styles[id].colorId;
    page.elements.filter(a=>a.type==='logo').forEach(a=>delete a.colorId);
  }));
  bar.querySelector('[data-context-image]')?.addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try {const resource=await importResource(file,g);update(()=>{if(!g.resources.some(r=>r.id===resource.id))g.resources.push(resource);Object.assign(own(),{resource:resource.id,fit:'cover',zoom:1,panX:.5,panY:.5});});}catch(error){notice(t(error.message));}
  });
  const {width,height}=dimensions(g);
  requestAnimationFrame(()=>{
    if(!bar.isConnected)return;
    const bounds=canvas.getBoundingClientRect();
    bar.style.left=Math.max(0,Math.min((e?.x || 0)/width*bounds.width,bounds.width-bar.offsetWidth))+'px';
    const y=(e?.y || 0)/height*bounds.height;
    bar.style.top=(y>=bar.offsetHeight+8?y-bar.offsetHeight-8:Math.min(bounds.height-bar.offsetHeight,y+(e?.h || 0)/height*bounds.height+8))+'px';
  });
}
