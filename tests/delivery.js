import { project, clearMeasure } from "../src/model.js";
import { importSVG, compositionSVG } from "../src/svg.js";
import { exportPlan, buildFiles } from "../src/export.js";
import { catalog } from "../src/catalog.js";
import { validate } from "../src/project.js";
import { updateGradient } from "../src/gradient.js";
const out = document.querySelector("#results");
let failures = 0;
const assert = (v, m) => {
  if (!v) throw Error(m);
};
async function test(name, fn) {
  try {
    await fn();
    out.textContent += "PASS " + name + "\n";
  } catch (e) {
    failures++;
    out.textContent += "FAIL " + name + " " + e.stack + "\n";
  }
}
const p = project();
p.brand = "Delivery QA";
p.enabled = ["icon"];
p.exports.clearspace = false;
p.assets.icon = await importSVG(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="200" height="100" fill="#ff5500"/></svg>',
);
p.colors = [{ id: "orange", name: "Orange", hex: "#ff5500" }];
p.exports.rasterFormats = ["web-1000", "profile", "custom-test"];
p.exports.customFormats = [
  { id: "custom-test", name: "Test cadrage", width: 240, height: 120 },
];
p.exports.framing = { "web-1000": 0.6, profile: 0.4, "custom-test": 0.5 };
const item = catalog(p, "icon", "original").at(0),
  items = [
    item,
    { ...item, id: item.id + ":jpeg:white", background: { hex: "#ffffff" } },
  ];
await test("Destinations et exclusions sans ambiguïté", () => {
  const jobs = exportPlan(p, items);
  assert(jobs.length === 10, "10 jobs expected: " + jobs.length);
  assert(
    jobs.every((j) => j.path.startsWith("DELIVERY-QA LOGOKIT/LOGOS/Icône/")),
    "root",
  );
  for (const j of jobs) {
    assert(!j.path.includes("/WEB/") || j.target.kind !== "use", "use in web");
    assert(
      !j.path.includes("/CAS D’USAGE/") || j.target.kind === "use",
      "size in use",
    );
  }
  assert(new Set(jobs.map((j) => j.key)).size === jobs.length, "unique keys");
  const key = jobs.find(
    (j) => j.target.id === "web-1000" && j.target.destination === "PRINT",
  ).key;
  p.excludedFiles = [key];
  assert(exportPlan(p, items).length === 9, "target exclusion");
  p.excludedFiles = [];
});
await test("Pixels PNG/JPEG, vrais DPI 72/300, marges centrées", async () => {
  const jobs = exportPlan(p, items),
    files = await buildFiles(p, items);
  for (const j of jobs.filter((j) => ["png", "jpeg"].includes(j.format))) {
    const bytes = files[j.path],
      { width, height, scale, dpi } = j.target;
    let density;
    if (j.format === "png") {
      const dv = new DataView(bytes.buffer);
      let i = 8;
      while (i < bytes.length) {
        const n = dv.getUint32(i),
          type = String.fromCharCode(...bytes.slice(i + 4, i + 8));
        if (type === "pHYs") density = Math.round(dv.getUint32(i + 8) * 0.0254);
        i += n + 12;
      }
    } else {
      for (let i = 2; i < bytes.length - 16;) {
        const n = bytes[i + 2] * 256 + bytes[i + 3];
        if (
          bytes[i + 1] === 224 &&
          String.fromCharCode(...bytes.slice(i + 4, i + 9)) === "JFIF\0"
        ) {
          assert(bytes[i + 11] === 1, "inch unit");
          density = bytes[i + 12] * 256 + bytes[i + 13];
          break;
        }
        if (bytes[i + 1] === 218) break;
        i += n + 2;
      }
    }
    assert(density === dpi, `${j.path}: DPI ${density}`);
    const image = await createImageBitmap(
      new Blob([bytes], { type: "image/" + j.format }),
    );
    assert(
      image.width === width && image.height === height,
      "pixel dimensions",
    );
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    let minX = width,
      maxX = 0,
      minY = height,
      maxY = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        if (j.format === "png" ? pixels[i + 3] > 128 : pixels[i + 1] < 180) {
          minX = Math.min(x, minX);
          maxX = Math.max(x, maxX);
          minY = Math.min(y, minY);
          maxY = Math.max(y, maxY);
        }
      }
    assert(Math.abs((minX + maxX + 1) / 2 - width / 2) < 2, "center x");
    assert(Math.abs((minY + maxY + 1) / 2 - height / 2) < 2, "center y");
    assert(
      Math.abs(maxX - minX + 1 - Math.min(width, height * 2) * scale) < 4,
      "occupancy",
    );
    image.close();
  }
});
await test("Migration formats personnalisés et cadrages partagés", async () => {
  const q = await validate(JSON.parse(JSON.stringify(p)));
  assert(q.exports.framing.profile === 0.4, "profile");
  assert(q.exports.framing["web-1000"] === 0.6, "standard");
  assert(q.exports.customFormats[0].name === "Test cadrage", "name");
  assert(exportPlan(q, items).length === 10, "restored jobs");
});
await test("Dégradé tracé, opacité zéro, formes exclues et synchronisation", async () => {
  p.assets.icon = await importSVG(
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="80" height="50" fill="#ff5500" stroke="#000000" stroke-width="4"/><rect x="100" width="80" height="50" fill="#ff5500"/></svg>',
  );
  p.assets.wordmark = p.assets.icon;
  p.enabled = ["icon", "horizontal"];
  const target = p.assets.icon.roles
    .flatMap((r) => r.targets)
    .find((t) => t.prop === "fill");
  updateGradient(p, {
    id: "g-test",
    name: "Test",
    from: "#ff0000",
    to: "#0000ff",
    mode: "global",
    paint: "stroke",
    strokeOpacity: 0,
    excludedTargets: [],
  });
  const render = () =>
    new DOMParser().parseFromString(
      compositionSVG(p, "icon", { gradient: p.gradients[0] }),
      "image/svg+xml",
    );
  let svg = render();
  assert(svg.querySelector('[stroke-opacity="0"]'), "zero stroke opacity");
  assert(!svg.querySelector('[fill^="url"]'), "fill intact");
  updateGradient(p, {
    ...p.gradients[0],
    paint: "fill",
    excludedTargets: [`icon:${target.index}:fill`],
  });
  svg = render();
  assert(svg.querySelector('[fill="#ff5500"]'), "excluded solid");
  assert(svg.querySelector('[fill^="url"]'), "included gradient");
  const q = await validate(JSON.parse(JSON.stringify(p)));
  assert(
    q.gradients[0].excludedTargets[0] === `icon:${target.index}:fill`,
    "exclusion persistence",
  );
  assert(
    catalog(q, "horizontal", "gradient").at(0).color.gradient ===
      catalog(q, "icon", "gradient").at(0).color.gradient,
    "shared identity",
  );
});
await test("Clearspace X1 et arborescence sans sous-dossiers", () => {
  p.compositions.icon.clearMethod = "visual";
  p.compositions.icon.visualMeasure = { value: 24, label: "X1" };
  p.compositions.icon.clearMultiplier = 1;
  p.exports.clearspace = true;
  assert(clearMeasure(p, "icon").space === 24, "X1");
  assert(
    exportPlan(p, [item])
      .filter((j) => j.tone)
      .every(
        (j) =>
          j.path.split("/").length === 4 &&
          j.path.includes("/CLEARSPACE/Icône/"),
      ),
    "flat clearspace",
  );
});
await test("Legacy selected automatic gradients become explicit definitions", async () => {
  const old = JSON.parse(JSON.stringify(p));
  delete old.exports.rasterFormats;
  old.gradients = [];
  old.selectedDescriptors = {};
  old.colorSelection = { "icon:gradient": true };
  const q = await validate(old);
  assert(q.gradients.length === 2, "preserved lighter/darker choices");
  assert(
    q.gradients.every((g) => g.id.startsWith("g-orange-")),
    "stable identifiers",
  );
  old.colorSelection = {};
  assert(
    (await validate(old)).gradients.length === 0,
    "no new automatic suggestions",
  );
});
out.textContent += `DONE ${failures} failures`;
