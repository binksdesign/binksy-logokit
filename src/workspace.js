import { identity, arrow, esc, readyAssets, clearPanel } from "./ui.js";
import { layout, variantIds, variantName, clearMeasure } from "./model.js";
import { compositionSVG, assetMarkup } from "./svg.js";
import { rolePanel } from "./workshop.js";
import { t } from "./i18n.js";

export const steps = [
  ["import", "Importer"],
  ["compose", "Construire"],
  ["family", "Variantes"],
  ["delivery", "Exporter"],
];
export const hasArtwork = (p) =>
  p.mode === "ready"
    ? p.ready.length > 0
    : !!(p.assets.icon || p.assets.wordmark);
export function disclosure(id, label, body) {
  return `<details class="optional" data-disclosure="${id}"><summary>${t(label)}</summary>${body}</details>`;
}
function projectPanel(p, projects) {
  return `<section><label class="field"><span>${t("Nom de la marque")}</span><input id="brand" value="${esc(p.brand)}" maxlength="100"></label>${disclosure("project", "Gérer le projet", `<select id="projects" aria-label="${t("Projet actif")}">${projects.map((x) => `<option value="${esc(x.id)}" ${x.id === p.id ? "selected" : ""}>${esc(x.id === p.id ? p.brand : x.brand)}</option>`).join("")}</select><button data-action="new">${t("Nouveau projet")}</button><button data-action="import-project">${t("Importer .binksy")}</button>`)}</section>`;
}
function imports(p, font) {
  if (p.mode === "ready") return readyAssets(p);
  return `<section class="import-assets">${["icon", "wordmark"].map((key) => `<label class="asset" data-drop="${key}"><input type="file" accept=".svg,image/svg+xml" data-upload="${key}" aria-label="${t(key === "icon" ? "Importer le brandmark SVG" : "Importer le logotype SVG")}" hidden><span class="asset-label">${t(key === "icon" ? "Icône" : "Logotype")}${arrow}</span><div class="asset-preview">${p.assets[key] ? assetMarkup(p.assets[key], null, "import-" + key) : '<span class="upload-cross">+</span>'}</div><span class="asset-name" data-no-i18n>${p.assets[key] ? esc(p.assets[key].name) : t("Importer ou déposer un SVG")}</span></label>`).join("")}${disclosure("font", "Mon SVG contient du texte", `<p>${t("Chargez la police exacte avant le SVG. Les textes simples seront vectorisés.")}</p><label class="file-button">${t(font ? "Police chargée ✓" : "Charger OTF / TTF")}<input id="font" type="file" accept=".otf,.ttf" hidden></label>`)}</section>`;
}
function constructions(p) {
  return `<section class="construction-list"><h2>${t("Variantes du logo")}</h2>${variantIds(
    p,
  )
    .map(
      (v) =>
        `<div class="construction-choice ${p.active === v ? "active" : ""}"><button data-active="${v}" aria-pressed="${p.active === v}"><div class="choice-preview">${compositionSVG(p, v)}</div><span data-no-i18n>${esc(variantName(p, v))}</span></button><label><input type="checkbox" data-variant="${v}" aria-label="${t("Activer ") + esc(variantName(p, v))}" ${p.enabled.includes(v) ? "checked" : ""}>${t("Inclure")}</label></div>`,
    )
    .join("")}</section>`;
}
export function palettePanel(p) {
  return disclosure(
    "palette",
    "Personnaliser la palette",
    `<section><div class="section-title">${t("Palette")}<button data-action="add-color" aria-label="${t("Ajouter une couleur")}">+</button></div>${p.colors.map((col, i) => `<div class="color-row"><input type="color" aria-label="${t("Couleur")} ${i + 1}" data-color="${col.id}" value="${col.hex}"><input aria-label="${t("Nom de couleur")}" data-color-name="${col.id}" value="${esc(col.name)}"><button data-move="${i}" ${!i ? "disabled" : ""} aria-label="${t("Monter la couleur")}">↑</button><button data-delete="${col.id}" aria-label="${t("Supprimer")}">×</button><input class="hex" aria-label="HEX" data-color-hex="${col.id}" value="${col.hex}" maxlength="7"></div>`).join("")}</section>`,
  );
}
function properties(p, number, selected) {
  const c = p.compositions[p.active],
    l = layout(p);
  const advanced = `<section><div class="segmented">${l.parts.map((q) => `<button data-element="${q.key}" aria-pressed="${selected === q.key}">${t(q.key === "icon" ? "Icône" : "Logotype")}</button>`).join("")}</div>${p.mode === "ready" ? "" : number("Position X", selected + "X", c[selected + "X"], -10, 10, 0.01, "X") + number("Position Y", selected + "Y", c[selected + "Y"], -10, 10, 0.01, "X")}${l.parts
    .filter((q) => q.key !== "ready")
    .map(
      (q) =>
        `<label class="field"><span>${t(q.key === "icon" ? "Largeur du brandmark · px" : "Largeur du logotype · px")}</span><input data-width="${q.key}" type="number" min="1" max="100000" step="any" value="${q.w.toFixed(2)}"></label>`,
    )
    .join(
      "",
    )}<div class="canvas-expert">${["grid", "snap"].map((key, i) => `<label class="check"><input type="checkbox" data-setting="${key}" ${p[key] ? "checked" : ""}>${t(["Grille", "Snap"][i])}</label>`).join("")}<select id="zoom" aria-label="Zoom">${[0.5, 0.75, 1, 1.5, 2].map((n) => `<option value="${n}" ${n === 1 ? "selected" : ""}>${n * 100}%</option>`).join("")}</select></div><button data-action="reset">${t("Réinitialiser la composition")}</button></section>`;
  const visual = (key, values) =>
    `<div class="visual-options">${values
      .map(([value, label]) => {
        const draft = {
          ...p,
          compositions: {
            ...p.compositions,
            [p.active]: { ...c, [key]: value },
          },
        };
        return `<button data-${key}="${value}" aria-pressed="${c[key] === value}"><div>${compositionSVG(draft, p.active)}</div>${t(label)}</button>`;
      })
      .join("")}</div>`;
  const clear = clearMeasure(p).space
    ? `<div class="protection-preview">${protectionPreview(p)}</div>`
    : "";
  return `<section><h2 data-no-i18n>${esc(variantName(p, p.active))}</h2><p class="auto-note">${t("Prêt à utiliser · ajustements facultatifs")}</p>${p.mode === "ready" ? `<label class="field">${t("Nom de la variante")}<input id="variant-name" value="${esc(p.ready.find((v) => v.id === p.active)?.name || "")}" maxlength="100"></label>` : l.parts.map((q) => number(q.key === "icon" ? "Taille de l’icône" : "Taille du logotype", q.key + "Height", q.h, 1, 100000, 1, " px")).join("")}${
    p.mode !== "ready" && l.parts.length === 2
      ? number("Espacement", "gap", c.gap, 0, 5, 0.01, "X") +
        visual("align", [
          ["start", "Début"],
          ["center", "Centre"],
          ["end", "Fin"],
        ]) +
        visual("center", [
          ["real", "Centrage géométrique"],
          ["optical", "Centrage optique"],
        ])
      : ""
  }</section>${p.mode === "ready" ? "" : disclosure("composition", "Réglages avancés", advanced)}<section><h3>${t("Zone de protection")}</h3>${clear}${disclosure("clearspace", "Ajuster la protection", clearPanel(p))}<h3>${t("Tailles minimales")}</h3><div class="minimum-preview" style="max-width:${Math.min(c.minDigital, 240)}px">${compositionSVG(p, p.active)}</div><p>${c.minPrint} mm · ${c.minDigital} px</p>${disclosure("minimum", "Ajuster les tailles minimales", `<div class="two-fields"><label>Print · mm<input data-comp="minPrint" type="number" min="1" max="1000" value="${c.minPrint}"></label><label>Digital · px<input data-comp="minDigital" type="number" min="1" max="10000" value="${c.minDigital}"></label></div>`)}</section>`;
}
function protectionPreview(p) {
  const l = layout(p),
    s = clearMeasure(p).space;
  return `<svg viewBox="${l.x - s} ${l.y - s} ${l.width + 2 * s} ${l.height + 2 * s}" xmlns="http://www.w3.org/2000/svg"><rect x="${l.x - s}" y="${l.y - s}" width="${l.width + 2 * s}" height="${l.height + 2 * s}" fill="#f1e7df"/><svg x="${l.x}" y="${l.y}" width="${l.width}" height="${l.height}" viewBox="${l.x} ${l.y} ${l.width} ${l.height}">${compositionSVG(p, p.active)}</svg></svg>`;
}
export function workspace(
  p,
  { view, projects, number, exportPanel, selected, font, history, busy },
) {
  const index = steps.findIndex(([id]) => id === view),
    ready = hasArtwork(p);
  const guidance = [
    "Importez votre logo. Binksy prépare la suite.",
    "Votre système prend forme. Ajustez seulement si nécessaire.",
    "Choisissez visuellement les versions à livrer.",
    "Votre Logo Kit est prêt à partir.",
  ][index];
  const left =
    view === "import"
      ? projectPanel(p, projects) + imports(p, font)
      : view === "compose"
        ? constructions(p)
        : view === "delivery"
          ? `<section><h2 data-no-i18n>${esc(p.brand)}</h2><p>${t("Votre sélection est conservée.")}</p><button data-view="family">${t("Revoir les variantes")}${arrow}</button></section>`
          : rolePanel(p) + palettePanel(p);
  const right =
    view === "import"
      ? `<section><h2>${t("Binksy prépare votre système")}</h2><p>${t("Les formes, couleurs et dégradés sont analysés dès l’import.")}</p><p class="auto-note">${t("Automatique · recommandé")}</p>${ready ? rolePanel(p) : ""}</section>`
      : view === "compose"
        ? properties(p, number, selected)
        : view === "delivery"
          ? `${disclosure("export", "Personnaliser l’export", exportPanel())}`
          : `<section><h2>${t("Votre sélection")}</h2><span id="selection-count" role="status"></span><p>${t("Les versions originales et les couleurs simples sont recommandées. Ajoutez les combinaisons qui vous plaisent.")}</p><button class="primary" data-view="delivery">${t("Continuer")}${arrow}</button></section>`;
  return `<header><div class="identity">${identity()}</div><nav aria-label="${t("Étapes du Logo Kit")}">${steps.map(([id, label], i) => `<button data-view="${id}" ${i && !ready ? "disabled" : ""} aria-current="${view === id ? "step" : "false"}" class="${view === id ? "active" : ""}"><small>0${i + 1}</small>${t(label)}</button>`).join("")}</nav><div class="header-actions"><button data-action="undo" aria-label="${t("Annuler")}" ${history.past.length ? "" : "disabled"}>↶</button><button data-action="redo" aria-label="${t("Rétablir")}" ${history.future.length ? "" : "disabled"}>↷</button><button data-action="export-project">${t("Sauvegarder .binksy")}</button></div></header><div class="workspace guided-workspace" data-step="${view}" data-mode="${p.mode}"><aside class="left">${left}</aside><main class="editor-main">${["import", "compose"].includes(view) ? `<div class="step-heading"><span class="eyebrow">0${index + 1} / ${t(steps[index][1])}</span><h1>${t(guidance)}</h1></div><div class="canvas-toolbar"><strong data-no-i18n>${esc(p.brand)}</strong><div class="canvas-colors"><button data-canvas="#ffffff" aria-label="${t("Canvas blanc")}">${t("Clair")}</button><button data-canvas="#000000" aria-label="${t("Canvas noir")}">${t("Sombre")}</button></div></div><div id="stage" class="stage"></div><div class="canvas-footer"><span id="measure"></span></div><div class="step-next"><span>${t("Prêt à utiliser · ajustements facultatifs")}</span><button class="primary" data-view="${view === "import" ? "compose" : "family"}" ${ready ? "" : "disabled"}>${t("Continuer")}${arrow}</button></div>` : '<div id="workshop"></div>'}</main><aside class="right" aria-label="${t("Propriétés")}" tabindex="0">${right}</aside></div><footer><span id="save-state">${t("Enregistré sur cet appareil")}</span><button data-view="agent">${t("Règles agent IA")}</button></footer><div id="notice" role="status" hidden></div><input id="project-file" type="file" accept=".json,.binksy" hidden>`;
}
