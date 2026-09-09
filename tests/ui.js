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
  assert(!find('[data-disclosure="composition"]').open);
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
  assert(find(".protection-preview svg"));
  assert(find(".minimum-preview svg"));
  for (const ref of ["brandmarkWidth", "brandmarkHeight", "wordmarkHeight"]) {
    change("#clear-reference", ref);
    for (const mult of [0.5, 1, 1.5, 2]) {
      click(`[data-multiplier="${mult}"]`);
      assert(find(".clear-value").textContent.includes("× " + mult));
    }
  }
  input('[data-comp="minDigital"]', 140);
  assert(find('[data-comp="minDigital"]').value === "140");
});
await test("Import multicolore : palette automatique, inspection et verrouillage", async () => {
  click('nav [data-view="import"]');
  await upload('[data-upload="wordmark"]', [["multi.svg", multi]]);
  click('nav [data-view="family"]');
  assert(find("[data-edit-color]"));
  assert(find(".delivery svg"));
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
await test("Dégradés : modes visuels, stops, orientation et participation", async () => {
  click('[data-gallery-filter="gradient"]');
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
await test("Export : kit complet par défaut et personnalisation conservée", () => {
  click('nav [data-view="delivery"]');
  assert(find("#export-kit"));
  assert(!find('[data-disclosure="export"]').open);
  for (const f of ["svg", "png", "jpeg", "pdf"])
    assert(find(`[data-format="${f}"]`).checked);
  click('[data-export-preset="web"]');
  assert(!find('[data-format="pdf"]').checked);
  click('[data-export-preset="complete"]');
  assert(find('[data-format="pdf"]').checked);
  change('[data-export="width"]', 96);
  change('[data-export="height"]', 96);
  change('[data-export="dpi"]', 144);
  change('[data-global-pair="black:jpeg:black"]', true);
  assert(find('[data-global-pair="black:jpeg:black"]').checked);
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
  assert(find(".protection-preview svg"));
  change("#variant-name", "Compact personnalisé");
  change("#clear-reference", "brandmarkWidth");
  change("#clear-reference-value", 80);
  click('[data-multiplier="1.5"]');
  assert(find(".clear-value").textContent.includes("120.00"));
  click('nav [data-view="delivery"]');
  assert(!find("#export-kit").disabled);
});
await test("V1 et V2 migrent sans changer leurs choix de formats", async () => {
  for (const version of [1, 2]) {
    const p = project();
    p.version = version;
    p.brand = "QA ancien " + version;
    p.exports.formats = ["svg"];
    p.assets.icon = { svg: icon, name: "icon.svg" };
    p.assets.wordmark = { svg: word, name: "wordmark.svg" };
    for (const c of Object.values(p.compositions)) {
      delete c.clearMultiplier;
      delete c.clearRef;
      c.clear = 2;
    }
    await upload("#project-file", [["old.binksy", JSON.stringify(p)]]);
    assert(
      find('[data-multiplier="1"]').getAttribute("aria-pressed") === "true",
    );
    click('nav [data-view="delivery"]');
    assert(!find('[data-format="png"]').checked);
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
