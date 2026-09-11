import { validate } from "../src/project";
import { clearspaceSVG } from "../src/clearspace";
import {
  project,
  layout,
  family,
  baseFamily,
  jpegPairs,
  clearMeasure,
  variantIds,
  contrast,
} from "../src/model";
import { importSVG, compositionSVG, svgImage, clean } from "../src/svg";
import { makeFile, buildFiles, exportPlan, renderFile } from "../src/export";
import { zipSync, unzipSync, strToU8 } from "fflate";
const results = document.querySelector("#results");
let failures = 0;
async function test(name, fn) {
  const li = document.createElement("li");
  results.append(li);
  try {
    await fn();
    li.textContent = "PASS · " + name;
    li.className = "pass";
  } catch (e) {
    li.textContent = "FAIL · " + name + " · " + e.message;
    li.className = "fail";
    failures++;
  }
}
function assert(condition, message = "Assertion échouée") {
  if (!condition) throw Error(message);
}
const p = project();
await test("Import icon SVG / couleurs / bounding box", async () => {
  p.assets.icon = await importSVG(
    await (await fetch("./fixtures/icon.svg")).text(),
    "icon.svg",
  );
  assert(p.assets.icon.box.width === 100);
  assert(
    p.assets.icon.paints.length === 1 && p.assets.icon.paints[0] === "#ff5500",
  );
  assert(p.assets.icon.centroid.x < 0.5);
});
await test("Import wordmark SVG / paths conservés", async () => {
  p.assets.wordmark = await importSVG(
    await (await fetch("./fixtures/wordmark.svg")).text(),
    "wordmark.svg",
  );
  assert(p.assets.wordmark.box.height === 100);
  assert(p.assets.wordmark.svg.includes("<path"));
});
await test("SVG sécurisé : scripts et ressources retirés", () => {
  const svg = clean(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect onclick="alert(1)" width="10" height="10"/></svg>',
  );
  assert(!svg.querySelector("script"));
  assert(!svg.querySelector("rect").hasAttribute("onclick"));
});
await test("Texte sans police : refus explicite", async () => {
  let rejected = false;
  try {
    await importSVG(
      '<svg xmlns="http://www.w3.org/2000/svg"><text y="20">Logo</text></svg>',
      "text.svg",
    );
  } catch {
    rejected = true;
  }
  assert(rejected);
});
for (const variant of ["horizontal", "vertical", "icon", "wordmark"])
  await test("Composition " + variant, () => {
    const svg = compositionSVG(p, variant);
    assert(
      !new DOMParser()
        .parseFromString(svg, "image/svg+xml")
        .querySelector("parsererror"),
    );
    assert(
      layout(p, variant).parts.length ===
        (["icon", "wordmark"].includes(variant) ? 1 : 2),
    );
  });
const item = family(p)[0];
await test("SVG : dimensions sans clear space et sans bitmap", async () => {
  p.compositions.horizontal.clear = 4;
  const str = await (await makeFile(p, item, "svg")).text();
  assert(str.includes('width="575"'));
  assert(!str.includes("<image"));
  document.querySelector("#preview").innerHTML = str;
  const img = await svgImage(str);
  assert(img.naturalWidth === 575);
});
await test("PNG : 3000 × 3000, transparence, contenu visible", async () => {
  const blob = await makeFile(p, item, "png");
  const img = await createImageBitmap(blob);
  assert(img.width === 3000 && img.height === 3000);
  const c = document.createElement("canvas");
  c.width = c.height = 3000;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  assert(ctx.getImageData(0, 0, 1, 1).data[3] === 0);
  assert(ctx.getImageData(10, 1200, 1, 1).data[3] > 0);
  img.close();
});
await test("JPEG : canvas réglable et fond opaque", async () => {
  p.exports.width = 800;
  p.exports.height = 600;
  const blob = await makeFile(p, item, "jpeg");
  assert(blob.type === "image/jpeg");
  const img = await createImageBitmap(blob);
  assert(img.width === 800 && img.height === 600);
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 600;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  assert(ctx.getImageData(0, 0, 1, 1).data[0] > 250);
  img.close();
});
await test("PDF vectoriel : signature, pas d’image", async () => {
  const text = await (await makeFile(p, item, "pdf")).text();
  assert(text.startsWith("%PDF"));
  assert(!text.includes("/Subtype /Image"));
  assert(text.includes("/MediaBox"));
});
await test("ZIP : fichiers et arborescence intacts", () => {
  const data = zipSync({
    "BINKSY/SVG/test.svg": strToU8(compositionSVG(p, "horizontal")),
  });
  const extracted = unzipSync(data);
  assert(extracted["BINKSY/SVG/test.svg"].length > 100);
});
await test("Projet JSON : sauvegarde / réouverture des assets", async () => {
  const copy = JSON.parse(JSON.stringify(p));
  const asset = await importSVG(copy.assets.icon.svg, "icon.svg");
  assert(asset.box.width === 100);
  assert(copy.compositions.horizontal.clear === 4);
});

await test("Contraste : toutes les couleurs sur tous les fonds, choix manuel", () => {
  p.colors = [
    { id: "corail", name: "Corail", hex: "#ff5500" },
    { id: "bleu", name: "Bleu", hex: "#2255aa" },
    { id: "creme", name: "Crème", hex: "#eeeedd" },
  ];
  p.exports.formats = ["svg", "jpeg"];
  assert(contrast("#000000", "#ffffff") === 21);
  const black = baseFamily(p).find((i) => i.color.id === "black");
  let pairs = jpegPairs(p, black);
  assert(pairs.length === 5);
  const forbidden = pairs.find((i) => i.background.id === "black");
  assert(!forbidden.enabled);
  p.jpegOverrides[forbidden.id] = true;
  assert(jpegPairs(p, black).find((i) => i.id === forbidden.id).enabled);
  assert(family(p).filter((i) => i.background).length > 4);
});
await test("JPEG : marges visibles et métadonnées 300 ppp", async () => {
  const item = family(p).find(
    (i) =>
      i.background && i.color.id === "black" && i.background.id === "white",
  );
  p.exports.width = 400;
  p.exports.height = 400;
  const blob = await makeFile(p, item, "jpeg");
  const data = new Uint8Array(await blob.arrayBuffer());
  const img = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 400;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  assert(ctx.getImageData(2, 200, 1, 1).data[0] > 245);
  assert(data[13] === 1 && data[14] * 256 + data[15] === 300);
  img.close();
});
await test("3 références clearspace × 4 multiplicateurs", () => {
  const c = p.compositions.horizontal;
  for (const ref of ["brandmarkWidth", "brandmarkHeight", "wordmarkHeight"])
    for (const mult of [0.5, 1, 1.5, 2]) {
      c.clearRef = ref;
      c.clearMultiplier = mult;
      const m = clearMeasure(p, "horizontal");
      assert(m.space === (ref === "wordmarkHeight" ? 100 : 125) * mult);
    }
});
await test("Clearspace clair et foncé : SVG / PNG / PDF transparents", async () => {
  for (const tone of ["light", "dark"]) {
    const svg = clearspaceSVG(p, "horizontal", tone);
    assert(svg.includes(tone === "light" ? "#ededed" : "#333333"));
    const png = await renderFile(svg, "png", {
      ...p.exports,
      width: 400,
      height: 400,
    });
    const img = await createImageBitmap(png);
    const c = document.createElement("canvas");
    c.width = c.height = 400;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    assert(ctx.getImageData(0, 0, 1, 1).data[3] === 0);
    assert(
      (await (await renderFile(svg, "pdf", p.exports)).text()).startsWith(
        "%PDF",
      ),
    );
    img.close();
  }
  document.querySelector("#preview").innerHTML = clearspaceSVG(
    p,
    "horizontal",
    "dark",
  );
});
await test("Ancien projet V1 : migration du clearspace et des formats", async () => {
  const old = structuredClone(p);
  old.version = 1;
  delete old.mode;
  old.exports.formats = ["svg", "eps"];
  for (const c of Object.values(old.compositions)) {
    delete c.clearRef;
    delete c.clearMultiplier;
    c.clear = 3;
  }
  const restored = await validate(old);
  assert(restored.version === 3);
  assert(restored.compositions.horizontal.clearMultiplier === 1.5);
  assert(!restored.exports.formats.includes("eps"));
  assert(restored.assets.wordmark.box.height === 100);
});
await test("Variantes prêtes : références, noms et projet .binksy conservés", async () => {
  const ready = project("ready");
  ready.ready = [
    { id: "v-compact", name: "Compacte", asset: p.assets.icon },
    { id: "v-custom", name: "Signature", asset: p.assets.wordmark },
  ];
  ready.enabled = ["v-compact", "v-custom"];
  ready.active = "v-compact";
  for (const v of ready.ready) {
    ready.compositions[v.id] = structuredClone(
      project().compositions.horizontal,
    );
    ready.compositions[v.id].references = {
      wordmarkHeight: 30,
      brandmarkWidth: 50,
      brandmarkHeight: 80,
    };
    ready.compositions[v.id].clearMultiplier = 1.5;
  }
  ready.colors = p.colors;
  ready.jpegOverrides = { "v-compact:black:jpeg:white": false };
  const restored = await validate(JSON.parse(JSON.stringify(ready)));
  assert(variantIds(restored).length === 2);
  assert(layout(restored).width === 100);
  assert(clearMeasure(restored).space === 45);
  assert(restored.jpegOverrides["v-compact:black:jpeg:white"] === false);
  assert(restored.ready[1].name === "Signature");
});
await test("ZIP final : logos / JPEG / Clearspace, sans doublons", async () => {
  p.exports.formats = ["svg", "jpeg"];
  p.exports.width = p.exports.height = 100;
  p.compositions.horizontal.clearRef = "wordmarkHeight";
  p.compositions.horizontal.clearMultiplier = 0.5;
  const items = family(p).filter(
    (i) => i.variant === "horizontal" && i.color.id === "black",
  );
  const files = await buildFiles(p, items);
  const names = Object.keys(unzipSync(zipSync(files)));
  assert(names.some((n) => n.includes("/WEB/SVG/")));
  assert(names.some((n) => n.includes("/JPEG/")));
  assert(names.filter((n) => n.includes("/CLEARSPACE/")).length === 2);
  assert(new Set(names).size === names.length);
});
document.title = `${failures ? "FAIL" : "PASS"} — Tests BINKSY`;
const summary = document.createElement("h2");
summary.textContent = `${results.children.length - failures}/${results.children.length} réussis`;
document.body.append(summary);
