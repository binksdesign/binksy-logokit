import { pageElements } from './guideline-layout.js';
import { finalPalette } from './guideline-config.js';
import { logoChoices } from './guideline-logos.js';
import { variantIds } from './model.js';
import { FORMATS, ROLES, MISUSES, uid } from './guideline-model.js';

const object = v => v && typeof v === 'object' && !Array.isArray(v);
const num = (v,min,max) => Number.isFinite(v) && v>=min && v<=max;
const str = (v,n=6000) => typeof v==='string' && v.length<=n;
const bool = v => typeof v==='boolean';
const keys = (o,list) => object(o) && Object.keys(o).every(k=>list.includes(k));
export const GUIDE_ACTIONS = ['updatePageSettings','updateGlobalSettings','updatePageElement','updateLogoOccurrence','updateLogoOccurrences','updateTypography','updateColorAssociation','togglePage','addPageElement','removePageElement','updateGuideExports'];
export function guideScope(p, scope) {
  if (!scope || !['currentPage','document'].includes(scope.scope)) throw Error('Portée IA invalide.');
  if (scope.scope==='currentPage' && !p.brandGuideline.pages.some(a=>a.id===scope.pageId)) throw Error('La page demandée n’existe pas.');
  return structuredClone(scope);
}
export function assertScope(a,p,scope) {
  guideScope(p,scope);
  const forbidden = ['brand','minimum','formats','recommendation','selectVariant','variantSettings','finalColor','addColor','removeColor'];
  if (forbidden.includes(a.type)) throw Error('Cette action sort du Brand Guideline.');
  if(scope.scope==='document') return;
  if(a.type==='updateLogoOccurrences' && Array.isArray(a.occurrences) && a.occurrences.every(e=>e.pageId===scope.pageId)) return;
  const id=a.pageId || (['pageText','misuses','togglePage'].includes(a.type) ? a.id : null);
  if(id!==scope.pageId) throw Error('Cette action dépasse la portée Page actuelle.');
  if(a.type==='removePage') throw Error('La suppression de page nécessite la portée Tout le document.');
}
function validators(p) {
  const colors=finalPalette(p), g=p.brandGuideline;
  const color=v=>colors.some(c=>c.hex.toLowerCase()===String(v).toLowerCase());
  const variant=v=>variantIds(p).includes(v);
  const resource=v=>g.resources.some(r=>r.id===v && r.type==='image');
  return {color,variant,resource,
    settings:{guides:bool,explanation:bool,hex:bool,rgb:bool,cmyk:bool,pantone:bool,roles:bool,text:color,muted:color,rule:color,accent:color},
    element:{text:str,fill:color,variant,role:v=>ROLES.includes(v),size:v=>num(v,5,150),x:v=>num(v,0,1),y:v=>num(v,0,1),w:v=>num(v,.001,1),h:v=>num(v,.001,1),hidden:bool,resource,fit:v=>['cover','contain'].includes(v),zoom:v=>num(v,1,5),panX:v=>num(v,0,1),panY:v=>num(v,0,1)},
    global:{background:color,text:color,muted:color,rule:color,accent:color,secondary:color,margin:v=>num(v,12,80),spacing:v=>num(v,0,100),grid:v=>num(v,0,100),numbers:bool,headers:bool,footers:bool,brandName:bool,guides:bool,density:v=>['comfortable','compact'].includes(v)}
  };
}
function patch(values, rules) {
  if(!object(values) || !Object.keys(values).length || !Object.entries(values).every(([k,v])=>Object.hasOwn(rules,k)&&rules[k](v))) throw Error('Réglage IA invalide.');
}
export function applyGuideAction(p,a,scope) {
  assertScope(a,p,scope);
  if(!keys(a,['type','pageId','id','values','elementId','variant','colorId','occurrences','role','foreground','background','decision','enabled','elementType'])) throw Error('Action IA invalide.');
  const g=p.brandGuideline, page=g.pages.find(q=>q.id===(a.pageId||a.id)), v=validators(p);
  if(a.type==='addPageElement') {
    if(!page || !['text','image','logo','rect'].includes(a.elementType) || page.elements.length>=150)throw Error('Élément IA invalide.');
    patch(a.values,v.element);
    if(a.elementType==='image' && !v.resource(a.values.resource))throw Error('Image existante requise.');
    if(a.elementType==='logo' && !v.variant(a.values.variant))throw Error('Variante existante requise.');
    page.elements.push({id:uid(),type:a.elementType,x:.15,y:.25,w:.45,h:.25,size:12,role:'body',fill:finalPalette(p)[0]?.hex||'#000000',...a.values});
  } else if(a.type==='removePageElement') {
    if(!page || !pageElements(p,page).some(e=>e.id===a.elementId))throw Error('Cet élément n’existe pas sur la page.');
    if(page.elements.some(e=>e.id===a.elementId))page.elements=page.elements.filter(e=>e.id!==a.elementId);
    else (page.styles[a.elementId] ||= {}).hidden=true;
  } else if(a.type==='updateGuideExports') {
    patch(a.values,{pdf:bool,svg:bool,text:x=>['text','paths'].includes(x)});
    Object.assign(g.exports,a.values);
  } else if(a.type==='updateGlobalSettings') {
    patch(a.values,{...v.global,format:x=>Object.hasOwn(FORMATS,x)});
    const {format,...rest}=a.values;
    if(format)g.format=format;
    Object.assign(g.theme,rest);
  } else if(a.type==='updatePageSettings') {
    if(!page)throw Error('La page demandée n’existe pas.');
    patch(a.values,{
      title:x=>str(x,300),body:str,background:v.color,
      layout:x=>['minimal','typographic','image','dominant','full','two','three','mixed','mosaic','hero','editorial','statement','columns','manifesto'].includes(x),
      variants:x=>Array.isArray(x)&&x.length>0&&x.every(v.variant),
      misuses:x=>Array.isArray(x)&&x.every(k=>Object.hasOwn(MISUSES,k)),
      ...v.settings,
    });
    for(const [k,value] of Object.entries(a.values)) {
      if(Object.hasOwn(v.settings,k)) (page.settings ||= {})[k]=value;
      else page[k]=value;
    }
  } else if(a.type==='updatePageElement') {
    const el=page && pageElements(p,page).find(e=>e.id===a.elementId);
    const hidden=page?.styles[a.elementId]?.hidden;
    if(!el && !hidden)throw Error('Cet élément n’existe pas sur la page.');
    patch(a.values,v.element);
    if (el?.physicalSize && ['w','h','variant'].some(k=>k in a.values)) throw Error('La taille minimale reste liée à la source LogoKit.');
    Object.assign((page.styles[a.elementId] ||= {}),a.values);
  } else if(['updateLogoOccurrence','updateLogoOccurrences'].includes(a.type)) {
    const occurrences=a.type==='updateLogoOccurrence'?[a]:a.occurrences;
    if(!Array.isArray(occurrences)||!occurrences.length||occurrences.length>300)throw Error('Occurrences invalides.');
    for(const entry of occurrences) {
      if(!keys(entry,['type','pageId','elementId','variant','colorId']))throw Error('Occurrence invalide.');
      const pg=g.pages.find(q=>q.id===entry.pageId);
      if(scope.scope==='currentPage'&&entry.pageId!==scope.pageId)throw Error('Cette action dépasse la portée Page actuelle.');
      const el=pg&&pageElements(p,pg).find(e=>e.id===entry.elementId&&e.type==='logo');
      const variant=entry.variant||el?.variant;
      if(!el || !v.variant(variant) || !logoChoices(p,variant).some(c=>c.id===entry.colorId))throw Error('Variante ou couleur de logo inexistante.');
      if(el.physicalSize && variant!==el.variant)throw Error('La taille minimale reste liée à sa variante source.');
      Object.assign((pg.styles[el.id] ||= {}),{variant,colorId:entry.colorId});
    }
  } else if(a.type==='updateTypography') {
    if(!ROLES.includes(a.role))throw Error('Rôle typographique invalide.');
    patch(a.values,{font:x=>x===''||g.resources.some(r=>r.id===x&&r.type==='font'),size:x=>num(x,5,150),weight:x=>num(x,100,900),leading:x=>num(x,.8,3),tracking:x=>num(x,-3,20)});
    const s=(g.typography[a.role] ||= {}); Object.assign(s,a.values);
    if('font' in a.values) {const f=g.resources.find(r=>r.id===s.font);s.family=f?.family||'Instrument Sans';s.weight=f?.weight||400;}
    if(s.size){s.pt=s.size;s.px=s.size*4/3;}
  } else if(a.type==='updateColorAssociation') {
    if(![a.foreground,a.background].every(id=>finalPalette(p).some(c=>c.id===id))||!['recommended','avoid','hide'].includes(a.decision))throw Error('Association invalide.');
    g.pairs[a.foreground+':'+a.background]={allowed:a.decision==='recommended',hidden:a.decision==='hide',manual:true,source:'ai'};
  } else if(a.type==='togglePage') {
    if(!page||!bool(a.enabled))throw Error('Page invalide.');
    page.disabled=!a.enabled;
  } else throw Error('Action IA invalide.');
}
export const guideActionInstructions = ` The chat edits ONLY brandGuideline. scope is enforced by application. currentPage may ONLY target context.pageId, even during refinement. document permits all guide pages. Never change source assets, project palette or source compositions. Use actual IDs. Schemas:
addPageElement {type,pageId,elementType:text|image|logo|rect,values:{text?,fill?,variant?,resource?,role?,size?,x?,y?,w?,h?,fit?,zoom?,panX?,panY?}}; removePageElement {type,pageId,elementId}; updateGuideExports {type,values:{pdf?,svg?,text:text|paths}};
updatePageSettings {type,pageId,values:{title?,body?,background?,layout?,variants?,misuses?,guides?,explanation?,hex?,rgb?,cmyk?,pantone?,roles?,text?,muted?,rule?,accent?}};
updateGlobalSettings {type,values:{format?,background?,secondary?,text?,muted?,rule?,accent?,margin?,spacing?,grid?,numbers?,headers?,footers?,brandName?,guides?,density?}};
updatePageElement {type,pageId,elementId,values:{text?,fill?,variant?,role?,size?,x?,y?,w?,h?,hidden?,resource?,fit?,zoom?,panX?,panY?}} (geometry normalized 0..1; resources must already exist);
updateLogoOccurrence {type,pageId,elementId,variant?,colorId}; updateLogoOccurrences {type,occurrences:[{pageId,elementId,variant?,colorId}]};
updateTypography {type,role,values:{font?,size?,weight?,leading?,tracking?}};
updateColorAssociation {type,foreground,background,decision:recommended|avoid|hide}; togglePage {type,pageId,enabled}.
Never invent colours or logo descriptors. A proposal is one transaction, never applied before user clicks Apply. Return a short human message, including when no action is possible.`;
