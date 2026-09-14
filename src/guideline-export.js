import { paginateMinimumPages } from "./guideline-minimum.js";
import { jsPDF } from "jspdf";
import "svg2pdf.js";
import { zipSync, strToU8 } from "fflate";
import {
  guidelineSVG,
  fittedText,
  textMetrics,
} from "./guideline-svg.js";
import { pageElements } from "./guideline-layout.js";
import { dimensions } from "./guideline-theme.js";
import { loadFonts } from "./guideline-fonts.js";
import { slug } from "./model.js";
import { mount } from "./svg.js";
export function exportWarnings(p, format) {
  const g = p.brandGuideline,
    w = [];
  if (
    format !== "svg" &&
    g.resources.some((r) => r.type === "font" && r.format === "otf")
  )
    w.push("Les textes sont vectorisés dans le PDF avec les polices du document.");
  if (format !== "pdf" && g.exports.text === "text")
    w.push("Les SVG avec texte nécessitent les polices originales.");
  if (
    format !== "svg" &&
    g.pages.some((page) =>
      page.misuses?.some((x) => ["blur", "glow"].includes(x)),
    )
  )
    w.push("Flou et lueur : exemples seuls convertis en images dans le PDF.");
  return w;
}
export function validateLayout(p) {
  const g = p.brandGuideline,
    { width: W, height: H } = dimensions(g);
  for (const [index, page] of g.pages.filter(a=>!a.disabled).entries())
    for (const element of pageElements(p, page, index)) {
      const e = element.type === "text" ? fittedText(element, g) : element;
      if (
        e.x < -0.1 ||
        e.y < -0.1 ||
        e.w <= 0 ||
        e.h <= 0 ||
        e.x + e.w > W + 0.1 ||
        e.y + e.h > H + 0.1
      )
        throw Error("Élément hors page : " + (index + 1) + ".");
      if (
        e.type === "text" &&
        textMetrics(e,g).height >
          e.h + 0.1
      )
        throw Error(
          "Texte trop long sur la page " +
            (index + 1) +
            ". Agrandissez son bloc ou raccourcissez le texte.",
        );
    }
}
async function effectImage(root) {
  // Filters are rasterized only inside their demonstration, never at page level.
  for (const group of [...root.querySelectorAll("g")].filter((g) =>
    g.querySelector(":scope > defs > filter"),
  )) {
    const parent = group.parentNode,
      box = group.getBBox(),
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const pad = 20;
    svg.setAttribute(
      "viewBox",
      `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`,
    );
    svg.setAttribute("width", (box.width + pad * 2) * 2);
    svg.setAttribute("height", (box.height + pad * 2) * 2);
    const artwork = group.cloneNode(true);
    artwork.removeAttribute("transform");
    svg.append(artwork);
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: "image/svg+xml",
      }),
    );
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = (box.width + pad * 2) * 2;
      c.height = (box.height + pad * 2) * 2;
      c.getContext("2d").drawImage(img, 0, 0);
      if (
        !c
          .getContext("2d")
          .getImageData(0, 0, c.width, c.height)
          .data.some((value, index) => index % 4 === 3 && value > 0)
      )
        throw Error("Effet PDF vide. Exportez les pages SVG.");
      const placed = document.createElementNS(svg.namespaceURI, "image");
      placed.setAttribute("href", c.toDataURL("image/png"));
      if (group.hasAttribute("transform"))
        placed.setAttribute("transform", group.getAttribute("transform"));
      placed.setAttribute("x", box.x - pad);
      placed.setAttribute("y", box.y - pad);
      placed.setAttribute("width", box.width + pad * 2);
      placed.setAttribute("height", box.height + pad * 2);
      parent.replaceChild(placed, group);
      c.width = c.height = 1;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
async function externalizeImageData(root) {
  const urls = [];
  for (const image of root.querySelectorAll("image")) {
    const href = image.getAttribute("href") || image.getAttribute("xlink:href");
    if (!href?.startsWith("data:image/")) continue;
    const blob = await (await fetch(href)).blob();
    const url = URL.createObjectURL(blob);
    urls.push(url);
    image.setAttribute("href", url);
    image.removeAttribute("xlink:href");
  }
  return () => urls.forEach((url) => URL.revokeObjectURL(url));
}
export async function guidelinePDF(p) {
  p = {...p,brandGuideline:{...p.brandGuideline,pages:paginateMinimumPages(p).filter(a=>!a.disabled)}};
  const g = p.brandGuideline;
  if (!g.pages.length) throw Error("Ajoutez une page.");
  await loadFonts(g);
  validateLayout(p);
  const { width: W, height: H } = dimensions(g),
    doc = new jsPDF({
      unit: "pt",
      format: [W, H],
      orientation: W > H ? "landscape" : "portrait",
      compress: true,
    });
  for (let i = 0; i < g.pages.length; i++) {
    if (i) doc.addPage([W, H], W > H ? "landscape" : "portrait");
    const root = new DOMParser().parseFromString(
      guidelineSVG(p, g.pages[i], i, { editor: true, paths: true }),
      "image/svg+xml",
    ).documentElement;
    const dispose = mount(root);
    let releaseImages = () => {};
    try {
      await effectImage(root);
      // svg2pdf parses data URLs with one large regular expression. Real-world
      // embedded images can overflow that parser's call stack, so feed it Blob
      // URLs while keeping the source project and SVG exports unchanged.
      releaseImages = await externalizeImageData(root);
      if (root.querySelector("filter,mask,pattern"))
        throw Error(
          "PDF : effet du logo non pris en charge. Exportez les SVG.",
        );
      await doc.svg(root, { x: 0, y: 0, width: W, height: H });
    } finally {
      releaseImages();
      dispose();
    }
  }
  return doc.output("blob");
}
export async function guidelineFiles(
  p,
  {
    pdf = p.brandGuideline.exports.pdf,
    svg = p.brandGuideline.exports.svg,
  } = {},
) {
  p={...p,brandGuideline:{...p.brandGuideline,pages:paginateMinimumPages(p)}};
  const g = p.brandGuideline;
  if (!g.enabled || p.mode === "clearspace") return {};
  await loadFonts(g);
  const root = slug(p.brand).toUpperCase() + " LOGOKIT/BRAND GUIDELINE",
    files = {};
  if (pdf)
    files[root + "/PDF/" + slug(p.brand) + "-brand-guidelines.pdf"] =
      new Uint8Array(await (await guidelinePDF(p)).arrayBuffer());
  if (svg)
    g.pages.filter(a=>!a.disabled).forEach((page, i) => {
      files[
        `${root}/SVG/${String(i + 1).padStart(2, "0")}-${slug(page.title || page.type)}.svg`
      ] = strToU8(
        guidelineSVG(p, page, i, {
          paths: g.exports.text === "paths",
          portable: true,
        }),
      );
    });
  return files;
}
export async function standaloneSVG(p) {
  return new Blob(
    [
      zipSync(
        await guidelineFiles(
          { ...p, brandGuideline: { ...p.brandGuideline, enabled: true } },
          { pdf: false, svg: true },
        ),
        { level: 6 },
      ),
    ],
    { type: "application/zip" },
  );
}
