import { project, layout } from '../src/model.js';
import { importSVG, compositionSVG } from '../src/svg.js';
import { validate } from '../src/project.js';
import { rolePanel, bindRoles } from '../src/workshop.js';
import { editGradient } from '../src/gradient-editor.js';
import { prepareGuide, generateGuide } from '../src/guideline-config.js';
import { pageElements } from '../src/guideline-layout.js';
import { guidelineSVG } from '../src/guideline-svg.js';
import { guidelinePDF, validateLayout } from '../src/guideline-export.js';
import { loadFonts } from '../src/guideline-fonts.js';
import { clearspaceSVG } from '../src/clearspace.js';
import { recommendationProject, visualMessage } from '../src/ai-recommendations.js';
import { catalog } from '../src/catalog.js';
import { exportPlan } from '../src/export.js';
import '../src/style.css';
const out=document.querySelector('#results'),root=document.querySelector('#fixture');
const assert=(ok,msg='Assertion')=>{if(!ok)throw Error(msg)};
let fails=0;
const test=async(name,fn)=>{const li=document.createElement('li');try{await fn();li.className='pass';li.textContent='PASS '+name}catch(e){fails++;li.className='fail';li.textContent='FAIL '+name+' — '+e.stack}out.append(li)};
const p=project();p.brand='QA V6';
p.assets.icon=await importSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#000000" d="M0 0h20v100H0Z"/><path fill="#000000" d="M40 0h20v100H40Z"/><path fill="#000000" d="M80 0h20v100H80Z"/></svg>','3 shapes');
p.assets.wordmark=await importSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 60"><path fill="#000000" d="M0 0h300v60H0Z"/></svg>','Wordmark');
p.colors=[{id:'black',name:'Noir',hex:'#000000'},{id:'white',name:'Blanc',hex:'#ffffff'},{id:'blue',name:'Bleu Acier',hex:'#464c67'}];
p.gradients=[{id:'g-test',name:'Gradient test',from:'#000000',to:'#ffffff',stops:[{offset:0,color:'#000000'},{offset:.5,color:'#464c67'},{offset:1,color:'#ffffff'}]}];
const redraw=()=>{root.innerHTML=rolePanel(p);bindRoles(p,fn=>{fn();redraw()},root)};
await test('Three imported shapes can link, recolor, persist and unlink',async()=>{
 redraw();assert(root.querySelector('[data-merge-roles="icon"]'));
 root.querySelector('[data-merge-roles="icon"]').click();
 const role=p.assets.icon.roles[0],id=role.id;assert(role.logicalGroup&&id.startsWith('group-'));
 const picker=root.querySelector('[data-role-asset="icon"][data-role-field="paint"]');picker.value='#464c67';picker.dispatchEvent(new Event('change'));
 const restored=await validate(JSON.parse(JSON.stringify(p)));assert(restored.assets.icon.roles[0].id===id&&restored.assets.icon.roles[0].logicalGroup);
 for(let i=0n;i<catalog(p,'icon','mono').size;i++){const item=catalog(p,'icon','mono').at(i),svg=compositionSVG(p,'icon',item.color);assert(!svg.includes('undefined'));}
 root.querySelector('[data-split-role="icon:0"]').click();assert(p.assets.icon.roles.length===3&&p.assets.icon.roles.every(r=>!r.logicalGroup));
 const ids=p.assets.icon.roles.map(r=>r.id);assert(new Set(ids).size===3);
 root.querySelector('[data-merge-roles="icon"]').click();assert(p.assets.icon.roles.length===1);
});
await test('Three manually recolored roles expose linking only when three shapes match',async()=>{
 root.querySelector('[data-split-role="icon:0"]').click();
 p.assets.icon.roles.forEach((r,i)=>r.paint=['#000000','#ffffff','#464c67'][i]);redraw();assert(!root.querySelector('[data-merge-roles="icon"]'));
 for(const r of p.assets.icon.roles)r.paint='#464c67';redraw();assert(root.querySelector('[data-merge-roles="icon"]'));root.querySelector('[data-merge-roles="icon"]').click();
});
await test('Additional dimension export targets preserve per-variant framing after .binksy',async()=>{
 p.exports.customFormats=[{id:'custom-test',name:'Profil Discord',width:1000,height:1000}];p.exports.rasterFormats=['web-3000','custom-test'];p.exports.variantFraming={'custom-test':{horizontal:.65,icon:.2}};
 const q=await validate(JSON.parse(JSON.stringify(p)));assert(q.exports.variantFraming['custom-test'].horizontal===.65);
 for(const [variant,scale] of [['horizontal',.65],['icon',.2]]) {const item={...catalog(q,variant,'original').at(0),background:{hex:'#ffffff',name:'Blanc'}};const jobs=exportPlan(q,[item]);assert(jobs.some(j=>j.target.id==='custom-test'&&j.target.scale===scale));}
});
prepareGuide(p);generateGuide(p);
for(const [v,mm,px] of [['horizontal',25,120],['vertical',20,100],['icon',8,24],['wordmark',18,90]])Object.assign(p.compositions[v],{minPrint:mm,minDigital:px});
await loadFonts(p.brandGuideline);
await test('Shared clearspace graphics have no embedded text',()=>{const s=clearspaceSVG(p,'horizontal','dark',{graphicOnly:true,color:{hex:'#464c67'}});assert(!s.includes('<text'));assert(s.includes('stroke-opacity=".35"'));});
await test('Guide minimum sizes and PDF retain physical source dimensions',async()=>{
 const g=p.brandGuideline;g.pages=g.pages.filter(a=>a.type==='minimum');
 for(const a of g.pages){for(const e of pageElements(p,a).filter(e=>e.type==='logo')){const mm=p.compositions[e.variant].minPrint;if(e.id.includes('-print-'))assert(Math.abs(e.w-mm*72/25.4)<.001);}}
 validateLayout(p);const pdf=await guidelinePDF(p);assert(pdf.size>1000);
 const link=document.createElement('a');link.href=URL.createObjectURL(pdf);link.download='minimum-v6.pdf';link.textContent='Télécharger le PDF des tailles minimales';out.after(link);
 document.querySelector('#visuals').innerHTML=g.pages.map(a=>guidelineSVG(p,a)).join('');
});
await test('Recommendations are targeted and include a real PNG image',async()=>{
 const before=JSON.stringify(p),next=recommendationProject(p,{message:'Nom',actions:[{type:'colorNames',id:'blue',value:'Acier'}]},'colorNames','horizontal');assert(next.colors[2].name==='Acier');assert(JSON.stringify(p)===before);
 let rejected=false;try{recommendationProject(p,{message:'Bad',actions:[{type:'minimum',variant:'icon',print:10,digital:32}]},'minimum','horizontal')}catch{rejected=true}assert(rejected);
 const parts=await visualMessage('Logo',compositionSVG(p,'horizontal'));assert(parts[1].image_url.url.startsWith('data:image/png;base64,'));
});
document.querySelector('#gradient').onclick=()=>editGradient(p,{variant:'horizontal',color:{id:'g-test',gradient:p.gradients[0]}},fn=>fn());
document.title=`${fails?'FAIL':'PASS'} V6`;
