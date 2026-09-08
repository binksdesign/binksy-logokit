import { project } from "../src/model";
const frame = document.querySelector("iframe"),
  results = document.querySelector("#results");
let failures = 0;
const doc = () => frame.contentDocument;
const find = (s) => doc().querySelector(s);
const assert = (value, message = "Assertion échouée") => {
  if (!value) throw Error(message);
};
const wait = async (fn) => {
  for (let i = 0; i < 100; i++) {
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
    li.textContent = "FAIL · " + name + " · " + e.message;
    li.className = "fail";
  }
}
const click = (s) => {
  assert(find(s), "Contrôle absent : " + s);
  find(s).click();
};
const change = (s, value) => {
  const el = find(s);
  assert(el, "Champ absent : " + s);
  if (el.type === "checkbox") el.checked = value;
  else el.value = value;
  el.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
};
async function upload(selector, files) {
  const dt = new frame.contentWindow.DataTransfer();
  for (const [name, contents] of files)
    dt.items.add(
      new frame.contentWindow.File([contents], name, {
        type: name.endsWith(".svg") ? "image/svg+xml" : "application/json",
      }),
    );
  const input = find(selector);
  input.files = dt.files;
  await input.onchange({ target: input });
}
const icon = await (await fetch("./fixtures/icon.svg")).text(),
  word = await (await fetch("./fixtures/wordmark.svg")).text();
await wait(() => find('[data-mode="compose"]'));
await test("Accueil et nouveau projet à composer", async () => {
  click('[data-mode="compose"]');
  assert(find(".workspace").dataset.mode === "compose");
  change("#brand", "Validation Logokit");
  await upload('[data-upload="icon"]', [["icon.svg", icon]]);
  await wait(() => find('[data-drag="icon"]'));
  await upload('[data-upload="wordmark"]', [["wordmark.svg", word]]);
  await wait(() => find('[data-drag="wordmark"]'));
  assert(find("#measure").textContent.includes("575.0"));
});
await test("Grille calée sur haut / bas / gauche du logotype", () => {
  const g = find('[data-drag="wordmark"]');
  const [x, y] = g
    .getAttribute("transform")
    .match(/-?[\d.]+/g)
    .map(Number);
  assert(+find("#grid").getAttribute("x") === x);
  assert(+find("#grid").getAttribute("y") === y);
  assert(
    +find("#grid").getAttribute("height") * 2 ===
      +g.querySelector("svg").getAttribute("height"),
  );
});
await test("Canvas clair / sombre sans perdre les propriétés", () => {
  click('[data-canvas="#000000"]');
  assert(find("#stage").style.background === "rgb(0, 0, 0)");
  click('[data-canvas="#ffffff"]');
  assert(find("#stage").style.background === "rgb(255, 255, 255)");
});
await test("Scroll Propriétés indépendant, canvas visible", () => {
  const right = find(".right"),
    stage = find("#stage");
  const before = stage.getBoundingClientRect();
  right.scrollTop = right.scrollHeight;
  const after = stage.getBoundingClientRect();
  assert(right.scrollTop > 0);
  assert(before.top === after.top && after.bottom <= 800);
  assert(doc().documentElement.scrollTop === 0);
});
await test("3 références et quatre multiplicateurs dans les contrôles", () => {
  for (const reference of [
    "brandmarkWidth",
    "brandmarkHeight",
    "wordmarkHeight",
  ]) {
    change("#clear-reference", reference);
    for (const mult of [0.5, 1, 1.5, 2]) {
      click(`[data-multiplier="${mult}"]`);
      assert(find(".clear-value").textContent.includes("× " + mult));
    }
  }
});
await test("Dimensions numériques indépendantes, largeur, poignées et Undo", () => {
  const input = (key, value) => {
    const el = find(`input[type="number"][data-comp="${key}"]`);
    el.value = value;
    el.dispatchEvent(new frame.contentWindow.Event("input"));
    el.dispatchEvent(new frame.contentWindow.Event("change"));
  };
  const height = (key) =>
    +find(`[data-drag="${key}"] svg`).getAttribute("height");
  const iconBefore = height("icon");
  input("wordmarkHeight", 233);
  assert(height("wordmark") === 233);
  assert(height("icon") === iconBefore);
  input("iconHeight", 177);
  assert(height("icon") === 177);
  assert(height("wordmark") === 233);
  change('[data-width="wordmark"]', 800);
  assert(height("wordmark") === 200);
  assert(height("icon") === 177);
  assert(doc().querySelectorAll("[data-resize]").length === 4);
  const handle = find('[data-resize="se"]'),
    rect = handle.getBoundingClientRect(),
    win = frame.contentWindow;
  handle.dispatchEvent(
    new win.PointerEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: rect.x,
      clientY: rect.y,
      pointerId: 2,
    }),
  );
  win.dispatchEvent(
    new win.PointerEvent("pointermove", {
      clientX: rect.x + 25,
      clientY: rect.y + 25,
      pointerId: 2,
    }),
  );
  win.dispatchEvent(new win.PointerEvent("pointerup", { pointerId: 2 }));
  assert(height("icon") !== 177);
  assert(height("wordmark") === 200);
  click('[data-action="undo"]');
  assert(height("icon") === 177);
  click('[data-action="redo"]');
  assert(height("icon") !== 177);
});
await test("FR / EN, messages et persistance", async () => {
  click('[data-language="en"]');
  assert(find(".right").getAttribute("aria-label") === "Properties");
  assert(find('[data-language="en"]').getAttribute("aria-pressed") === "true");
  click('[data-view="agent"]');
  assert(doc().body.textContent.includes("independent"));
  click('[data-view="home"]');
  await new Promise((resolve) => {
    frame.addEventListener("load", resolve, { once: true });
    frame.contentWindow.location.reload();
  });
  await wait(() => find('[data-mode="compose"]'));
  assert(find('[data-language="en"]').getAttribute("aria-pressed") === "true");
  click('[data-language="fr"]');
  const open = doc().querySelectorAll("[data-open]");
  open[open.length - 1].click();
  await wait(() => find("#stage"));
});
await test("Palette : ajout, couleur noire / blanche / colorée", () => {
  click('[data-action="add-color"]');
  let color = find("[data-color]");
  change("[data-color-name]", "Corail");
  change("[data-color]", "#ff5500");
  click('[data-action="add-color"]');
  const names = doc().querySelectorAll("[data-color-name]");
  names[1].value = "Crème";
  names[1].dispatchEvent(new frame.contentWindow.Event("change"));
  const inputs = doc().querySelectorAll("[data-color]");
  inputs[1].value = "#eeeedd";
  inputs[1].dispatchEvent(new frame.contentWindow.Event("change"));
  click('[data-view="family"]');
  assert(doc().querySelectorAll(".delivery").length === 4);
});
await test("Associations JPEG : recommandations et forçage manuel", () => {
  change('[data-format="jpeg"]', true);
  assert(find('[data-section="jpeg"]'));
  const pair = find('[data-global-pair="black:jpeg:black"]');
  assert(!pair.checked);
  pair.checked = true;
  pair.dispatchEvent(new frame.contentWindow.Event("change"));
  assert(find('[data-global-pair="black:jpeg:black"]').checked);
  assert(find("#selection-count").textContent.includes("fichiers"));
});
await test("Catégories repliables et sélection", async () => {
  click('[data-section="multi"]>summary');
  await wait(() => find('[data-section="multi"]').open);
  click('[data-bulk="multi:all"]');
  assert(
    find('[data-section="multi"]>summary').textContent.includes(
      "sélectionnées",
    ),
  );
  click('[data-bulk="multi:none"]');
  assert(
    find('[data-section="multi"]>summary').textContent.includes(
      "0 sélectionnées",
    ),
  );
});
await test("Rôles multicolores : nom, correction et verrou", async () => {
  click('[data-view="compose"]');
  const source = await (await fetch("./fixtures/multicolor.svg")).text();
  await upload('[data-upload="wordmark"]', [["multicolor.svg", source]]);
  change(
    '[data-role-asset="wordmark"][data-role-index="0"][data-role-field="name"]',
    "Texte principal QA",
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
  assert(
    find('[data-drag="wordmark"] path').getAttribute("fill") === "#005544",
  );
  click('[data-view="family"]');
  click('[data-section="multi"]>summary');
  // The section may already be open from the previous test; ensure it is expanded.
  if (!find('[data-section="multi"]').open)
    click('[data-section="multi"]>summary');
  await wait(() => find('[data-section="multi"] [data-work-select]'));
  assert(find('[data-section="multi"] svg path[fill="#005544"]'));
  change('[data-section="multi"] [data-work-select]', true);
  assert(find('[data-section="multi"] [data-work-select]').checked);
});
await test("Gradient : édition et sélection, sélection fichier par format", async () => {
  click('[data-section="gradient"]>summary');
  await wait(() => find("[data-gradient-edit]"));
  click("[data-gradient-edit]");
  assert(find("dialog[open]"));
  find('dialog input[name="from"]').value = "#123456";
  find('dialog input[name="to"]').value = "#abcdef";
  find('dialog input[name="angle"]').value = "45";
  click('dialog button[value="apply"]');
  await wait(() => !find("dialog"));
  change('[data-section="gradient"] [data-work-select]', true);
  click('[data-section="final"]>summary');
  change("#final-format", "svg");
  const before = parseInt(find("#selection-count").textContent, 10);
  change("[data-file-select]", false);
  assert(parseInt(find("#selection-count").textContent, 10) === before - 1);
  assert(!find("[data-file-select]").checked);
});
let downloaded;
await test("Export .binksy puis réimport : réglages préservés", async () => {
  const proto = frame.contentWindow.HTMLAnchorElement.prototype,
    original = proto.click;
  proto.click = function () {
    downloaded = { href: this.href, name: this.download };
  };
  click('[data-action="export-project"]');
  proto.click = original;
  assert(downloaded.name.endsWith(".binksy"));
  const json = await (await fetch(downloaded.href)).text();
  const data = JSON.parse(json);
  assert(data.version === 3);
  assert(data.jpegGlobal["black:jpeg:black"] === true);
  assert(data.assets.wordmark.roles[0].locked);
  assert(data.gradients.some((g) => g.from === "#123456" && g.angle === 45));
  assert(data.excludedFiles.length === 1);
  await upload("#project-file", [["roundtrip.binksy", json]]);
  assert(find("#brand").value === "Validation Logokit");
  click('[data-view="family"]');
  assert(find('[data-global-pair="black:jpeg:black"]').checked);
});
await test("Nouveau projet prêt : import multiple et nom personnalisé", async () => {
  click('[data-view="home"]');
  click('[data-mode="ready"]');
  change("#brand", "Prêt Logokit");
  await upload("#ready-files", [
    ["Compact.svg", icon],
    ["Signature.svg", word],
  ]);
  assert(doc().querySelectorAll("[data-remove-variant]").length === 2);
  change("#variant-name", "Compact personnalisé");
  change("#clear-reference", "brandmarkWidth");
  change("#clear-reference-value", "80");
  click('[data-multiplier="1.5"]');
  assert(find(".clear-value").textContent.includes("120.00"));
  assert(find("#stage").querySelector("svg"));
});
await test("Projet V1 importé et migré", async () => {
  const old = project();
  old.version = 1;
  old.brand = "Ancien projet";
  for (const c of Object.values(old.compositions)) {
    delete c.clearMultiplier;
    delete c.clearRef;
    c.clear = 2;
  }
  old.assets.icon = { svg: icon, name: "old-icon.svg" };
  old.assets.wordmark = { svg: word, name: "old-word.svg" };
  await upload("#project-file", [["ancien.binksy", JSON.stringify(old)]]);
  assert(find("#brand").value === "Ancien projet");
  assert(find('[data-multiplier="1"]').getAttribute("aria-pressed") === "true");
});
await test("Réouverture après rechargement et page agent", async () => {
  click('[data-view="home"]');
  assert(doc().body.textContent.includes("Prêt Logokit"));
  click('[data-view="agent"]');
  assert(doc().body.textContent.includes("Ne jamais choisir arbitrairement"));
  assert(doc().body.textContent.includes("3:1"));
  click('[data-view="home"]');
  await new Promise((resolve) => {
    frame.addEventListener("load", resolve, { once: true });
    frame.contentWindow.location.reload();
  });
  await wait(() => find('[data-mode="compose"]'));
  assert(doc().body.textContent.includes("Ancien projet"));
});
await test("Suppression avec confirmation puis annulation", async () => {
  const buttons = doc().querySelectorAll("[data-delete-project]"),
    count = doc().querySelectorAll("[data-open]").length;
  buttons[buttons.length - 1].click();
  assert(find("dialog[open]"));
  click('dialog button[value="cancel"]');
  await wait(() => !find("dialog"));
  assert(doc().querySelectorAll("[data-open]").length === count);
});
await test("Suppression confirmée du projet de test uniquement", async () => {
  click('[data-mode="compose"]');
  change("#brand", "PROJET JETABLE QA");
  click('[data-view="home"]');
  const opens = [...doc().querySelectorAll("[data-open]")],
    target = opens.findLast((x) => x.textContent.includes("PROJET JETABLE QA"));
  assert(target);
  click(`[data-delete-project="${target.dataset.open}"]`);
  click('dialog button[value="delete"]');
  await wait(() => !doc().querySelector("dialog"));
  assert(!find(`[data-open="${target.dataset.open}"]`));
});
await test("Écran portable 1024px : panneaux et canvas séparés", async () => {
  frame.style.width = "1024px";
  frame.style.height = "768px";
  doc()
    .querySelectorAll("[data-open]")
    [doc().querySelectorAll("[data-open]").length - 1].click();
  await wait(() => find("#stage"));
  const right = find(".right"),
    stage = find("#stage");
  right.scrollTop = 1000;
  assert(stage.getBoundingClientRect().top >= 0);
  assert(stage.getBoundingClientRect().bottom <= 768);
  assert(doc().documentElement.scrollWidth <= 1024);
});
await test("Petite largeur 390px : canvas maintenu au-dessus des propriétés", async () => {
  frame.style.width = "390px";
  frame.style.height = "844px";
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r)),
  );
  const stage = find("#stage"),
    right = find(".right");
  right.scrollTop = 1000;
  assert(
    stage.getBoundingClientRect().bottom <
      right.getBoundingClientRect().top + 1,
  );
  assert(stage.getBoundingClientRect().height > 70);
  assert(doc().documentElement.scrollWidth <= 390);
});
const summary = document.createElement("h2");
summary.textContent = `${results.children.length - failures}/${results.children.length} réussis`;
document.body.insertBefore(summary, frame);
document.title = `${failures ? "FAIL" : "PASS"} — UI LOGOKIT`;
