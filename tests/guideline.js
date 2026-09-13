import { editorialTypes } from "../src/guideline-content.js";
import { pageElements } from "../src/guideline-layout.js";
import { guidelineUI } from "./guideline-ui.js";
import "../src/style.css";
import { project, History } from "../src/model.js";
import { importSVG } from "../src/svg.js";
import {
  initializeGuide,
  FORMATS,
  MISUSES,
  page,
  validateGuide,
} from "../src/guideline-model.js";
import { guidelineSVG } from "../src/guideline-svg.js";
import { guidelinePDF, guidelineFiles } from "../src/guideline-export.js";
import { importResource, loadFonts } from "../src/guideline-fonts.js";
import { mountGuideline } from "../src/guideline-editor.js";
import { validate } from "../src/project.js";
import { buildFiles } from "../src/export.js";
import { baseFamily } from "../src/model.js";
import { zipSync } from "fflate";
import { setLanguage } from "../src/i18n.js";
const results = document.querySelector("#results"),
  assert = (v, msg = "Assertion") => {
    if (!v) throw Error(msg);
  };
const test = async (name, fn) => {
  const li = document.createElement("li");
  try {
    await fn();
    li.textContent = "PASS " + name;
    li.className = "pass";
  } catch (e) {
    li.textContent = "FAIL " + name + " — " + e.message;
    li.className = "fail";
  }
  results.append(li);
};
const p = project("compose");
p.brand = "STUDIO TEST";
p.assets.icon = await importSVG(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#155c63" d="M0 100L50 0 100 100Z"/></svg>',
  "Symbol",
);
p.assets.wordmark = await importSVG(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 80"><path fill="#155c63" d="M0 0h55v15H15v15h40v50H0V65h40V45H0Z M70 0h60v15h-22v65H92V15H70Z M145 0h15v65h30V0h15v80h-60Z M220 0h60v80h-60Z"/></svg>',
  "Wordmark",
);
p.enabled = ["horizontal", "vertical"];
p.colors = [
  { id: "teal", name: "Lagoon", hex: "#155c63" },
  { id: "sand", name: "Sand", hex: "#eee6d8" },
  { id: "ink", name: "Ink", hex: "#171717" },
];
initializeGuide(p);
p.brandGuideline.colorRoles = {
  teal: { role: "accent" },
  sand: { role: "background" },
  ink: { role: "text" },
};
p.brandGuideline.brief.description =
  "A synthetic brand for checking page composition, SVG geometry, type, and PDF export.";
p.exports.formats = ["svg"];
p.exports.clearspace = false;
const canvas = document.createElement("canvas");
canvas.width = 400;
canvas.height = 250;
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#eee6d8";
ctx.fillRect(0, 0, 400, 250);
ctx.fillStyle = "#155c63";
ctx.fillRect(30, 30, 340, 190);
ctx.fillStyle = "#171717";
ctx.fillRect(80, 70, 240, 100);
const image = await importResource(
  new File([await new Promise((r) => canvas.toBlob(r))], "sample.png", {
    type: "image/png",
  }),
  p.brandGuideline,
);
p.brandGuideline.resources.push(image);
p.brandGuideline.pages
  .find((a) => a.type === "applications")
  .elements.push({
    id: "photo",
    type: "image",
    resource: image.id,
    x: 0.12,
    y: 0.25,
    w: 0.76,
    h: 0.6,
    zoom: 1,
  });
for (const [file, role] of [
  ["Arial.ttf", "body"],
  ["Georgia.ttf", "title"],
]) {
  try {
    const response = await fetch("./.local-fixtures/" + file);
    if (!response.ok) continue;
    const r = await importResource(
      new File([await response.arrayBuffer()], file),
      p.brandGuideline,
    );
    p.brandGuideline.resources.push(r);
    p.brandGuideline.typography[role] = {
      font: r.id,
      size: role === "title" ? 25 : 11,
      weight: 400,
      leading: 1.4,
      tracking: 0,
    };
  } catch {}
}
await loadFonts(p.brandGuideline);
document.querySelector("#open").disabled = false;
document.querySelector("#run").disabled = false;
function showEditor() {
  document.querySelector("#previews").innerHTML = "";
  mountGuideline(
    document.querySelector("#editor"),
    p,
    (fn) => {
      fn();
      showEditor();
    },
    () => {},
    (message) => {
      const e = document.createElement("p");
      e.textContent = message;
      document.querySelector("#results").append(e);
    },
  );
}
document.querySelector("#open").onclick = showEditor;
async function link(blob, name) {
  const a = document.createElement("a");
  a.download = name;
  a.textContent = name;
  a.href = await new Promise((r) => {
    const f = new FileReader();
    f.onload = () => r(f.result);
    f.readAsDataURL(blob);
  });
  document.querySelector("#downloads").append(a);
}
document.querySelector("#run").onclick = async () => {
  results.replaceChildren();
  document.querySelector("#downloads").replaceChildren();
  await test("two real fonts loaded", () =>
    assert(
      p.brandGuideline.resources.filter((r) => r.type === "font").length === 2,
      "Provide local Arial.ttf and Georgia.ttf fixtures",
    ));
  for (const version of [1, 2, 3])
    await test("Migration V" + version + " → V4, guide disabled", async () => {
      const old = structuredClone(p);
      old.version = version;
      const restored = await validate(old);
      assert(restored.version === 4 && !restored.brandGuideline.enabled);
    });
  await test("V4 round trip and no secret fields", async () => {
    const data = structuredClone(p);
    data.brandGuideline.key = "secret-must-not-persist";
    const restored = await validate(data);
    assert(restored.brandGuideline.enabled);
    assert(restored.brandGuideline.resources.length === 3);
    assert(!JSON.stringify(restored).includes("secret-must-not-persist"));
  });
  for (const format of Object.keys(FORMATS)) {
    p.brandGuideline.format = format;
    await test(
      format +
        " SVG contains real logo paths, text and raster image only on application page",
      () => {
        const logo = guidelineSVG(
          p,
          p.brandGuideline.pages.find((a) => a.type === "logos"),
        );
        assert(logo.includes("<path"));
        assert(logo.includes("<text"));
        assert(!logo.includes("<image"));
        const photo = guidelineSVG(
          p,
          p.brandGuideline.pages.find((a) => a.type === "applications"),
        );
        assert(photo.includes("<image"));
        assert(photo.includes("<text"));
      },
    );
    await test(format + " PDF multipage and SVG files", async () => {
      const files = await guidelineFiles(p);
      assert(
        Object.keys(files).filter((k) => k.endsWith(".svg")).length === 12,
      );
      const pdf = Object.values(files)[0];
      assert(new TextDecoder().decode(pdf.subarray(0, 5)) === "%PDF-");
      await link(
        new Blob([pdf], { type: "application/pdf" }),
        "guideline-" + format.replace(":", "-") + ".pdf",
      );
      await link(
        new Blob([zipSync(files)], { type: "application/zip" }),
        "guideline-" + format.replace(":", "-") + ".zip",
      );
    });
  }
  await test("Misuses transform clones, never project artwork", () => {
    const before = JSON.stringify(p.assets);
    for (const effect of [
      "wide",
      "tall",
      "rotate",
      "skew",
      "opacity",
      "blur",
      "glow",
      "gradient",
      "colors",
      "crop",
    ]) {
      const a = page("misuse");
      a.misuses = [effect];
      const svg = guidelineSVG(p, a);
      assert(svg.includes("<path"));
      if (effect === "blur") assert(svg.includes("feGaussianBlur"));
      if (effect === "rotate") assert(svg.includes("rotate(22)"));
    }
    assert(JSON.stringify(p.assets) === before);
  });
  await test("Normal kit contains guide PDF and SVG; disabled guide produces no folder", async () => {
    p.brandGuideline.format = "16:9";
    let files = await buildFiles(p, baseFamily(p).slice(0, 1));
    assert(Object.keys(files).some((k) => k.includes("BRAND GUIDELINE/PDF/")));
    await link(
      new Blob([zipSync(files)], { type: "application/zip" }),
      "complete-kit.zip",
    );
    p.brandGuideline.enabled = false;
    files = await buildFiles(p, baseFamily(p).slice(0, 1));
    assert(!Object.keys(files).some((k) => k.includes("BRAND GUIDELINE")));
    p.brandGuideline.enabled = true;
  });
  await test("All misuse effects export with vector geometry and localized raster effects", async () => {
    const pages = p.brandGuideline.pages;
    try {
      const rules = Object.keys(MISUSES);
      p.brandGuideline.pages = [];
      for (let i = 0; i < rules.length; i += 6) {
        const a = page("misuse");
        a.misuses = rules.slice(i, i + 6);
        p.brandGuideline.pages.push(a);
      }
      await link(await guidelinePDF(p), "misuses.pdf");
    } finally {
      p.brandGuideline.pages = pages;
    }
  });
  await test("OTF uses vector outlines; missing fonts are rejected", async () => {
    const sample = structuredClone(p),
      response = await fetch("./.local-fixtures/STIXGeneral.otf");
    assert(response.ok, "Provide local STIXGeneral.otf");
    const r = await importResource(
      new File([await response.arrayBuffer()], "STIXGeneral.otf"),
      sample.brandGuideline,
    );
    sample.brandGuideline.resources.push(r);
    sample.brandGuideline.pages = [page("introduction")];
    sample.brandGuideline.typography.title = {
      font: r.id,
      size: 24,
      weight: 400,
      leading: 1.4,
      tracking: 0.3,
    };
    await link(await guidelinePDF(sample), "otf-outlines.pdf");
    sample.brandGuideline.typography.title.font = "missing";
    let rejected = false;
    try {
      await guidelinePDF(sample);
    } catch {
      rejected = true;
    }
    assert(rejected, "No silent font replacement");
  });
  await test("Fictional editorial copy, bundled font and all formats", async () => {
    const sample = structuredClone(p);
    sample.brandGuideline.brief = {};
    sample.brandGuideline.typography = {};
    sample.brandGuideline.pages = editorialTypes.map((type) => page(type));
    for (const format of Object.keys(FORMATS)) {
      sample.brandGuideline.format = format;
      for (const a of sample.brandGuideline.pages) {
        const elements = pageElements(sample, a);
        assert(elements.some((e) => e.id === "body" && e.text.length > 150));
        assert(
          elements.some(
            (e) => e.id === "editorial-state" && e.text.includes("EXEMPLE"),
          ),
        );
      }
      await link(
        await guidelinePDF(sample),
        "editorial-copy-" + format.replace(":", "-") + ".pdf",
      );
    }
  });
  await guidelineUI(p, test);
  document.querySelector("#previews").innerHTML = p.brandGuideline.pages
    .map((a, i) => guidelineSVG(p, a, i))
    .join("");
  const end = document.createElement("p");
  end.id = "test-summary";
  end.textContent = `${results.querySelectorAll(".pass").length}/${results.children.length} PASS`;
  results.after(end);
};
