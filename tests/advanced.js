import { importSVG, compositionSVG, assetMarkup } from "../src/svg.js";
import { project, layout, jpegPairs, History } from "../src/model.js";
import {
  catalog,
  selectedItems,
  selectedCount,
  setCategory,
  deliveries,
} from "../src/catalog.js";
import { shade, gradientOptions, restoreRoles } from "../src/paints.js";
import { validate } from "../src/project.js";
import { makeFile, exportPlan, buildFiles } from "../src/export.js";
import { clearspaceSVG } from "../src/clearspace.js";
import { setLanguage, t, language } from "../src/i18n.js";
import { zipSync, unzipSync } from "fflate";
const output = document.querySelector("#results"),
  lines = [];
const assert = (v, m = "Assertion") => {
  if (!v) throw Error(m);
};
async function test(name, fn) {
  try {
    await fn();
    lines.push("PASS " + name);
  } catch (e) {
    lines.push("FAIL " + name + " — " + e.stack);
  }
  output.textContent = lines.join("\n");
}
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100">${body}</svg>`;
const rect = (x, color) =>
  `<rect x="${x}" width="90" height="100" fill="${color}"/>`;
const gradient = `<defs><linearGradient id="fade" x1="20%" y1="30%" x2="90%" y2="100%"><stop offset="0" stop-color="#ff5500" stop-opacity=".7"/><stop offset="1" stop-color="#0055ff"/></linearGradient></defs>`;
const cases = {
  A: svg(rect(0, "#000000")),
  B: svg(rect(0, "#ffffff")),
  C: svg(rect(0, "#ff5500")),
  D: svg(rect(0, "#000000") + rect(100, "#ff5500")),
  E: svg(rect(0, "#000000") + rect(100, "#ff5500") + rect(200, "#0055ff")),
  F: svg(gradient + rect(0, "url(#fade)")),
  G: svg(
    gradient +
      rect(0, "url(#fade)") +
      rect(100, "#000000") +
      rect(200, "#ff5500"),
  ),
  H: svg(rect(0, "#ff5500") + rect(100, "#ff5500")),
  I: svg(
    '<path d="M10 10H200V90H10Z" fill="#000000" stroke="#ff5500" stroke-width="4"/>',
  ),
};
const assets = {};
for (const [key, source] of Object.entries(cases))
  await test("SVG " + key, async () => {
    const a = (assets[key] = await importSVG(source, key));
    assert(a.roles.length > 0);
    assert(!a.svg.includes("<image"));
    assert(
      new DOMParser()
        .parseFromString(assetMarkup(a, null, "test"), "image/svg+xml")
        .querySelector("parsererror") === null,
    );
  });
let p = project();
p.assets.icon = assets.A;
p.assets.wordmark = assets.D;
p.colors = [
  { id: "orange", name: "Orange", hex: "#ff5500" },
  { id: "blue", name: "Blue", hex: "#0055ff" },
  { id: "green", name: "Green", hex: "#008844" },
];
await test("Dimensions indépendantes et historique", () => {
  const c = p.compositions.horizontal,
    a = layout(p).parts[0].h;
  c.wordmarkHeight = 233;
  assert(layout(p).parts[0].h === a);
  c.iconHeight = 177;
  assert(layout(p).parts[1].h === 233);
  assert(layout(p).X === 116.5);
  const h = new History();
  h.push(p);
  c.iconHeight = 199;
  p = h.undo(p);
  assert(layout(p).parts[0].h === 177);
  p = h.redo(p);
  assert(layout(p).parts[0].h === 199);
});
await test("Rôles bicolores / trois couleurs / regroupement", () => {
  assert(assets.D.roles.length === 2);
  assert(assets.E.roles.length === 3);
  assert(assets.H.roles.length === 1 && assets.H.roles[0].targets.length === 2);
  assert(
    assets.I.roles.some((r) => r.targets.some((t) => t.prop === "stroke")),
  );
});
await test("Correction, séparation, verrouillage", () => {
  const a = structuredClone(assets.H),
    r = a.roles[0];
  a.roles = r.targets.map((target, i) => ({
    ...r,
    id: "split-" + i,
    targets: [target],
    locked: i === 0,
  }));
  a.roles[0].paint = "#00ff00";
  const xml = new DOMParser().parseFromString(
    assetMarkup(a, "#000000"),
    "image/svg+xml",
  );
  const rects = xml.querySelectorAll("rect");
  assert(rects[0].getAttribute("fill") === "#00ff00");
  assert(rects[1].getAttribute("fill") === "#000000");
  const fresh = structuredClone(assets.H);
  restoreRoles(fresh, a.roles);
  assert(fresh.roles.length === 2 && fresh.roles[0].locked);
});
await test("Gradient importé intact, stops et namespace", () => {
  const a = assets.F,
    xml = new DOMParser().parseFromString(
      assetMarkup(a, null, "hello"),
      "image/svg+xml",
    );
  const g = xml.querySelector("linearGradient");
  assert(g.getAttribute("x1") === "20%");
  assert(g.querySelector("stop").getAttribute("stop-opacity") === "0.7");
  const fill = xml.querySelector("rect").getAttribute("fill");
  assert(fill.includes(g.id));
  assert(xml.querySelectorAll("stop").length === 2);
});
await test("Gradient généré vectoriel et stroke", () => {
  const markup = assetMarkup(
    assets.I,
    { gradient: { from: "#ff5500", to: "#0055ff", angle: 45 } },
    "gen",
  );
  const xml = new DOMParser().parseFromString(markup, "image/svg+xml");
  const g = xml.querySelector("linearGradient"),
    path = xml.querySelector("path");
  assert(path.getAttribute("fill").includes(g.id));
  assert(path.getAttribute("stroke").includes(g.id));
  assert(!markup.includes("<image"));
});
await test("Toutes les combinaisons, sans doublons de peintures", () => {
  p.enabled = ["horizontal"];
  const c = catalog(p, "horizontal", "multi");
  assert(c.size === 19n, "5² - 5 monochromes - 1 original");
  const signatures = new Set();
  for (let i = 0n; i < c.size; i++) {
    const item = c.at(i),
      sig = JSON.stringify(item.color.mapping);
    assert(!signatures.has(sig));
    signatures.add(sig);
  }
  assert(c.at(c.size) === null);
});
await test("Pagination avec 5^30 possibilités", () => {
  const q = structuredClone(p);
  q.assets.wordmark.roles = Array.from({ length: 30 }, (_, i) => ({
    id: "r" + i,
    paint: "#123456",
    locked: false,
    targets: [],
  }));
  q.assets.icon.roles = [];
  const start = performance.now(),
    c = catalog(q, "horizontal", "multi");
  assert(c.size === 5n ** 30n - 5n);
  assert(c.at(c.size - 1n));
  assert(performance.now() - start < 100);
});
await test("Sélection globale, individuelle et clairsemée", () => {
  setCategory(p, p.enabled, ["original", "mono", "multi", "gradient"], "none");
  assert(selectedItems(p).length === 0);
  setCategory(p, p.enabled, ["multi"], "all");
  assert(selectedCount(p, "horizontal", "multi") === 19n);
  assert(selectedItems(p).length === 19);
  setCategory(p, p.enabled, ["multi"], "none");
  const item = catalog(p, "horizontal", "multi").at(3n);
  p.colorSelection[item.id] = true;
  p.selectedDescriptors = { [item.id]: item };
  assert(selectedItems(p).length === 1);
});
await test("Gradients palette, clair, foncé", () => {
  const g = gradientOptions(p);
  assert(g.length === 12);
  assert(g.some((x) => x.from === "#ff5500" && x.to === "#0055ff"));
  assert(/^#[0-9a-f]{6}$/.test(shade("#ff5500", 0.16)));
  assert(shade("#ff5500", 0.16) !== shade("#ff5500", -0.16));
});
await test("JPEG global entre constructions", () => {
  p.jpegGlobal = { "white:jpeg:black": false };
  for (const variant of ["horizontal", "vertical", "icon", "wordmark"])
    assert(
      !jpegPairs(p, {
        id: variant + ":white",
        variant,
        color: { id: "white", hex: "#ffffff" },
      }).find((x) => x.background.id === "black").enabled,
    );
  p.jpegGlobal["white:jpeg:black"] = true;
  assert(
    jpegPairs(p, {
      id: "vertical:white",
      variant: "vertical",
      color: { id: "white", hex: "#ffffff" },
    }).find((x) => x.background.id === "black").enabled,
  );
});
await test("Migration V2 conserve la géométrie", async () => {
  const old = structuredClone(p);
  old.version = 2;
  for (const c of Object.values(old.compositions)) {
    delete c.iconHeight;
    delete c.wordmarkHeight;
    c.iconSize = 3;
    c.wordSize = 2;
  }
  const reopened = await validate(old);
  assert(reopened.version === 3);
  assert(
    reopened.compositions.horizontal.iconHeight === assets.D.box.height * 3,
  );
  assert(
    reopened.compositions.horizontal.wordmarkHeight === assets.D.box.height * 2,
  );
});
await test("V3 .binksy conserve rôles, verrous, dimensions, gradients, choix", async () => {
  p.assets.wordmark.roles[1].locked = true;
  p.gradients = [
    {
      id: "g-custom",
      name: "Custom",
      from: "#123456",
      to: "#abcdef",
      angle: 35,
    },
  ];
  p.locale = "en";
  const again = await validate(JSON.parse(JSON.stringify(p)));
  assert(again.assets.wordmark.roles[1].locked);
  assert(
    again.compositions.horizontal.iconHeight ===
      p.compositions.horizontal.iconHeight,
  );
  assert(again.gradients[0].angle === 35);
  assert(
    JSON.stringify(again.colorSelection) === JSON.stringify(p.colorSelection),
  );
  assert(again.jpegGlobal["white:jpeg:black"]);
  assert(again.locale === "en");
  p.assets.wordmark.roles[1].locked = false;
});
await test("Clearspace monochrome même avec rôle verrouillé", () => {
  p.assets.wordmark.roles[1].locked = true;
  const xml = new DOMParser().parseFromString(
    clearspaceSVG(p, "horizontal", "dark"),
    "image/svg+xml",
  );
  assert(
    ![...xml.querySelectorAll("rect")].some(
      (x) => x.getAttribute("fill") === "#ff5500",
    ),
  );
  p.assets.wordmark.roles[1].locked = false;
});
await test("Exports SVG PNG JPEG PDF et ZIP", async () => {
  p.exports = {
    ...p.exports,
    formats: ["svg", "png", "jpeg", "pdf"],
    width: 128,
    height: 128,
    clearspace: true,
  };
  const item = catalog(p, "horizontal", "multi").at(2n);
  const before = compositionSVG(p, item.variant, item.color);
  for (const f of ["svg", "png", "jpeg", "pdf"]) {
    const blob = await makeFile(p, item, f);
    assert(blob.size > 50);
    if (f === "png" || f === "jpeg") {
      const img = await createImageBitmap(blob),
        canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      assert(f === "png" ? pixel[3] === 0 : pixel[3] === 255);
    }
  }
  const items = deliveries(p, [item]),
    jobs = exportPlan(p, items),
    files = await buildFiles(p, items);
  assert(Object.keys(files).length === jobs.length);
  assert(Object.keys(unzipSync(zipSync(files))).length === jobs.length);
  assert(Object.keys(files).some((x) => x.includes("/Clearspace/")));
  assert(before === compositionSVG(p, item.variant, item.color));
});
await test("PDF avec gradient importé et généré", async () => {
  const q = project("ready");
  q.ready = [{ id: "v-test", name: "Gradient", asset: assets.G }];
  q.active = "v-test";
  q.compositions["v-test"] = { ...q.compositions.horizontal };
  q.enabled = ["v-test"];
  for (const color of [
    { id: "original", hex: null },
    { id: "g-test", gradient: { from: "#ff5500", to: "#0055ff" } },
  ])
    assert((await makeFile(q, { variant: "v-test", color }, "pdf")).size > 100);
});
await test("Alpha des fill et stops préservé", async () => {
  const a = await importSVG(
    svg('<rect width="90" height="100" fill="rgba(255,85,0,.4)"/>'),
    "alpha",
  );
  for (const color of [null, "#0055ff"]) {
    const xml = new DOMParser().parseFromString(
      assetMarkup(a, color),
      "image/svg+xml",
    );
    assert(xml.querySelector("rect").getAttribute("fill").includes("0.4"));
  }
  const xml = new DOMParser().parseFromString(
    assetMarkup(a, { gradient: { from: "#ff5500", to: "#0055ff" } }),
    "image/svg+xml",
  );
  assert(+xml.querySelector("rect").getAttribute("fill-opacity") === 0.4);
});
await test("Sélection fichier et planche conservée dans .binksy", async () => {
  const item = catalog(p, "horizontal", "original").at(0n),
    items = deliveries(p, [item]),
    jobs = exportPlan(p, items);
  const path = jobs.find((j) => j.tone)?.key;
  assert(path);
  p.excludedFiles = [path];
  assert(exportPlan(p, items).length === jobs.length - 1);
  assert(exportPlan(p, items, true).length === jobs.length);
  const again = await validate(JSON.parse(JSON.stringify(p)));
  assert(again.excludedFiles.includes(path));
  p.excludedFiles = [];
});
await test("FR / EN", () => {
  setLanguage("en");
  assert(language() === "en");
  assert(t("Propriétés") === "Properties");
  setLanguage("fr");
  assert(t("Propriétés") === "Propriétés");
});
output.textContent =
  lines.join("\n") +
  `\n\n${lines.filter((l) => l.startsWith("PASS")).length}/${lines.length} PASS`;
document.querySelector("#previews").innerHTML = Object.entries(assets)
  .map(
    ([k, a]) =>
      `<figure style="display:inline-block;width:260px;background:#ccc"><figcaption>Cas ${k}</figcaption>${assetMarkup(a, null, "case-" + k)}</figure>`,
  )
  .join("");
