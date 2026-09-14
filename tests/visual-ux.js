import '../src/style.css';
import { project } from '../src/model.js';
import { importSVG } from '../src/svg.js';
import { prepareGuide, generateGuide } from '../src/guideline-config.js';
import { page, validateGuide } from '../src/guideline-model.js';
import { pageElements } from '../src/guideline-layout.js';
import { paginateMinimumPages } from '../src/guideline-minimum.js';
import { guidelineSVG, fittedText, textMetrics } from '../src/guideline-svg.js';
import { guidelinePDF, guidelineFiles } from '../src/guideline-export.js';
import { importResource, loadFonts } from '../src/guideline-fonts.js';
import { mountGuideline } from '../src/guideline-editor.js';
import { mountWorkshop } from '../src/workshop.js';
import { formatControls, bindFormats } from '../src/format-editor.js';
import { exportPlan, buildFiles, zipFiles } from '../src/export.js';
import { catalog, deliveries } from '../src/catalog.js';
import { setLanguage } from '../src/i18n.js';
import { unzipSync } from 'fflate';
const root=document.querySelector('#fixture'), out=document.querySelector('#results');
const p=project();p.brand='STUDIO BINKSY';
p.assets.icon=await importSVG(await(await fetch('./fixtures/icon.svg')).text(),'Icon');
p.assets.wordmark=await importSVG(await(await fetch('./fixtures/wordmark.svg')).text(),'Wordmark');
p.enabled=['horizontal','vertical','icon','wordmark'];
p.colors=[{id:'ink',name:'Encre',hex:'#181818'},{id:'white',name:'Craie',hex:'#ffffff'},{id:'blue',name:'Bleu',hex:'#2255aa'},{id:'orange',name:'Orange',hex:'#f06525'},{id:'sand',name:'Sable',hex:'#e2d7ba'}];
const g=prepareGuide(p);g.colorRoles={white:{role:'background'},ink:{role:'text'}};generateGuide(p);
const fonts=[];
for(const name of ['Arial.ttf','Georgia.ttf','ClashDisplay-Regular.otf','STIXGeneral.otf']){
 const response=await fetch('./.local-fixtures/'+name);
 if(!response.ok)continue;
 const r=await importResource(new File([await response.arrayBuffer()],name),g);g.resources.push(r);fonts.push(r);
}
await loadFonts(g);
let mode='guide';
const notice=message=>{const li=document.createElement('li');li.className='fail';li.textContent=message;out.append(li);};
const edit=fn=>{fn();draw();};
function draw(){
 if(mode==='guide')mountGuideline(root,p,edit,()=>{},notice);
 else{root.innerHTML='<main class="editor-main"></main><aside class="right"></aside>';mountWorkshop(p,edit,()=>{},mode);if(mode==='delivery'){const aside=root.querySelector('aside');aside.innerHTML=formatControls(p);bindFormats(aside,p,edit);}}
}
for(const key of ['guide','family','delivery'])document.querySelector('#'+key).onclick=()=>{mode=key;draw();};
document.querySelector('#english').onclick=()=>{setLanguage('en');draw();};
const assert=(v,m='Assertion')=>{if(!v)throw Error(m);};
const test=async(name,fn)=>{const li=document.createElement('li');try{await fn();li.className='pass';li.textContent='PASS '+name;}catch(error){li.className='fail';li.textContent='FAIL '+name+' — '+error.stack;}out.append(li);};
const link=(blob,name)=>{const a=document.createElement('a');a.download=name;a.href=URL.createObjectURL(blob);a.textContent=name;document.querySelector('#downloads').append(a);};
document.querySelector('#run').onclick=async()=>{
 out.replaceChildren();
 await test('Caption global font and local exception survive reload and reset',async()=>{
   assert(fonts.length===4,'Four local font fixtures required');
   const a=g.pages.find(a=>a.type==='logos');
   g.typography.caption={font:fonts[0].id,size:9,leading:1.4};
   const id=pageElements(p,a).find(e=>e.role==='caption').id;
   g.typography.caption.font=fonts[1].id;
   assert(pageElements(p,a).find(e=>e.id===id).font===fonts[1].id);
   a.styles[id]={font:fonts[0].id,tracking:-.2,align:'right'};
   const reloaded=validateGuide(JSON.parse(JSON.stringify(g)));assert(reloaded.pages.find(x=>x.id===a.id).styles[id].font===fonts[0].id);
   assert(pageElements(p,a).find(e=>e.id===id).font===fonts[0].id);
   delete a.styles[id];assert(pageElements(p,a).find(e=>e.id===id).font===fonts[1].id);
 });
 await test('25 visible pair combinations, persistent statuses and stable pagination',async()=>{
   const pages=paginateMinimumPages(p).filter(a=>a.type==='pairs');
   const samples=pages.flatMap(a=>pageElements(p,a)).filter(e=>e.id.startsWith('pair-text-'));
   assert(samples.length===25,String(samples.length));
   assert(new Set(samples.map(e=>e.id)).size===25);
   assert(!samples.some(e=>e.opacity!==undefined));
   g.pages=paginateMinimumPages(p);const ids=g.pages.map(a=>a.id);g.pages=paginateMinimumPages(p);assert(JSON.stringify(ids)===JSON.stringify(g.pages.map(a=>a.id)));
 });
 await test('Logo variants use a common real colour with no individual backgrounds',async()=>{
   const a=g.pages.find(a=>a.type==='logos'),elements=pageElements(p,a);
   assert(!elements.some(e=>e.id.startsWith('logo-bg-')));
   assert(new Set(elements.filter(e=>e.type==='logo').map(e=>e.colorId)).size===1);
 });
 await test('Accent adds a complete hierarchy role and additional space',async()=>{
   g.accentTypography.enabled=true;g.typography.accent={font:fonts[2].id,size:32,weight:400,leading:1.5,tracking:.3};g.pages=paginateMinimumPages(p);
   const pages=g.pages.filter(a=>a.type==='hierarchy');assert(pages.length>1);
   assert(pages.flatMap(a=>pageElements(p,a)).some(e=>e.id==='type-sample-accent'));
 });
 await test('Raster output: no default PRINT duplication, custom PNG or JPEG, shared framing',async()=>{
   const q=structuredClone(p);q.brandGuideline.enabled=false;q.exports.clearspace=false;q.exports.rasterFormats=['web-1000','custom-a','custom-b'];q.exports.customFormats=[{id:'custom-a',name:'Transparent',width:64,height:96,background:'transparent'},{id:'custom-b',name:'Fond',width:96,height:64,background:'color'}];q.exports.variantFraming={'web-1000':{horizontal:.68}};
   const original=catalog(q,'horizontal','original').at(0);const items=deliveries(q,[original]);const jobs=exportPlan(q,items);
   assert(!jobs.some(j=>j.target.destination==='PRINT' && ['png','jpeg'].includes(j.format)));
   assert(jobs.filter(j=>j.target.id==='custom-a').every(j=>j.format==='png'));
   assert(jobs.filter(j=>j.target.id==='custom-b').every(j=>j.format==='jpeg'));
   assert(jobs.filter(j=>j.target.id==='web-1000').every(j=>j.target.scale===.68));
   q.exports.rasterFormats=['custom-a','custom-b'];const files=await buildFiles(q,items),names=Object.keys(files),zip=await zipFiles(files);assert(JSON.stringify(Object.keys(unzipSync(new Uint8Array(await zip.arrayBuffer()))))===JSON.stringify(names));link(zip,'visual-ux-kit.zip');
 });
 for(const format of ['16:9','landscape','portrait']) await test('TTF + OTF layout and real vector PDF / SVG · '+format,async()=>{
   const q=structuredClone(p),a=page('blank');q.brandGuideline.pages=[a];q.brandGuideline.format=format;
   const W=format==='16:9'?960:format==='portrait'?595.28:841.89,H=format==='16:9'?540:format==='portrait'?841.89:595.28;
   fonts.forEach((font,i)=>a.elements.push({id:'font-'+i,type:'text',text:font.name+' — À propos de cette identité\nUn titre long et des paragraphes multilignes : glyphes, accents, œil. Une légende lisible.',role:i%2?'caption':'title',font:font.id,size:i%2?11:23,leading:1.4,tracking:i%2?-.2:.5,align:i%2?'right':'left',fill:'#181818',x:36/W,y:(30+i*(H-60)/4)/H,w:(W-72)/W,h:(H-80)/4/H}));
   await loadFonts(q.brandGuideline);
   for(const e of pageElements(q,a)){if(e.type==='text'){const f=fittedText(e,q.brandGuideline);assert(textMetrics(f,q.brandGuideline).height<=e.h+.1);}}
   const svg=guidelineSVG(q,a,0,{portable:true}),paths=guidelineSVG(q,a,0,{paths:true});assert(svg.includes('<text') && svg.includes('id="TEXT_'));assert(!paths.includes('<text') && paths.includes('<path'));
   const stage=document.createElement('div');stage.innerHTML=svg+paths;document.querySelector('#previews').append(stage);
   const pdf=await guidelinePDF(q);assert(pdf.size>1000);link(pdf,'fonts-'+format+'.pdf');link(new Blob([svg],{type:'image/svg+xml'}),'fonts-'+format+'.svg');
 });
 await test('Variant folders expose original / mono and retain gradient creation and JPEG',async()=>{
   mode='family';draw();assert(root.querySelectorAll('[data-open-variant]').length===4);assert(root.querySelector('[data-section=gradient] [data-create-gradient]'));
   assert(!root.querySelector('[data-section=jpeg]').hidden);
   root.querySelector('[data-open-variant=vertical]').click();assert(root.querySelector('[data-open-variant=vertical]').getAttribute('aria-pressed')==='true');
 });
 mode='guide';draw();
};
