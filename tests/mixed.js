import { project, layout, clearMeasure } from '../src/model.js';
import { importSVG, compositionSVG } from '../src/svg.js';
import { validate } from '../src/project.js';
import { catalog, deliveries } from '../src/catalog.js';
import { makeFile, buildFiles } from '../src/export.js';
import { updateGradient } from '../src/gradient.js';
import { unzipSync, zipSync } from 'fflate';
const frame = document.querySelector("iframe"),
  results = document.querySelector("#results");
let failures = 0,
  downloaded;
const doc = () => frame.contentDocument,
  find = (s) => doc().querySelector(s);
const assert = (v, m = "Assertion échouée") => {
  if (!v) throw Error(m);
};
const wait = async (fn) => {
  for (let i = 0; i < 400; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw Error("État attendu non atteint");
};
async function test(name, fn) {
  const li = document.createElement("li");
  results.append(li);
  try {
    await fn();
    li.textContent = "PASS · " + name;
    li.className = "pass";
  } catch (e) {
    failures++;
    li.textContent = "FAIL · " + name + " · " + e.stack;
    li.className = "fail";
  }
}
const reveal = (el) => {
  let node = el.parentElement;
  while (node) {
    if (node.tagName === "DETAILS") node.open = true;
    node = node.parentElement;
  }
};
const click = (s) => {
  const el = find(s);
  assert(el, "Contrôle absent : " + s);
  reveal(el);
  el.click();
};
const change = (s, v) => {
  const el = find(s);
  assert(el, "Champ absent : " + s);
  reveal(el);
  if (el.type === "checkbox") el.checked = v;
  else el.value = v;
  el.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
};
const input = (s, v) => {
  const el = find(s);
  assert(el, "Champ absent : " + s);
  reveal(el);
  el.value = v;
  el.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true }));
  el.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
};
async function upload(selector, files) {
  const dt = new frame.contentWindow.DataTransfer();
  for (const [name, source] of files)
    dt.items.add(
      new frame.contentWindow.File([source], name, {
        type: name.endsWith(".svg") ? "image/svg+xml" : "application/json",
      }),
    );
  const el = find(selector);
  el.files = dt.files;
  await el.onchange({ target: el });
}

const mono = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><path d="M0 0H100V50H0Z" fill="#000000"/></svg>';
const multi = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><g transform="translate(5 5)"><path d="M0 0H50V50H0Z" fill="#000000"/><circle cx="80" cy="25" r="20" fill="#ff5500" stroke="#ffffff" stroke-width="4"/><path d="M5 5H15V15H5Z" fill="#ffffff"/></g></svg>';
const grad = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><defs><linearGradient id="g" x1="0%" y1="20%" x2="100%" y2="80%"><stop stop-color="#ff5500"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><path d="M0 0H100V50H0Z" fill="url(#g)"/></svg>';
let ids, saved;
async function snapshot() {
  const proto=frame.contentWindow.HTMLAnchorElement.prototype, old=proto.click;
  proto.click=function(){downloaded={href:this.href,name:this.download};};
  try { click('[data-action="export-project"]'); return JSON.parse(await (await fetch(downloaded.href)).text()); }
  finally { proto.click=old; }
}
await wait(() => find('[data-mode="compose"]'));
await test('Import mixte : composants puis plusieurs SVG complets, aperçus et noms uniques', async () => {
  click('[data-mode="compose"]'); change('#brand','QA variantes mixtes');
  await upload('[data-upload="icon"]', [['icon.svg',mono]]);
  await upload('[data-upload="wordmark"]', [['word.svg',mono]]);
  await upload('#ready-files', [['Badge.svg',multi],['Badge.svg',grad]]);
  assert(doc().querySelectorAll('.ready-card').length===2);
  assert(doc().querySelectorAll('.ready-preview svg').length===2);
  ids=[...doc().querySelectorAll('[data-ready-name]')].map(el=>el.dataset.readyName);
  assert(find(`[data-ready-name="${ids[1]}"]`).value==='Badge 2');
  saved=await snapshot(); assert(saved.ready[0].asset.roles.length===3);
  assert(saved.ready[1].asset.svg.includes('linearGradient'));
});
await test('Palette complète : toutes les déclinaisons accessibles sans Tout voir', async () => {
  const expected = [];
  for (const id of saved.enabled) {
    const c = catalog(saved, id, 'mono');
    for (let i = 0n; i < c.size; i++) expected.push(c.at(i).id);
  }
  assert(expected.length > 12, 'fixture au-delà de la limite des suggestions');
  click('[data-view="family"]');click('[data-gallery-filter="mono"]');
  assert(!find('.editor-main').classList.contains('full-catalog'));
  assert(frame.contentWindow.getComputedStyle(find('#category-mono .pagination')).display !== 'none');
  const seen = [];
  do {
    const cards = [...doc().querySelectorAll('#category-mono [data-work-select]')];
    assert(cards.length <= 12);
    seen.push(...cards.map(el => el.dataset.workSelect));
    if (find('[data-page="mono:1"]').disabled) break;
    click('[data-page="mono:1"]');
  } while (seen.length <= expected.length);
  assert(JSON.stringify(seen) === JSON.stringify(expected), 'couleur manquante ou dupliquée');
  change('[data-page-input="mono"]', '1');
  const first = find('#category-mono [data-work-select]').dataset.workSelect;
  change(`[data-work-select="${first}"]`, false);
  click('[data-page="mono:1"]');click('[data-page="mono:-1"]');
  assert(!find(`[data-work-select="${first}"]`).checked);
  change(`[data-work-select="${first}"]`, true);
  change('#construction-filter', ids[1]);
  assert([...doc().querySelectorAll('#category-mono [data-work-select]')].every(el => el.dataset.workSelect.startsWith(ids[1] + ':')));
  change('#construction-filter', 'all');
  click('[data-view="import"]');
});
await test('Renommage, suppression et Undo / Redo conservent le SVG', async () => {
  change(`[data-ready-name="${ids[0]}"]`,'Logo compact');
  click(`[data-remove-variant="${ids[1]}"]`); assert(doc().querySelectorAll('.ready-card').length===1);
  click('[data-action="undo"]'); assert(doc().querySelectorAll('.ready-card').length===2);
  click('[data-action="redo"]'); assert(doc().querySelectorAll('.ready-card').length===1);
  click('[data-action="undo"]');
  saved=await snapshot(); assert(saved.ready[0].name==='Logo compact');
});
await test('SVG invalide : import et remplacement refusés sans perte', async () => {
  const before=JSON.stringify((await snapshot()).ready);
  await upload('#ready-files',[['invalid.svg','<svg>']]);
  assert(JSON.stringify((await snapshot()).ready)===before);
  await upload(`[data-replace-variant="${ids[0]}"]`,[['invalid.svg','hello']]);
  assert(JSON.stringify((await snapshot()).ready)===before);
});
await test('Versions mixtes : activation, zone propre et absence de composition', async () => {
  click('[data-view="compose"]'); click(`[data-active="${ids[0]}"]`);
  assert(doc().querySelectorAll('.construction-choice').length===6);
  assert(!find('[data-inspector="composition"]') && !find('[data-inspector="position"]'));
  assert(!find('[data-drag]') && !find('[data-resize]'));
  assert(find('#clear-method').value==='auto');
  change(`[data-variant="${ids[0]}"]`,false); assert(!(await snapshot()).enabled.includes(ids[0]));
  change(`[data-variant="${ids[0]}"]`,true);
});
await test('0,5x / 1x / 1,5x / 2x : orange, contraste, aria-pressed et persistance par variante', async () => {
  for (const id of [ids[0],'horizontal']) {
    click(`[data-active="${id}"]`); click('[data-inspector="guides"]');
    for (const n of [.5,1,1.5,2]) {
      click(`[data-multiplier="${n}"]`);
      const buttons=[...doc().querySelectorAll('[data-multiplier]')];
      assert(buttons.filter(b=>b.getAttribute('aria-pressed')==='true').length===1);
      const selected=find(`[data-multiplier="${n}"]`), css=frame.contentWindow.getComputedStyle(selected);
      assert(css.backgroundColor==='rgb(255, 85, 0)' && css.color==='rgb(25, 25, 25)');
      assert(buttons.filter(b=>b!==selected).every(b=>frame.contentWindow.getComputedStyle(b).backgroundColor!==css.backgroundColor));
      click(`[data-active="${ids[1]}"]`); click(`[data-active="${id}"]`);
      assert(find(`[data-multiplier="${n}"]`).getAttribute('aria-pressed')==='true');
    }
  }
  click(`[data-active="${ids[0]}"]`); click('[data-inspector="more"]'); input('[data-comp="minPrint"]',32); input('[data-comp="minDigital"]',150);
  saved=await snapshot();
});
await test('Remplacer le SVG conserve nom, mesures, tailles et se restaure avec Undo', async () => {
  click('[data-view="import"]'); const before=await snapshot();
  await upload(`[data-replace-variant="${ids[0]}"]`,[['replacement.svg',mono]]);
  const after=await snapshot();
  assert(after.ready[0].name==='Logo compact' && after.ready[0].asset.roles.length===1);
  assert(JSON.stringify(after.compositions[ids[0]])===JSON.stringify(before.compositions[ids[0]]));
  click('[data-action="undo"]'); assert((await snapshot()).ready[0].asset.roles.length===3);
});
await test('Rôles partagés : correction et verrou suivent les variantes, nouveaux imports compris', async () => {
  click('[data-view="family"]');
  change('[data-role-asset="icon"][data-role-index="0"][data-role-field="paint"]','#123456');
  change('[data-role-asset="icon"][data-role-index="0"][data-role-field="locked"]',true);
  let p=await snapshot();
  assert(p.ready[0].asset.roles.find(r=>r.id==='paint-000000').paint==='#123456');
  assert(p.ready[0].asset.roles.find(r=>r.id==='paint-000000').locked);
  click('[data-view="import"]'); await upload('#ready-files',[['Signature.svg',mono]]);
  p=await snapshot(); assert(p.ready[2].asset.roles[0].paint==='#123456' && p.ready[2].asset.roles[0].locked);
  saved=p;
});
await test('Mappings multicolores, stroke, verrou et géométrie du SVG complet', async () => {
  const p=await validate(saved), id=ids[0];
  const svg=compositionSVG(p,id,{mapping:{'paint-000000':'#00ff00','paint-ff5500':'#abcdef','paint-ffffff':'#fedcba'}});
  assert(svg.includes('#123456') && svg.includes('#abcdef') && svg.includes('#fedcba'));
  assert(!svg.includes('#00ff00') && !svg.includes('<image'));
  assert(svg.includes('translate(5 5)') && svg.includes('M0 0H50V50H0Z'));
  const before=layout(p,id); p.compositions[id].gap=5; p.compositions[id].wordmarkHeight=999;
  assert(JSON.stringify(layout(p,id))===JSON.stringify(before));
  assert(clearMeasure(p,id).value===Math.min(before.width,before.height));
});
await test('Dégradés importés et globaux : stops, références et sauvegarde', async () => {
  const p=await validate(saved), id=ids[1];
  const original=compositionSVG(p,id); assert(original.includes('linearGradient') && original.includes('20%'));
  const gradient={id:'mixed-global',name:'Global',from:'#123456',to:'#abcdef',angle:45,mode:'global',stops:[{offset:0,color:'#123456'},{offset:1,color:'#abcdef'}]};
  p.gradients=[gradient]; p.selectedDescriptors={};
  for (const variant of ['horizontal',id]) p.selectedDescriptors[variant+':gradient-mixed-global']={id:variant+':gradient-mixed-global',variant,category:'gradient',color:{id:'gradient-mixed-global',gradient}};
  updateGradient(p,{...gradient,from:'#ff0000',stops:[{offset:0,color:'#ff0000'},{offset:1,color:'#abcdef'}]});
  const restored=await validate(JSON.parse(JSON.stringify(p)));
  const values=Object.values(restored.selectedDescriptors);
  assert(values.length===2 && values[0].color.gradient===values[1].color.gradient);
  assert(compositionSVG(restored,id,values[1].color).includes('#ff0000'));
});
await test('Exports mixtes SVG / PNG / JPEG / PDF, transparence et ZIP nommé', async () => {
  const p=await validate(saved); p.exports.width=160; p.exports.height=120;
  const items=['horizontal',...ids].map(id=>catalog(p,id,'original').at(0n));
  for (const id of ids) {
    const item=catalog(p,id,'original').at(0n);
    for (const format of ['svg','png','jpeg','pdf']) {
      const blob=await makeFile(p,item,format); assert(blob.size>50,format);
      if(format==='pdf') {const text=await blob.text();assert(text.startsWith('%PDF') && !text.includes('/Subtype /Image'));}
      if(format==='png'||format==='jpeg') {
        const bitmap=await createImageBitmap(blob), canvas=document.createElement('canvas'); canvas.width=bitmap.width;canvas.height=bitmap.height;
        assert(bitmap.width===160 && bitmap.height===120);const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);
        assert(ctx.getImageData(0,0,1,1).data[3]===(format==='png'?0:255));bitmap.close();
      }
    }
  }
  const files=await buildFiles(p,deliveries(p,items)), names=Object.keys(files);
  assert(names.some(n=>n.includes('logo-compact') && n.endsWith('.svg')));
  assert(names.some(n=>n.includes('badge-2') && n.endsWith('.pdf')));
  assert(names.some(n=>n.toLowerCase().includes('/clearspace/logo compact/')));
  assert(names.some(n=>n.includes('/JPEG/')));
  assert(Object.keys(unzipSync(zipSync(files))).length===names.length);
});
await test('Sauvegarde / recharge .binksy et état actif orange', async () => {
  click('[data-action="import-project"]'); await upload('#project-file',[['mixed.binksy',JSON.stringify(saved)]]);
  click(`[data-active="${ids[0]}"]`);click('[data-inspector="guides"]');
  assert(find('[data-multiplier="2"]').getAttribute('aria-pressed')==='true');
  assert(frame.contentWindow.getComputedStyle(find('[data-multiplier="2"]')).backgroundColor==='rgb(255, 85, 0)');
  const p=await snapshot(); assert(p.ready.length===3 && p.compositions[ids[0]].minPrint===32);
  await wait(()=>find('#save-state').textContent.includes('Enregistré'));
  frame.contentWindow.location.reload(); await wait(()=>find('[data-open]'));
  click(`[data-open="${p.id}"]`);await wait(()=>find(`[data-active="${ids[0]}"]`));click(`[data-active="${ids[0]}"]`);click('[data-inspector="guides"]');
  assert(find('[data-multiplier="2"]').getAttribute('aria-pressed')==='true');
  assert(frame.contentWindow.getComputedStyle(find('[data-multiplier="2"]')).backgroundColor==='rgb(255, 85, 0)');
});
await test('Téléchargement du kit mixte : archive réelle et noms personnalisés', async () => {
  click('nav [data-view="delivery"]');
  change('[data-raster-format="web-3000"]',false);
  click('[data-custom-format]');
  change('dialog [name="label"]','Test mixte');change('dialog [name="width"]',96);change('dialog [name="height"]',96);
  click('dialog [value="apply"]');await wait(()=>!find('dialog'));
  const proto=frame.contentWindow.HTMLAnchorElement.prototype, original=proto.click;
  downloaded=null;proto.click=function(){downloaded={href:this.href,name:this.download};};
  try {
    click('#export-kit');await wait(()=>downloaded || !find('#export-kit').disabled);
    assert(downloaded,find('#notice').textContent);await wait(()=>!find('#export-kit').disabled);
    const entries=unzipSync(new Uint8Array(await (await fetch(downloaded.href)).arrayBuffer())), names=Object.keys(entries);
    for(const ext of ['.svg','.png','.jpeg','.pdf','RECOMMANDATIONS.txt']) assert(names.some(n=>n.endsWith(ext)),ext);
    for(const name of ['horizontal','logo-compact','badge-2']) assert(names.some(n=>n.includes(name)),name);
  } finally {proto.click=original;}
});
await test('Anciennes sauvegardes sans ready : V1 / V2 / V3', async () => {
  for(const version of [1,2,3]) {const p=project();p.version=version;delete p.ready;const q=await validate(p);assert(q.ready.length===0 && q.enabled.length===4);}
});
await test('Règles agent et imports bilingues cohérents avec les variantes mixtes', async () => {
  click('[data-view="agent"]'); let text=doc().body.textContent;
  assert(text.includes('ne jamais la décomposer') && text.includes('aria-pressed') && text.includes('{variant}') && text.includes('ready est une liste additive'));
  click('[data-language="en"]');text=doc().body.textContent;
  assert(text.includes('never split, recompose') && text.includes('aria-pressed') && text.includes('ready is an additive'));
  click('[data-view="home"]');click('[data-mode="compose"]');
  assert(find('.ready-upload').textContent.includes('Add an SVG variant'));
  click('[data-language="fr"]');
});
await test('Import seul de SVG prêts en mode compose et responsive 1440 / 1024 / 390', async () => {
  await upload('#ready-files',[['Badge.svg',multi],['Signature.svg',grad]]);
  assert(!find('[data-view="compose"]').disabled);
  for (const width of [1440,1024,390]) {
    frame.style.width=width+'px'; await new Promise(r=>setTimeout(r,100));
    assert(doc().documentElement.scrollWidth<=width+2, 'débordement à '+width);
    assert([...doc().querySelectorAll('.ready-card')].every(el=>el.getBoundingClientRect().width<=width));
  }
  const cards=[...doc().querySelectorAll('[data-ready-name]')].map(el=>el.dataset.readyName);
  click(`[data-active="${cards[0]}"]`);click(`[data-remove-variant="${cards[0]}"]`);
  assert(find('.import-logo-preview svg'), 'suppression active : aperçu de la variante restante');
  click('[data-action="undo"]');assert(doc().querySelectorAll('.ready-card').length===2);
  frame.style.width='1440px';
});
const summary=document.createElement('h2');summary.textContent=`${results.children.length-failures}/${results.children.length} réussis`;document.body.insertBefore(summary,frame);
document.title=`${failures?'FAIL':'PASS'} — MIXED LOGOKIT`;
