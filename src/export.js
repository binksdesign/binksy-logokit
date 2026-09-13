import {
  rasterTargets,
  bitmapRect,
  paletteText,
  normalizeFormats,
  framing,
} from "./export-formats.js";
import { t } from "./i18n.js";
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
  const margin = format === "jpeg" ? options.margin || 0 : 0;
  const occupancy =
    options.scale ??
    Math.min(
      l.width / (l.width + 2 * margin),
      l.height / (l.height + 2 * margin),
    );
  const rect = bitmapRect(
    canvas.width,
    canvas.height,
    l.width,
    l.height,
    occupancy,
  );
  ctx.drawImage(await svgImage(svg), rect.x, rect.y, rect.width, rect.height);
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
export function makeFile(p, item, format, target = {}) {
  return renderFile(compositionSVG(p, item.variant, item.color), format, {
    ...p.exports,
    ...target,
    background: backgroundFor(p, item, format),
    margin:
      Math.min(layout(p, item.variant).width, layout(p, item.variant).height) *
      p.exports.jpegMargin,
  });
}
export function exportPlan(p, items, includeExcluded = false) {
  const root = slug(p.brand).toUpperCase() + " LOGOKIT",
    jobs = [];
  for (const item of p.mode === "clearspace" ? [] : items) {
    const formats = item.background
      ? ["jpeg"]
      : p.exports.formats.filter((f) => f !== "jpeg");
    for (const format of formats) {
      if (!p.exports.formats.includes(format)) continue;
      const targets = ["png", "jpeg"].includes(format)
        ? rasterTargets(p.exports, item.variant)
        : [{ destination: format === "pdf" ? "PRINT" : "WEB" }];
      for (const target of targets) {
        const folder = `${root}/LOGOS/${safeFolder(variantName(p, item.variant))}/${target.destination}`;
        const suffix = target.id
          ? `-${target.kind === "use" ? slug(target.name) + "-" : ""}${p.naming.pattern.includes("{size}") ? "" : target.width + "x" + target.height}`.replace(
              /-$/,
              "",
            )
          : "";
        const name = filename(
          { ...p, exports: { ...p.exports, ...target } },
          item,
          format,
          backgroundFor(p, item, format),
        ).replace(/\.[^.]+$/, suffix + "." + format);
        jobs.push({
          item,
          format,
          target,
          path: `${folder}/${target.destination === "WEB" ? format.toUpperCase() + "/" : ""}${name}`,
        });
      }
    }
  }
  if (p.exports.clearspace || p.mode === "clearspace") {
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
            path: `${root}/CLEARSPACE/${safeFolder(variantName(p, variant))}/${slug(p.brand)}-${slug(variantName(p, variant))}-clearspace-${tone === "light" ? "clair" : "fonce"}.${format}`,
          });
        }
  }
  const names = new Set();
  for (const job of jobs) {
    job.key = job.item
      ? `${job.item.id}:${job.format}${job.target?.id ? ":" + job.target.destination + ":" + job.target.id : ""}`
      : `${job.variant}:clearspace:${job.tone}:${job.format}`;
    const base = job.path;
    let n = 2;
    while (names.has(job.path))
      job.path = base.replace(/\.[^.]+$/, `-${n++}.${job.format}`);
    names.add(job.path);
  }
  return includeExcluded
    ? jobs
    : jobs.filter(
        (job) =>
          !p.excludedFiles?.includes(job.key) &&
          !(
            job.item &&
            p.excludedFiles?.includes(`${job.item.id}:${job.format}`)
          ) &&
          !p.excludedFiles?.includes(job.path),
      );
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
      : await makeFile(p, job.item, job.format, job.target);
    bytes += blob.size;
    if (bytes > 256e6)
      throw Error("Lot supérieur à 256 Mo. Réduisez la sélection.");
    files[job.path] = new Uint8Array(await blob.arrayBuffer());
    await new Promise((r) => setTimeout(r, 0));
  }
  if (p.brandGuideline?.enabled && p.mode !== "clearspace") {
    const { guidelineFiles } = await import("./guideline-export.js");
    Object.assign(files, await guidelineFiles(p));
    if (Object.keys(files).length > 500 || Object.values(files).reduce((n, x) => n + x.byteLength, 0) > 256e6) throw Error("Lot supérieur aux limites d’export.");
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
  files[slug(p.brand).toUpperCase() + " LOGOKIT/RECOMMANDATIONS.txt"] = strToU8(
    `BINKSY LOGOKIT — ${p.brand}\n${p.mode === "clearspace" ? t("Planches de zone de sécurité transparentes. Couleurs d’origine du logo conservées.") : t("SVG / PNG / PDF transparents. JPEG avec fond. Cadrage centré partagé par format. Couleurs RVB.")}\n\n` +
      [...new Set(items.map((i) => i.variant))]
        .map((v) => {
          const m = clearMeasure(p, v),
            c = p.compositions[v];
          return `${variantName(p, v)} · ${t("Zone de sécurité")} : X = ${m.label} · ${m.multiplier}X = ${m.space.toFixed(2)} ${t("unités")}${p.mode === "clearspace" ? "" : ` ; minimum ${c.minPrint} mm / ${c.minDigital} px`}.`;
        })
        .join("\n") +
      "\n\nPALETTE\n\n" +
      paletteText(p.colors) +
      "\n\nCMJN : approximation sans profil ICC. / CMYK: approximation without ICC profile.\nWEB : 72 DPI · PRINT : 300 DPI\n",
  );
  download(
    new Blob([zipSync(files, { level: 0 })], { type: "application/zip" }),
    slug(p.brand) + "-logokit.zip",
  );
}
export function jpegPreview(p, item, target) {
  const l = layout(p, item.variant),
    f = target || normalizeFormats(p.exports).selected.find(f => f.kind === "web") || {
      width: p.exports.width,
      height: p.exports.height,
    };
  const r = bitmapRect(
    f.width,
    f.height,
    l.width,
    l.height,
    framing(p.exports, f.id, item.variant),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f.width} ${f.height}"><rect width="${f.width}" height="${f.height}" fill="${item.background.hex}"/><svg x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" viewBox="${l.x} ${l.y} ${l.width} ${l.height}">${compositionSVG(p, item.variant, item.color).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></svg>`;
}

function safeFolder(name) {
  return (
    String(name)
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, "-")
      .replace(/^\.+$/, "logo")
      .trim() || "Logo"
  );
}
