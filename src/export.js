import { jsPDF } from "jspdf";
import "svg2pdf.js";
import { zipSync, strToU8 } from "fflate";
import { compositionSVG, svgImage, mount } from "./svg";
import {
  layout,
  filename,
  slug,
  variantName,
  clearMeasure,
  jpegPairs,
} from "./model";
import { clearspaceSVG } from "./clearspace";
import { withResolution } from "./raster";
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function backgroundFor(p, item, format) {
  return format === "jpeg"
    ? item.background?.hex ||
        jpegPairs(p, item).find((x) => x.enabled)?.background.hex ||
        "#ffffff"
    : "transparent";
}
export async function renderFile(svg, format, options) {
  if (!["svg", "png", "jpeg", "pdf"].includes(format))
    throw Error("Format non pris en charge.");
  const root = new DOMParser().parseFromString(
    svg,
    "image/svg+xml",
  ).documentElement;
  const l = root.viewBox.baseVal;
  if (format === "svg") return new Blob([svg], { type: "image/svg+xml" });
  if (format === "pdf") {
    if (root.querySelector("filter,mask,pattern"))
      throw Error("PDF : effets complexes non pris en charge ; utilisez SVG.");
    const dispose = mount(root);
    try {
      const doc = new jsPDF({
        unit: "pt",
        format: [l.width, l.height],
        orientation: l.width > l.height ? "landscape" : "portrait",
        compress: true,
      });
      await doc.svg(root, { x: 0, y: 0, width: l.width, height: l.height });
      return doc.output("blob");
    } finally {
      dispose();
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext("2d");
  if (format === "jpeg") {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const margin = format === "jpeg" ? options.margin : 0;
  const scale = Math.min(
      canvas.width / (l.width + 2 * margin),
      canvas.height / (l.height + 2 * margin),
    ),
    w = l.width * scale,
    h = l.height * scale;
  ctx.drawImage(
    await svgImage(svg),
    (canvas.width - w) / 2,
    (canvas.height - h) / 2,
    w,
    h,
  );
  const blob = await new Promise((resolve) =>
    canvas.toBlob(
      resolve,
      format === "jpeg" ? "image/jpeg" : "image/png",
      0.96,
    ),
  );
  canvas.width = canvas.height = 1;
  if (!blob) throw Error("Mémoire insuffisante pour cet export.");
  return withResolution(blob, options.dpi);
}
export function makeFile(p, item, format) {
  return renderFile(compositionSVG(p, item.variant, item.color.hex), format, {
    ...p.exports,
    background: backgroundFor(p, item, format),
    margin:
      Math.min(layout(p, item.variant).width, layout(p, item.variant).height) *
      p.exports.jpegMargin,
  });
}
export function exportPlan(p, items) {
  const root = slug(p.brand).toUpperCase(),
    jobs = [];
  for (const item of items) {
    const formats = item.background
      ? ["jpeg"]
      : p.exports.formats.filter((f) => f !== "jpeg");
    for (const format of formats) {
      if (!p.exports.formats.includes(format)) continue;
      const category = format === "jpeg" ? "JPEG" : "Logos";
      const folder =
        p.exports.organization === "variant"
          ? `${slug(variantName(p, item.variant))}/${format.toUpperCase()}`
          : `${format.toUpperCase()}/${slug(variantName(p, item.variant))}`;
      jobs.push({
        item,
        format,
        path: `${root}/${category}/${format === "jpeg" ? slug(variantName(p, item.variant)) : folder}/${filename(p, item, format, backgroundFor(p, item, format))}`,
      });
    }
  }
  if (p.exports.clearspace) {
    const formats = p.exports.formats.filter((f) =>
      ["svg", "pdf", "png"].includes(f),
    );
    for (const variant of new Set(items.map((i) => i.variant)))
      for (const tone of ["light", "dark"])
        for (const format of formats.length ? formats : ["svg"]) {
          if (!clearMeasure(p, variant).space)
            throw Error(
              `Clearspace de « ${variantName(p, variant)} » : mesure de référence manquante.`,
            );
          jobs.push({
            variant,
            tone,
            format,
            path: `${root}/Clearspace/${slug(variantName(p, variant))}/${slug(p.brand)}-${slug(variantName(p, variant))}-clearspace-${tone === "light" ? "clair" : "fonce"}.${format}`,
          });
        }
  }
  const names = new Set();
  for (const job of jobs) {
    const base = job.path;
    let n = 2;
    while (names.has(job.path))
      job.path = base.replace(/\.[^.]+$/, `-${n++}.${job.format}`);
    names.add(job.path);
  }
  return jobs;
}
export async function buildFiles(p, items, progress = () => {}) {
  if (!items.length || !p.exports.formats.length)
    throw Error("Sélectionnez une déclinaison et un format.");
  const jobs = exportPlan(p, items);
  if (!jobs.length)
    throw Error(
      "Aucun fichier à exporter. Activez des associations JPEG ou un format transparent.",
    );
  if (jobs.length > 500) throw Error("Export limité à 500 fichiers par lot.");
  const files = {};
  let bytes = 0,
    index = 0;
  for (const job of jobs) {
    progress(`Export ${++index} / ${jobs.length}`);
    const blob = job.tone
      ? await renderFile(clearspaceSVG(p, job.variant, job.tone), job.format, {
          ...p.exports,
        })
      : await makeFile(p, job.item, job.format);
    bytes += blob.size;
    if (bytes > 256e6)
      throw Error("Lot supérieur à 256 Mo. Réduisez la sélection.");
    files[job.path] = new Uint8Array(await blob.arrayBuffer());
    await new Promise((r) => setTimeout(r, 0));
  }
  return files;
}
export async function exportFiles(p, items, progress) {
  const files = await buildFiles(p, items, progress);
  if (Object.keys(files).length === 1) {
    const [name, data] = Object.entries(files)[0];
    download(new Blob([data]), name.split("/").pop());
    return;
  }
  files[slug(p.brand).toUpperCase() + "/RECOMMANDATIONS.txt"] = strToU8(
    `BINKSY LOGOKIT — ${p.brand}\nSVG / PNG / PDF transparents. JPEG avec marge ${p.exports.jpegMargin} × petit côté du logo.\nContraste JPEG recommandé : ${p.exports.contrast}:1 (luminance sRGB). Couleurs RVB.\n\n` +
      [...new Set(items.map((i) => i.variant))]
        .map((v) => {
          const m = clearMeasure(p, v),
            c = p.compositions[v];
          return `${variantName(p, v)} : espace ${m.label} × ${m.multiplier} = ${m.space.toFixed(2)} unités ; minimum ${c.minPrint} mm / ${c.minDigital} px.`;
        })
        .join("\n"),
  );
  download(
    new Blob([zipSync(files, { level: 0 })], { type: "application/zip" }),
    slug(p.brand) + "-logokit.zip",
  );
}
export function jpegPreview(p, item) {
  const l = layout(p, item.variant),
    margin = Math.min(l.width, l.height) * p.exports.jpegMargin;
  const ratio = p.exports.width / p.exports.height;
  let w = l.width + 2 * margin,
    h = l.height + 2 * margin;
  if (w / h < ratio) w = h * ratio;
  else h = w / ratio;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${item.background.hex}"/><svg x="${(w - l.width) / 2}" y="${(h - l.height) / 2}" width="${l.width}" height="${l.height}" viewBox="${l.x} ${l.y} ${l.width} ${l.height}">${compositionSVG(p, item.variant, item.color.hex).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></svg>`;
}
