import '../src/style.css';
import '../src/tooltips.js';
import {project} from '../src/model.js';
import {importSVG} from '../src/svg.js';
import {prepareGuide} from '../src/guideline-config.js';
import {page,validateGuide} from '../src/guideline-model.js';
import {pageElements} from '../src/guideline-layout.js';
import {paginateMinimumPages} from '../src/guideline-minimum.js';
import {guidelineSVG,fittedText,textMetrics} from '../src/guideline-svg.js';
import {guidelinePDF,validateLayout} from '../src/guideline-export.js';
import {loadFonts} from '../src/guideline-fonts.js';
import {mountGuideline} from '../src/guideline-editor.js';
import {storeProjects} from '../src/project-storage.js';
const p=project();p.brand='CANVAS QA';p.mode='compose';
for(const key of ['icon','wordmark'])p.assets[key]=await importSVG(await(await fetch('./fixtures/'+key+'.svg')).text(),key);
p.grid=true;p.clear=true;
p.colors=[{id:'ink',name:'Encre',hex:'#171717'},{id:'paper',name:'Papier',hex:'#ffffff'},{id:'orange',name:'Orange',hex:'#ff5500'}];
const g=prepareGuide(p);g.setup.complete=true;g.enabled=true;g.accentTypography.enabled=true;
await loadFonts(g);
const bitmap=document.createElement('canvas');bitmap.width=400;bitmap.height=400;const ctx=bitmap.getContext('2d');ctx.fillStyle='#ff5500';ctx.beginPath();ctx.arc(200,200,195,0,2*Math.PI);ctx.fill();
g.resources.push({id:'decor',type:'image',data:bitmap.toDataURL(),width:400,height:400,name:'Décor synthétique'});
const imagePage=page('blank');imagePage.elements=[{id:'decor-image',type:'image',resource:'decor',x:-.15,y:.12,w:.6,h:.75,rotation:20,opacity:.6,z:-1},{id:'label',type:'text',text:'BINKSY',role:'title',x:.12,y:.3,w:.7,h:.15,size:40,fill:'#171717'}];
const hierarchy=page('hierarchy'),pairs=page('pairs');
g.pages=[imagePage,hierarchy,pairs];
const root=document.querySelector('#fixture'),out=document.querySelector('#results');
function draw(a){g.pages=[a];mountGuideline(root,p,fn=>{fn();draw(g.pages[0]);},()=>{},message=>out.textContent=message);}
for(const [id,a] of [['guide',imagePage],['hierarchy',hierarchy],['pairs',pairs]])document.querySelector('#'+id).onclick=()=>draw(a);
document.querySelector('#seed').onclick=async()=>{await storeProjects([p]);location.href='/';};
const assert=(ok,message)=>{if(!ok)throw Error(message);};
document.querySelector('#run').onclick=async()=>{
 out.replaceChildren();
 const test=async(name,fn)=>{const node=document.createElement('p');try{await fn();node.className='pass';node.textContent='PASS '+name;}catch(e){node.className='fail';node.textContent='FAIL '+name+' — '+e.message;}out.append(node);};
 await test('Décor : réouverture, ordre, transparence et rognage PDF',async()=>{
  g.pages=[imagePage];const restored=validateGuide(JSON.parse(JSON.stringify(g))).pages[0].elements[0];
  assert(restored.x===-.15 && restored.rotation===20 && restored.opacity===.6 && restored.z===-1,'Propriétés persistantes');
  assert(pageElements(p,imagePage)[0].id==='decor-image','Ordre derrière les éléments générés');
  validateLayout(p);assert(guidelineSVG(p,imagePage).includes('clip-path="url(#page-crop-'+imagePage.id+')"'),'Rognage export');
  const pdf=await guidelinePDF(p);assert(pdf.size>1000,'PDF réel');
  const a=document.createElement('a');a.href=URL.createObjectURL(pdf);a.download='decor-crop.pdf';a.textContent='PDF décor';out.append(a);
 });
 g.typography.title={...g.typography.title,size:150,pt:150};
 for(const format of ['16:9','landscape','portrait'])await test('Hiérarchie une page · '+format,async()=>{
  g.format=format;g.pages=[hierarchy];g.pages=paginateMinimumPages(p);assert(g.pages.length===1,'Pagination');
  const samples=pageElements(p,g.pages[0]).filter(e=>e.id.startsWith('type-sample-'));assert(samples.length===7,'Tous les rôles');
  for(const e of samples){const fit=fittedText(e,g);assert(fit.size>=8,'Lisibilité '+e.role);assert(textMetrics(fit,g).height<=e.h+.1,'Débordement '+e.role);}
  validateLayout(p);const pdf=await guidelinePDF(p);assert(pdf.size>1000,'PDF réel');
 });
 g.format='16:9';draw(imagePage);
};
draw(imagePage);
