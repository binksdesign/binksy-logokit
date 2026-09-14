import '../src/style.css';
import {project,layout} from '../src/model.js';import {importSVG} from '../src/svg.js';
import {validate} from '../src/project.js';import {page} from '../src/guideline-model.js';
import {formatControls,bindFormats} from '../src/format-editor.js';
import {prepareGuide,generateGuide} from '../src/guideline-config.js';
import {mountGuideWizard} from '../src/guideline-wizard.js';
import {pageElements} from '../src/guideline-layout.js';import {guidelineSVG} from '../src/guideline-svg.js';
import {guidelinePDF} from '../src/guideline-export.js';import {importResource,loadFonts} from '../src/guideline-fonts.js';
import {catalog} from '../src/catalog.js';import {exportPlan,buildFiles,zipFiles} from '../src/export.js';
import {unzipSync} from 'fflate';import {setLanguage} from '../src/i18n.js';
const out=document.querySelector('#results'),root=document.querySelector('#fixture');
const assert=(v,message='Assertion')=>{if(!v)throw Error(message)};
const test=async(name,fn)=>{const li=document.createElement('li');try{await fn();li.className='pass';li.textContent='PASS '+name;}catch(e){li.className='fail';li.textContent='FAIL '+name+' — '+e.stack;}out.append(li);};
const link=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.textContent=name;document.querySelector('#links').append(a,document.createElement('br'));};
document.querySelector('#run').onclick=async()=>{
 out.replaceChildren();const p=project();p.brand='QA LOGOKIT';
 p.assets.icon=await importSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path fill="#181818" d="M0 0h80v80H0Z"/></svg>','Icon');
 p.assets.wordmark=await importSVG('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 50"><path fill="#181818" d="M0 0h300v50H0Z"/></svg>','Wordmark');
 p.enabled=['horizontal','icon'];p.colors=[{id:'dark',name:'Encre',hex:'#181818'},{id:'light',name:'Craie',hex:'#efeee8'}];
 p.exports.rasterFormats=['web-1000','story','custom-discord'];p.exports.customFormats=[{id:'custom-discord',name:'Profil Discord',width:128,height:128}];p.exports.formats=['svg','png','pdf','jpeg'];p.exports.clearspace=false;
 const draw=()=>{root.innerHTML=formatControls(p);bindFormats(root,p,fn=>{fn();draw()});};draw();
 await test('Standard dimensions, black previews, independent variants, shared colours and .binksy',async()=>{
  assert(root.textContent.includes('1000 × 1000 px'));assert(!root.textContent.includes('1000 × 1000 ·'));
  const a=root.querySelector('[data-use-framing="horizontal"]');const image=root.querySelector('[data-framing-preview="horizontal"]>span');const before=image.style.width;
  a.value='65';a.dispatchEvent(new Event('input'));assert(image.style.width!==before);a.dispatchEvent(new Event('change'));
  const icon=root.querySelector('[data-use-framing="icon"]');icon.value='25';icon.dispatchEvent(new Event('input'));icon.dispatchEvent(new Event('change'));
  const q=await validate(JSON.parse(JSON.stringify(p)));assert(q.exports.variantFraming['web-1000'].horizontal===.65);assert(q.exports.variantFraming['web-1000'].icon===.25);
  const items=[catalog(p,'horizontal','original').at(0),catalog(p,'horizontal','mono').at(0),catalog(p,'icon','original').at(0)];
  const jobs=exportPlan(p,items).filter(j=>j.target.id==='web-1000');assert(jobs.filter(j=>j.item.variant==='horizontal').every(j=>j.target.scale===.65));assert(jobs.filter(j=>j.item.variant==='icon').every(j=>j.target.scale===.25));
  assert(root.querySelector('[data-framing-preview] path').getAttribute('fill')==='#000000');
 });
 await test('One ZIP contains 600 actual SVG files and yields to the browser',async()=>{
  const item=catalog(p,'icon','original').at(0);const q={...p,exports:{...p.exports,formats:['svg']}};let pulses=0;const timer=setInterval(()=>pulses++,10);
  try{const files=await buildFiles(q,Array.from({length:600},(_,i)=>({...item,id:'test-'+i})));assert(Object.keys(files).length===600);const zip=await zipFiles(files);const read=unzipSync(new Uint8Array(await zip.arrayBuffer()));assert(Object.keys(read).length===600);assert(pulses>0);link(zip,'600-fichiers.zip');}finally{clearInterval(timer)}
 });
 await test('Mixed PNG/JPEG/SVG/PDF ZIP separates uses and formats',async()=>{
  const item=catalog(p,'icon','original').at(0),pair={...item,id:'jpeg',background:{hex:'#efeee8',name:'Craie'}};
  const q={...p,exports:{...p.exports,rasterFormats:['custom-discord','signature'],destinations:['WEB','PRINT']}};
  const files=await buildFiles(q,[item,pair]);const names=Object.keys(files);assert(names.some(n=>n.includes('/CAS D’USAGE/Profil Discord/PNG/')));assert(names.some(n=>n.includes('/CAS D’USAGE/Signature mail/JPEG/')));assert(names.some(n=>n.includes('/PRINT/PDF/')));assert(names.some(n=>n.includes('/WEB/SVG/')));link(await zipFiles(files),'kit-mixte.zip');
 });
 prepareGuide(p);generateGuide(p);const g=p.brandGuideline;
 await test('Optional accent font, searchable reusable custom roles and FR/EN controls',async()=>{
  g.setup.complete=false;g.setup.step=0;const redraw=()=>mountGuideWizard(root,p,fn=>{fn();redraw()},msg=>{throw Error(msg)});redraw();
  assert(!root.querySelector('[data-type-font="accent"]'));root.querySelector('[data-accent-enabled]').click();assert(root.querySelector('[data-type-font="accent"]'));
  g.setup.step=1;redraw();const input=root.querySelector('[data-palette-role]');input.value='Éditorial';input.dispatchEvent(new Event('change'));assert(g.customColorRoles.includes('Éditorial'));assert([...root.querySelectorAll('datalist option')].some(o=>o.value==='Éditorial'));
  setLanguage('en');g.setup.step=0;redraw();assert(root.textContent.includes('Add an accent typeface'));setLanguage('fr');g.setup.complete=true;
 });
 await test('Cover and clearspace adapt to real backgrounds; PDF remains vector',async()=>{
  g.pages=g.pages.filter(a=>['cover','clearspace','fonts'].includes(a.type));g.pages.find(a=>a.type==='clearspace').background='#181818';await loadFonts(g);
  const clear=g.pages.find(a=>a.type==='clearspace'),el=pageElements(p,clear).find(e=>e.clearspace);assert(el.guideColor==='#efeee8');const svg=guidelineSVG(p,clear);assert(svg.includes('stroke="#efeee8"'));assert(svg.includes('stroke-opacity=".35"'));
  const cover=g.pages.find(a=>a.type==='cover'),els=pageElements(p,cover),label=els.find(e=>e.id==='cover-label'),brand=els.find(e=>e.id==='cover-brand');assert(label.y+label.h<brand.y);assert(label.size<brand.size);
  const pdf=await guidelinePDF(p);assert(pdf.size>1000);link(pdf,'guide-contraste.pdf');document.querySelector('#visuals').innerHTML=g.pages.map(a=>guidelineSVG(p,a)).join('');
 });
 draw();document.title=out.querySelector('.fail')?'FAIL corrections':'PASS corrections';
};
