import opentype from "opentype.js";
import { uid } from "./guideline-model.js";
const loaded = new Map(),
  parsed = new Map();
export function resourceBytes(r) {
  return Uint8Array.from(atob(r.data.split(",")[1]), (c) => c.charCodeAt(0));
}
export function parsedFont(r) {
  if (!parsed.has(r.id))
    parsed.set(r.id, opentype.parse(resourceBytes(r).buffer));
  return parsed.get(r.id);
}
let bundledFont = null,
  bundledPromise = null;
export function fontResources(g) {
  return [
    ...(bundledFont ? [bundledFont] : []),
    ...g.resources.filter((r) => r.type === "font"),
  ];
}
export function fontsReady(g) {
  return (
    !!bundledFont &&
    fontResources(g).every((r) => loaded.has(r.id)) &&
    Object.values(g.typography).every(
      (s) =>
        !s.font ||
        g.resources.some((r) => r.id === s.font && r.type === "font"),
    )
  );
}
async function loadBundledFont() {
  if (!bundledPromise)
    bundledPromise = (async () => {
      const response = await fetch("/fonts/InstrumentSans.ttf");
      if (!response.ok) throw Error("Police du document indisponible.");
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      bundledFont = {
        id: "binksy-instrument-sans",
        name: "Instrument Sans",
        family: "Instrument Sans",
        type: "font",
        format: "ttf",
        weight: 400,
        data: "data:font/ttf;base64," + btoa(binary),
      };
    })();
  try {
    await bundledPromise;
  } catch (error) {
    bundledPromise = null;
    throw error;
  }
}
export async function loadFonts(g) {
  await loadBundledFont();
  for (const r of fontResources(g)) {
    if (loaded.has(r.id)) continue;
    try {
      const face = new FontFace("bg-" + r.id, resourceBytes(r), {weight: String(r.weight || 400)});
      await face.load();
      document.fonts.add(face);
      loaded.set(r.id, face);
      parsedFont(r);
    } catch {
      throw Error("Police illisible : " + r.name);
    }
  }
  for (const role of Object.values(g.typography))
    if (
      role.font &&
      !g.resources.some((r) => r.id === role.font && r.type === "font")
    )
      throw Error("Police manquante. Importez la police exacte.");
}
export async function importResource(file, g) {
  if (file.size > 8e6) throw Error("Fichier limité à 8 Mo.");
  const ext = file.name.split(".").pop().toLowerCase(),
    type = ["ttf", "otf"].includes(ext) ? "font" : "image";
  if (!["ttf", "otf", "png", "jpg", "jpeg", "webp"].includes(ext))
    throw Error("Format non pris en charge.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const mime =
      type === "font"
        ? "font/" + ext
        : "image/" + (ext === "jpg" ? "jpeg" : ext),
    data = "data:" + mime + ";base64," + btoa(binary);
  const existing = g.resources.find((r) => r.data === data);
  if (existing) return existing;
  if (g.resources.length >= 60)
    throw Error("Ressources limitées à 60 fichiers.");
  if (g.resources.reduce((n, r) => n + r.data.length, 0) + data.length > 24e6)
    throw Error("Ressources limitées à 18 Mo.");
  const r = { id: uid(), name: file.name, type, data, format: ext };
  if (type === "font") {
    const font = parsedFont(r);
    if (font.tables.os2?.fsType & 2)
      throw Error("Cette police interdit l’incorporation.");
    r.family =
      font.names.windows?.preferredFamily?.en || font.names.macintosh?.preferredFamily?.en || font.names.preferredFamily?.en ||
      font.names.windows?.fontFamily?.en ||
      font.names.macintosh?.fontFamily?.en ||
      font.names.fontFamily?.en ||
      file.name.replace(/\.(ttf|otf)$/i, "");
    r.weight = font.tables.os2?.usWeightClass || 400;
  } else {
    const img = new Image();
    img.src = data;
    await img.decode();
    if (img.width * img.height > 40e6)
      throw Error("Image limitée à 40 mégapixels.");
    r.width = img.width;
    r.height = img.height;
  }
  return r;
}
export function fontFor(g, e) {
  const id = e.font ?? g.typography[e.role]?.font ?? g.typography.body?.font;
  return id ? fontResources(g).find((r) => r.id === id) : bundledFont;
}

export function fontFamily(resource) {
  const names = parsedFont(resource).names;
  return (
    names.windows?.preferredFamily?.en || names.macintosh?.preferredFamily?.en || names.preferredFamily?.en ||
    names.windows?.fontFamily?.en ||
    names.macintosh?.fontFamily?.en ||
    names.fontFamily?.en ||
    resource.family ||
    resource.name.replace(/\.(ttf|otf)$/i, "")
  );
}

// Match the FR/EN document's plain-text glyphs without opentype.js' partial GSUB engine.
// This does not alter the font. Optional ligatures are disabled in the SVG renderer too.
export function fontRun(resource, text, size, tracking = 0) {
  const font = parsedFont(resource),
    glyphs = Array.from(String(text).normalize("NFC"), (c) =>
      font.charToGlyph(c),
    ),
    scale = size / font.unitsPerEm;
  let x = 0;
  const placements = glyphs.map((glyph, i) => {
    if (i) x += font.getKerningValue(glyphs[i - 1], glyph) * scale + tracking;
    const placement = { glyph, x };
    x += (glyph.advanceWidth || 0) * scale;
    return placement;
  });
  return { width: x, placements, font };
}
