import { project } from "../src/model.js";
import { unzipSync } from "fflate";
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
const icon = await (await fetch("./fixtures/icon.svg")).text(),
  word = await (await fetch("./fixtures/wordmark.svg")).text(),
  multi = await (await fetch("./fixtures/multicolor.svg")).text();
await wait(() => find('[data-mode="compose"]'));
await test("Importer : preview immédiate, aucune configuration obligatoire", async () => {
  click('[data-mode="compose"]');
  assert(find(".workspace").dataset.step === "import");
  change("#brand", "QA parcours Logo Kit");
  assert(find('[data-view="compose"]').disabled);
  assert(find(".left .palette-panel"), "palette visible before import");
  assert(!find(".palette-panel").closest("details"));
  for (const [hex, name] of [
    ["#123456", "Manuelle"],
    ["#abcdef", "À supprimer"],
  ]) {
    click('[data-action="add-color"]');
    input('.palette-editor [name="hex"]', hex);
    input('.palette-editor [name="name"]', name);
    click('.palette-editor [value="apply"]');
    await wait(() => !find("dialog"));
  }
  click("[data-edit-color]");
  input('.palette-editor [name="hex"]', "#654321");
  click('.palette-editor [value="apply"]');
  await wait(() => !find("dialog"));
  assert(
    find("[data-edit-color]").getAttribute("aria-label").includes("#654321"),
  );
  doc().querySelectorAll("[data-edit-color]")[1].click();
  click('.palette-editor [value="delete"]');
  await wait(() => !find("dialog"));
  assert(doc().querySelectorAll("[data-edit-color]").length === 1);
  await upload('[data-upload="icon"]', [["icon.svg", icon]]);
  assert(find(".import-logo-preview svg"));
  await upload('[data-upload="wordmark"]', [["wordmark.svg", word]]);
  assert(
    find('[data-edit-color][aria-label="Manuelle · #654321"]'),
    "manual color survives both imports",
  );
  const count = doc().querySelectorAll("[data-edit-color]").length;
  await upload('[data-upload="icon"]', [["icon.svg", icon]]);
  assert(
    doc().querySelectorAll("[data-edit-color]").length === count,
    "no duplicate on reimport",
  );
  assert(!find('[data-view="compose"]').disabled);
  assert(!find('[data-comp="iconX"]'));
  click('.step-next [data-view="compose"]');
  assert(find(".workspace").dataset.step === "compose");
  assert(doc().querySelectorAll(".construction-choice svg").length >= 4);
  assert(find('[data-inspector="composition"]').getAttribute("aria-selected") === "true");
  assert(!find("[data-color]"));
  assert(find('#canvas rect[fill="url(#grid)"]'), "grid visible by default");
  assert(
    find("#clear-guides").children.length,
    "protection visible by default",
  );
});
await test("Construction : tailles indépendantes, largeur et annulation", () => {
  const height = (key) =>
    +find(`[data-drag="${key}"] svg`).getAttribute("height");
  const before = height("icon");
  input('input[type="number"][data-comp="wordmarkHeight"]', 233);
  assert(height("icon") === before);
  assert(height("wordmark") === 233);
  input('input[type="number"][data-comp="iconHeight"]', 177);
  assert(height("wordmark") === 233);
  click('[data-inspector="position"]');
  change('[data-width="wordmark"]', 800);
  assert(height("wordmark") === 200);
  assert(height("icon") === 177);
  click('[data-action="undo"]');
  assert(height("wordmark") === 233);
  click('[data-action="redo"]');
  assert(height("wordmark") === 200);
  assert(doc().querySelectorAll("[data-resize]").length === 4);
});
await test("Alignement et centrage : chaque choix montre le logo", () => {
  click('[data-inspector="composition"]');
  assert(
    [...doc().querySelectorAll("[data-center]")].every((el) =>
      el.querySelector("svg"),
    ),
  );
  assert(
    [...doc().querySelectorAll("[data-align]")].every((el) =>
      el.querySelector("svg"),
    ),
  );
  click('[data-center="optical"]');
  assert(
    find('[data-center="optical"]').getAttribute("aria-pressed") === "true",
  );
  click('[data-canvas="#000000"]');
  assert(find("#stage").style.background === "rgb(0, 0, 0)");
  click('[data-canvas="#ffffff"]');
});
await test("Protection et tailles minimales : preview, puis contrôle manuel", () => {
  click('[data-inspector="guides"]');
  assert(find("#clear-guides").children.length);
  change("#clear-method", "part");
  for (const ref of ["brandmarkWidth", "brandmarkHeight", "wordmarkHeight"]) {
    change("#clear-reference", ref);
    for (const mult of [0.5, 1, 1.5, 2]) {
      click(`[data-multiplier="${mult}"]`);
      assert(find(".clear-value").textContent.includes("× " + mult));
    }
  }
  click('[data-inspector="more"]');
  assert(find(".minimum-preview svg"));
  input('[data-comp="minDigital"]', 140);
  assert(find('[data-comp="minDigital"]').value === "140");
});
await test("Import multicolore : palette automatique, inspection et verrouillage", async () => {
  click('nav [data-view="import"]');
  await upload('[data-upload="wordmark"]', [["multi.svg", multi]]);
  click('nav [data-view="family"]');
  assert(find("[data-edit-color]"));
  assert(find(".delivery svg"));
  assert(!find('[data-disclosure="logo-colors"]').open);
  click('[data-disclosure="logo-colors"] > summary');
  const chip = find('[data-highlight-asset="wordmark"]');
  chip.click();
  assert(
    find(
      '[data-inspection="wordmark"] [opacity="0.12"], [data-inspection="wordmark"] [opacity=".12"]',
    ),
  );
  change(
    '[data-role-asset="wordmark"][data-role-index="0"][data-role-field="paint"]',
    "#005544",
  );
  change(
    '[data-role-asset="wordmark"][data-role-index="0"][data-role-field="locked"]',
    true,
  );
  assert(
    find(
      '[data-role-asset="wordmark"][data-role-index="0"][data-role-field="locked"]',
    ).checked,
  );
  assert(find('.delivery path[fill="#005544"]'));
});
await test("Galerie : filtres, sélection évidente et catalogue facultatif", () => {
  click('[data-gallery-filter="multi"]');
  assert(find('[data-section="original"]').hidden);
  assert(!find('[data-section="multi"]').hidden);
  change('[data-section="multi"] [data-work-select]', true);
  assert(
    find('[data-section="multi"] .delivery').classList.contains("selected"),
  );
  click("[data-catalog-toggle]");
  assert(find(".editor-main").classList.contains("full-catalog"));
  click("[data-catalog-toggle]");
});
await test("Onglets : une seule catégorie visible et navigation au clavier", () => {
  for (const category of ['original','mono','multi','gradient','jpeg']) {
    click(`[data-gallery-filter="${category}"]`);
    const panels=[...doc().querySelectorAll('.category-panel')].filter(el=>!el.hidden);
    assert(panels.length===1 && panels[0].dataset.section===category);
    assert(find(".gallery-filters").getBoundingClientRect().height > 35,"tabs collapsed with long gallery");
  }
  find('[data-gallery-filter="jpeg"]').dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
  assert(find('[data-gallery-filter="original"]').getAttribute('aria-selected')==='true');
});
await test("JPEG : aperçu réel, choix individuel, recommandations et catalogue", () => {
  click('[data-gallery-filter="jpeg"]');
  assert(find('.jpeg-grid .delivery-preview svg rect[fill]'));
  change('[data-jpeg-pair]',true);
  assert(find('[data-jpeg-pair]').checked);
  change('[data-jpeg-pair]',false);
  assert(!find('[data-jpeg-pair]').checked);
  click('#reset-global-pairs');
  change('#jpeg-category','multi');
  assert(find('.jpeg-grid .delivery-preview svg'));
  assert(doc().querySelectorAll('[data-jpeg-pair]').length<=12);
  change('#jpeg-category','selected');
});
await test("Système complet : toutes les combinaisons restent accessibles", () => {
  click('#full-system');
  click('[data-gallery-filter="multi"]');
  assert([...doc().querySelectorAll('[data-work-select]')].every(el=>el.checked));
  click('[data-bulk-all="recommended"]');
  assert([...doc().querySelectorAll('[data-work-select]')].every(el=>!el.checked));
});
await test("Dégradés : modes visuels, stops, orientation et participation", async () => {
  click('[data-gallery-filter="gradient"]');
  click("[data-create-gradient]");
  click('.gradient-editor [value="apply"]');
  await wait(()=>!find("dialog"));
  change('[data-section="gradient"] [data-work-select]', true);
  const selectedId = find('[data-section="gradient"] [data-work-select]')
    .dataset.workSelect;
  click("[data-gradient-edit]");
  assert(find("dialog[open]"));
  assert(doc().querySelectorAll("[data-mode-preview]").length === 3);
  assert(
    [...doc().querySelectorAll("[data-mode-preview]")].every((el) =>
      el.querySelector("svg"),
    ),
  );
  assert(doc().querySelectorAll("[data-angle-preview]").length === 4);
  click('[data-gradient-mode="global"]');
  click("[data-add-stop]");
  assert(doc().querySelectorAll("[data-stop-color]").length === 3);
  input('[data-stop-color="1"]', "#22bb88");
  input('[data-stop-position="1"]', 35);
  click('[data-gradient-angle="45"]');
  assert(
    find(".gradient-live linearGradient").querySelectorAll("stop").length === 3,
  );
  click('[data-gradient-mode="shape"]');
  assert(
    find(".gradient-live linearGradient").getAttribute("gradientUnits") ===
      "objectBoundingBox",
  );
  click('[data-gradient-mode="global"]');
  click('dialog button[value="apply"]');
  await wait(() => !find("dialog"));
  assert(
    find(`[data-work-select="${selectedId}"]`).checked,
    "selection preserved",
  );
  const editedStops = () =>
    find(`[data-work-select="${selectedId}"]`)
      .closest(".delivery")
      .querySelectorAll("linearGradient stop").length;
  const after = editedStops();
  assert(after >= 3);
  click('[data-action="undo"]');
  assert(editedStops() < after, "undo restores gradient preview");
  click('[data-action="redo"]');
  assert(editedStops() === after, "redo refreshes gradient preview");
});
await test("Cadrage : annuler, poignées centrées, réglage partagé", async () => {
  click('[data-gallery-filter="original"]');
  click('[data-framing]');
  const range=find('.gradient-editor input[type="range"]');
  assert(+range.value===80);
  range.value=60;range.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));
  const stage=find('.framing-stage').getBoundingClientRect(),logo=find('.framing-logo').getBoundingClientRect();
  assert(Math.abs(stage.x+stage.width/2-logo.x-logo.width/2)<1);
  assert(Math.abs(stage.y+stage.height/2-logo.y-logo.height/2)<1);
  click('.gradient-editor [value="cancel"]');await wait(()=>!find('dialog'));
  click('[data-framing]');assert(+find('.gradient-editor input[type="range"]').value===80);
  input('.gradient-editor input[type="range"]',60);
  click('.gradient-editor [value="apply"]');await wait(()=>!find('dialog'));
  const buttons=doc().querySelectorAll('[data-framing]');click(`[data-framing="${buttons[1].dataset.framing}"]`);
  assert(+find('.gradient-editor input[type="range"]').value===60);
  click('.gradient-editor [value="cancel"]');await wait(()=>!find('dialog'));
});
await test("Export : kit complet par défaut et personnalisation conservée", async () => {
  click('nav [data-view="delivery"]');
  assert(find("#export-kit"));
  assert(!find('[data-disclosure="export"]').open);
  for (const f of ["svg", "png", "jpeg", "pdf"])
    assert(find(`[data-format="${f}"]`).checked);
  assert(!find('[data-export-preset]'));
  // A project previously set to Web must return to the complete kit on entry.
  change('[data-format="pdf"]', false);
  change('[data-format="jpeg"]', false);
  click('nav [data-view="family"]');
  click('nav [data-view="delivery"]');
  assert(find('[data-format="pdf"]').checked);
  assert(find('[data-format="jpeg"]').checked);
  change('[data-raster-format="web-3000"]', false);
  click('[data-custom-format]');
  input('dialog [name="label"]','Test ZIP');
  input('dialog [name="width"]',96);input('dialog [name="height"]',96);
  click('dialog [value="apply"]');
  await wait(()=>!find('dialog'));
  click('nav [data-view="family"]');
  click('[data-gallery-filter="jpeg"]');
  change("#jpeg-category", "mono");
  change('[data-global-pair="black:jpeg:black"]', true);
  assert(find('[data-global-pair="black:jpeg:black"]').checked);
  click('nav [data-view="delivery"]');
  const before = parseInt(find("#selection-count").textContent);
  change("[data-file-select]", false);
  assert(parseInt(find("#selection-count").textContent) === before - 1);
});
await test("Téléchargement réel du kit ZIP : SVG PNG JPEG PDF et recommandations", async () => {
  const proto = frame.contentWindow.HTMLAnchorElement.prototype,
    original = proto.click;
  downloaded = null;
  proto.click = function () {
    downloaded = { href: this.href, name: this.download };
  };
  try {
    click("#export-kit");
    await wait(
      () => downloaded || find("#notice").textContent.startsWith("PDF :"),
    );
    assert(downloaded, find("#notice").textContent);
    await wait(() => !find("#export-kit").disabled);
    const entries = unzipSync(
      new Uint8Array(await (await fetch(downloaded.href)).arrayBuffer()),
    );
    for (const ext of [".svg", ".png", ".jpeg", ".pdf", "RECOMMANDATIONS.txt"])
      assert(
        Object.keys(entries).some((n) => n.endsWith(ext)),
        ext + " absent",
      );
  } finally {
    proto.click = original;
  }
});
let saved;
await test("Sauvegarde et réouverture .binksy : dégradé, stops, verrou, sélection", async () => {
  const proto = frame.contentWindow.HTMLAnchorElement.prototype,
    original = proto.click;
  proto.click = function () {
    downloaded = { href: this.href, name: this.download };
  };
  click('[data-action="export-project"]');
  proto.click = original;
  saved = await (await fetch(downloaded.href)).text();
  const data = JSON.parse(saved);
  assert(data.gradients[0].stops.length === 3);
  assert(data.gradients[0].mode === "global");
  assert(data.assets.wordmark.roles[0].locked);
  assert(data.excludedFiles.length === 1);
  await upload("#project-file", [["qa.binksy", saved]]);
  click('nav [data-view="family"]');
  assert(
    find(
      '[data-role-asset="wordmark"][data-role-index="0"][data-role-field="locked"]',
    ).checked,
  );
});
await test("FR / EN : parcours et documentation", () => {
  click('[data-language="en"]');
  assert(doc().documentElement.lang === "en");
  assert(find("nav").textContent.includes("Build"));
  assert(find(".role-panel").textContent.includes("Logo colors"));
  click('[data-view="agent"]');
  assert(doc().body.textContent.includes("Automatic"));
  click('[data-view="home"]');
  click('[data-language="fr"]');
});
await test("Variantes assemblées : import multiple, protection automatique et export immédiat", async () => {
  click('[data-mode="ready"]');
  change("#brand", "QA assemblé");
  await upload("#ready-files", [
    ["Compact.svg", icon],
    ["Signature.svg", word],
  ]);
  assert(doc().querySelectorAll("[data-remove-variant]").length === 2);
  click('nav [data-view="compose"]');
  click('[data-inspector="guides"]');
  assert(find("#clear-guides").children.length);
  change("#clear-method", "part");
  change("#variant-name", "Compact personnalisé");
  change("#clear-reference", "brandmarkWidth");
  change("#clear-reference-value", 80);
  click('[data-multiplier="1.5"]');
  assert(find(".clear-value").textContent.includes("120.00"));
  click('nav [data-view="delivery"]');
  assert(!find("#export-kit").disabled);
});
let measuredProject;
await test("Accueil : exactement trois modes, dont zone de sécurité seule", () => {
  click('[data-view="home"]');
  assert(doc().querySelectorAll('.mode-grid [data-mode]').length === 3);
  click('[data-mode="clearspace"]');
  change('#brand', 'QA zone de sécurité');
  assert(!find('.palette-panel'));
  assert(!find('nav [data-view="family"]'));
  assert(doc().querySelectorAll('nav [data-view]').length === 3);
});
await test("Zone seule : import multiple, renommage, couleurs et SVG d’origine", async () => {
  await upload('#ready-files', [['Couleur.svg',multi],['Signature.svg',word]]);
  assert(doc().querySelectorAll('[data-remove-variant]').length === 2);
  click('nav [data-view="compose"]');
  assert(!find('[data-role-field]') && !find('[data-edit-color]'));
  assert(!find('[data-resize]') && !find('[data-drag]'));
  assert(find('#clear-method'));
  change('#variant-name','Version couleur');
  assert(find('.inspector-title h2').textContent === 'Version couleur');
  const { importSVG, compositionSVG } = await import('../src/svg.js');
  const { validate } = await import('../src/project.js');
  const proto=frame.contentWindow.HTMLAnchorElement.prototype, original=proto.click;
  proto.click=function(){downloaded={href:this.href,name:this.download};};
  click('[data-action="export-project"]');proto.click=original;
  measuredProject=JSON.parse(await (await fetch(downloaded.href)).text());
  assert(measuredProject.colors.length===0 && measuredProject.gradients.length===0);
  const restored=await validate(measuredProject);
  const asset=await importSVG(multi,'original.svg');
  assert(JSON.stringify(asset.paints)===JSON.stringify(restored.ready[0].asset.paints));
  const root = html => new DOMParser().parseFromString(html,'image/svg+xml').documentElement;
  const paints = svg => [...root(svg).querySelectorAll('[fill],[stroke],[stop-color],[opacity],[fill-opacity],[stop-opacity]')].map(el => ['fill','stroke','stop-color','opacity','fill-opacity','stop-opacity'].map(a => el.getAttribute(a)?.replace(/url\(#[^)]+\)/g,'url(#id)')||'').join('|')).filter(Boolean).sort();
  const svg=compositionSVG(restored,restored.active,{hex:'#ff00ff',force:true});
  assert(JSON.stringify(paints(svg))===JSON.stringify(paints(compositionSVG(restored,restored.active))), 'requested recolor ignored');
  restored.ready[0].asset.roles.forEach(r=>r.paint='#ff00ff');
  assert(JSON.stringify(paints(svg))===JSON.stringify(paints(compositionSVG(restored,restored.active))), 'manual roles ignored in clear-space mode');
});
await test("Mesure canvas : carré visible, taille en direct, disparition au relâchement", async () => {
  change('[data-setting="snap"]',false);
  click('[data-action="measure"]');
  const canvas=find('#canvas'), matrix=canvas.getScreenCTM();
  const start=new frame.contentWindow.DOMPoint(15,15).matrixTransform(matrix);
  const end=new frame.contentWindow.DOMPoint(52.5,29).matrixTransform(matrix);
  const pointer=(type,point) => canvas.dispatchEvent(new frame.contentWindow.PointerEvent(type,{bubbles:true,clientX:point.x,clientY:point.y,pointerId:1,button:0}));
  pointer('pointerdown',start);pointer('pointermove',end);
  const square=find('[data-measure-overlay] rect');
  assert(square && square.getAttribute('width')===square.getAttribute('height'));
  assert(Math.abs(+square.getAttribute('width')-37.5)<.001);
  assert(find('[data-measure-overlay] text').textContent.includes('37.50'));
  pointer('pointerup',end);
  assert(!find('[data-measure-overlay]'));
  assert(!find('.measurement-dialog[open]'));
  assert(find('[data-multiplier="1"]').getAttribute("aria-pressed")==="true");
  await wait(()=>!find('dialog'));
  assert(Math.abs(+find('#visual-value').value-37.5)<.001);
  assert(find('#measure-name').value==='X1');
});
await test("Mesure : undo/redo, copie choisie et mode focus", async () => {
  click('[data-action="undo"]');assert(!find('#visual-value'));
  click('[data-action="redo"]');assert(find('#measure-name').value==='X1');
  const target=find('[data-copy-rule]').dataset.copyRule;
  change('[data-copy-rule]',true);click('[data-action="copy-rule"]');
  click(`[data-active="${target}"]`);
  assert(Math.abs(+find('#visual-value').value-37.5)<.001);
  assert(find('#measure-name').value==='X1');
  click('[data-action="focus"]');
  assert(find('.workspace').classList.contains('focus-mode'));
  assert(frame.contentWindow.getComputedStyle(find('.right')).display==='none');
  click('[data-action="focus"]');assert(!find('.workspace').classList.contains('focus-mode'));
  click('[data-action="measure"]');
  doc().defaultView.dispatchEvent(new frame.contentWindow.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert(!find('.measurement-hint'));
});
await test("Mesure nommée : fichier .binksy, réouverture et planches vectorielles", async () => {
  const proto=frame.contentWindow.HTMLAnchorElement.prototype, original=proto.click;
  proto.click=function(){downloaded={href:this.href,name:this.download};};
  click('[data-action="export-project"]');proto.click=original;
  const savedMeasure=await (await fetch(downloaded.href)).text();
  const data=JSON.parse(savedMeasure);
  assert(data.mode==='clearspace');assert(data.compositions[data.active].visualMeasure.label==='X1');
  await upload('#project-file',[['measure.binksy',savedMeasure]]);
  assert(find('#measure-name').value==='X1');
  assert(Math.abs(+find('#visual-value').value-37.5)<.001);
  const { validate }=await import('../src/project.js');
  const { clearspaceSVG }=await import('../src/clearspace.js');
  const { exportPlan, buildFiles }=await import('../src/export.js');
  const { selectedItems }=await import('../src/catalog.js');
  const restored=await validate(data);
  restored.exports.width=96;restored.exports.height=96;
  const board=clearspaceSVG(restored,restored.active);
  assert(board.includes('X1'));
  assert(!board.includes('data-measure-overlay') && !board.includes('<image'));
  const jobs=exportPlan(restored,selectedItems(restored));
  assert(jobs.length===12 && jobs.every(j=>j.tone && j.path.includes('/CLEARSPACE/')));
  const files=await buildFiles(restored,selectedItems(restored));
  assert(Object.keys(files).length===12);
  for (const path of Object.keys(files).filter(p=>p.endsWith('.svg'))) assert(new TextDecoder().decode(files[path]).includes('X1'));
  click('nav [data-view="delivery"]');assert(find('.kit-metrics'));
  assert(!find('[data-format="jpeg"]') && !find('[data-export="jpegMargin"]'));
  assert(!find('#export-kit').disabled);
  assert(!find('[data-export-preset]'));assert(!find('[data-format="jpeg"]'));
  click('[data-language="en"]');
  assert(find('#export-kit').textContent==='Export clear spaces');
  click('[data-language="fr"]');
});
await test("Compatibilité : mesure historique prioritaire, paramètres visuels invalides ignorés", async () => {
  const { validate }=await import('../src/project.js');
  const { clearMeasure }=await import('../src/model.js');
  const data=structuredClone(measuredProject);
  data.mode='ready';const c=data.compositions[data.active];
  c.references.wordmarkHeight=19;c.clearRef='wordmarkHeight';
  const legacy=await validate(data);assert(clearMeasure(legacy).value===19);
  c.clearMethod='visual';c.visualMeasure={value:-5,label:'invalid'};
  const fixed=await validate(data);assert(fixed.compositions[fixed.active].clearMethod==='auto');
});

await test("V1 et V2 : kit complet à l’export, dimensions et DPI conservés", async () => {
  for (const version of [1, 2]) {
    const p = project();
    p.version = version;
    p.brand = "QA ancien " + version;
    p.exports.formats = ["svg"];
    delete p.exports.rasterFormats;
    p.exports.width = 1600;
    p.exports.height = 1200;
    p.exports.dpi = 144;
    p.assets.icon = { svg: icon, name: "icon.svg" };
    p.assets.wordmark = { svg: word, name: "wordmark.svg" };
    for (const c of Object.values(p.compositions)) {
      delete c.clearMultiplier;
      delete c.clearRef;
      c.clear = 2;
    }
    await upload("#project-file", [["old.binksy", JSON.stringify(p)]]);
    click('[data-inspector="guides"]');
    assert(
      find('[data-multiplier="1"]').getAttribute("aria-pressed") === "true",
    );
    click('nav [data-view="delivery"]');
    for (const format of ["svg", "png", "jpeg", "pdf"])
      assert(find(`[data-format="${format}"]`).checked);
    assert(!find('[data-export="organization"]'));
    assert(find('[data-raster-format="legacy-size"]'));
  }
});
await test("Réouverture locale après rechargement", async () => {
  click('[data-view="home"]');
  await new Promise((r) => {
    frame.addEventListener("load", r, { once: true });
    frame.contentWindow.location.reload();
  });
  await wait(() => find("[data-open]"));
  assert(doc().body.textContent.includes("QA ancien 2"));
  click("[data-open]");
  await wait(() => find("#stage"));
});
await test("Laptop et mobile : aucune largeur imposée, contrôles accessibles", async () => {
  for (const [w, h] of [
    [1440, 900],
    [1024, 768],
    [390, 844],
  ]) {
    frame.style.width = w + "px";
    frame.style.height = h + "px";
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    assert(doc().documentElement.scrollWidth <= w, "Débordement à " + w);
    const navBox = find('header nav').getBoundingClientRect();
    assert(navBox.bottom <= find('header').getBoundingClientRect().bottom + 1, "navigation overlaps canvas " + w);
    assert(find("#stage").getBoundingClientRect().height > 70, "Canvas à " + w);
    assert(find(".right").getBoundingClientRect().width <= w);
    click('nav [data-view="import"]');
    assert(find(".palette-panel").getBoundingClientRect().width <= w);
    click('[data-action="add-color"]');
    const box = find(".palette-editor").getBoundingClientRect();
    assert(box.left >= 0 && box.right <= w, "picker overflow " + w);
    assert(find(".palette-picker input").getBoundingClientRect().height >= 44);
    input('.palette-editor [name="hex"]', "#123abc");
    click('.palette-editor [value="apply"]');
    await wait(() => !find("dialog"));
    assert(find('[data-edit-color][aria-label$="#123abc"]'));
    assert(doc().documentElement.scrollWidth <= w, "palette overflow " + w);
    click('nav [data-view="family"]');
    click('[data-gallery-filter="jpeg"]');
    const activeTab=find('[data-gallery-filter="jpeg"]').getBoundingClientRect();
    const tabs=find('.gallery-filters').getBoundingClientRect();
    assert(activeTab.left>=tabs.left-1 && activeTab.right<=tabs.right+1, "active JPEG tab offscreen " + w);
    assert(tabs.height>35, "tabs collapsed " + w);
    assert(doc().documentElement.scrollWidth<=w, "JPEG overflow " + w);
    click('nav [data-view="compose"]');
  }
});
await test("Suppression : annuler protège le projet de test", async () => {
  click('[data-view="home"]');
  click('[data-mode="compose"]');
  change("#brand", "QA suppression temporaire");
  click('[data-view="home"]');
  const target = [...doc().querySelectorAll("[data-open]")].findLast((el) =>
    el.textContent.includes("QA suppression temporaire"),
  );
  const count = doc().querySelectorAll("[data-open]").length;
  click(`[data-delete-project="${target.dataset.open}"]`);
  assert(find("dialog[open]"));
  click('dialog button[value="cancel"]');
  await wait(() => !find("dialog"));
  assert(doc().querySelectorAll("[data-open]").length === count);
});
await test("Suppression confirmée du projet synthétique uniquement", async () => {
  const target = [...doc().querySelectorAll("[data-open]")].findLast((el) =>
    el.textContent.includes("QA suppression temporaire"),
  );
  const id = target.dataset.open;
  click(`[data-delete-project="${id}"]`);
  click('dialog button[value="delete"]');
  await wait(() => !find("dialog"));
  assert(!find(`[data-open="${id}"]`));
});
const summary = document.createElement("h2");
summary.textContent = `${results.children.length - failures}/${results.children.length} réussis`;
document.body.insertBefore(summary, frame);
document.title = `${failures ? "FAIL" : "PASS"} — UI LOGOKIT`;
