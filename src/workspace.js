import { identity, arrow, esc, readyAssets, clearPanel } from "./ui.js";
import { layout, variantIds, variantName, isReadyVariant } from "./model.js";
import { compositionSVG, assetMarkup } from "./svg.js";
import { rolePanel } from "./workshop.js";
import { t } from "./i18n.js";

export const steps = [
  ["import", "Importer"],
  ["compose", "Assembler le logo"],
  ["family", "Versions du logo"],
  ["delivery", "Exporter"],
  ["guideline", "Brand Guideline"],
];
export const hasArtwork = (p) =>
  p.mode !== "compose"
    ? p.ready.length > 0
    : !!(p.assets.icon || p.assets.wordmark || p.ready?.length);
export function disclosure(id, label, body) {
  return `<details open class="optional" data-disclosure="${id}"><summary>${t(label)}</summary>${body}</details>`;
}
function projectPanel(p, projects) {
  return `<section><label class="field"><span>${t("Nom de la marque")}</span><input id="brand" value="${esc(p.brand)}" maxlength="100"></label>${disclosure("project", "Gérer le projet", `<select id="projects" aria-label="${t("Projet actif")}">${projects.map((x) => `<option value="${esc(x.id)}" ${x.id === p.id ? "selected" : ""}>${esc(x.id === p.id ? p.brand : x.brand)}</option>`).join("")}</select><button data-action="new">${t("Nouveau projet")}</button><button data-action="import-project">${t("Importer .binksy")}</button>`)}</section>`;
}
function imports(p, font) {
  if (p.mode !== "compose") return readyAssets(p);
  return `<section class="import-assets">${["icon", "wordmark"].map((key) => `<label class="asset" data-drop="${key}"><input type="file" accept=".svg,image/svg+xml" data-upload="${key}" aria-label="${t(key === "icon" ? "Importer le brandmark SVG" : "Importer le logotype SVG")}" hidden><span class="asset-label">${t(key === "icon" ? "Icône" : "Logotype")}${arrow}</span><div class="asset-preview">${p.assets[key] ? assetMarkup(p.assets[key], null, "import-" + key) : '<span class="upload-cross">+</span>'}</div><span class="asset-name" data-no-i18n>${p.assets[key] ? esc(p.assets[key].name) : t("Importer ou déposer un SVG")}</span></label>`).join("")}${disclosure("font", "Mon SVG contient du texte", `<p>${t("Chargez la police exacte avant le SVG. Les textes simples seront vectorisés.")}</p><label class="file-button">${t(font ? "Police chargée ✓" : "Charger OTF / TTF")}<input id="font" type="file" accept=".otf,.ttf" hidden></label>`)}</section>${readyAssets(p)}`;
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
  return `<section class="palette-panel"><h2>${t("Palette de couleurs")}</h2><div><button data-ai-recommendation="colorNames">${t("Recommandation de l’IA")} · ${t("Noms des couleurs")}</button><button data-ai-recommendation="colorRoles">${t("Recommandation de l’IA")} · ${t("Rôles des couleurs")}</button></div><div class="palette-swatches">${p.colors.map((col) => `<button class="palette-swatch" data-edit-color="${esc(col.id)}" style="--swatch:${col.hex}" aria-label="${esc(col.name)} · ${col.hex}" title="${esc(col.name)} · ${col.hex}"><span data-no-i18n>${esc(col.name)}</span></button>`).join("")}<button class="palette-add" data-action="add-color">+ ${t("Ajouter une couleur")}</button></div></section>`;
}
function properties(p, number, selected, inspector) {
  const c = p.compositions[p.active],
    l = layout(p);
  const advanced = `<section><div class="segmented">${l.parts.map((q) => `<button data-element="${q.key}" aria-pressed="${selected === q.key}">${t(q.key === "icon" ? "Icône" : "Logotype")}</button>`).join("")}</div>${isReadyVariant(p) || p.mode !== "compose" ? "" : number("Position X", selected + "X", c[selected + "X"], -10, 10, 0.01, "X") + number("Position Y", selected + "Y", c[selected + "Y"], -10, 10, 0.01, "X")}${l.parts
    .filter((q) => q.key !== "ready")
    .map(
      (q) =>
        `<label class="field"><span>${t(q.key === "icon" ? "Largeur du brandmark · px" : "Largeur du logotype · px")}</span><input data-width="${q.key}" type="number" min="1" max="100000" step="any" value="${q.w.toFixed(2)}"></label>`,
    )
    .join(
      "",
    )}<button data-action="reset">${t("Réinitialiser la composition")}</button></section>`;
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
  const tabs =
    p.mode === "compose" && !isReadyVariant(p)
      ? [
          ["composition", "Composition"],
          ["position", "Position"],
          ["guides", "Guides"],
          ["more", "Tailles minimales"],
        ]
      : [
          ["guides", "Zone de sécurité"],
          ["more", "Tailles minimales"],
        ];
  if (p.mode === "clearspace" || !tabs.some(([id]) => id === inspector))
    inspector = "guides";
  const minimum = `<section><h3>${t("Tailles minimales")}</h3><div class="minimum-preview" style="max-width:${Math.min(c.minDigital, 240)}px">${compositionSVG(p, p.active)}</div><div class="two-fields"><label>Print · mm<input data-comp="minPrint" type="number" min="1" max="1000" value="${c.minPrint}"></label><label>Digital · px<input data-comp="minDigital" type="number" min="1" max="10000" value="${c.minDigital}"></label></div></section>`;
  const composition = `<section>${l.parts
    .filter((q) => q.key !== "ready")
    .map((q) =>
      number(
        q.key === "icon" ? "Taille de l’icône" : "Taille du logotype",
        q.key + "Height",
        q.h,
        1,
        100000,
        1,
        " px",
      ),
    )
    .join("")}${
    p.mode === "compose" && !isReadyVariant(p) && l.parts.length === 2
      ? number("Espacement", "gap", c.gap, 0, 5, 0.01, "X") +
        visual("align", [
          ["start", "Début"],
          ["center", "Centre"],
          ["end", "Fin"],
        ]) +
        visual("center", [
          ["real", "Centrage exact"],
          ["optical", "Centrage visuel"],
        ])
      : ""
  }</section>`;
  const guides = `<section><div class="canvas-expert">${["grid", "snap"].map((key, i) => `<label class="check"><input type="checkbox" data-setting="${key}" ${p[key] ? "checked" : ""}>${t(["Grille", "Magnétisme"][i])}</label>`).join("")}</div>${clearPanel(p)}</section>`;
  return `<section class="inspector-title"><h2 data-no-i18n>${esc(variantName(p, p.active))}</h2>${isReadyVariant(p) || p.mode !== "compose" ? `<label class="field">${t("Nom de la version")}<input id="variant-name" value="${esc(p.ready.find((v) => v.id === p.active)?.name || "")}" maxlength="100"></label>` : ""}</section><div class="inspector-tabs" role="tablist" aria-label="${t("Réglages de la version")}">${tabs
    .filter(([id]) => p.mode !== "clearspace" || id === "guides")
    .map(
      ([id, label]) =>
        `<button role="tab" data-inspector="${id}" aria-selected="${inspector === id}" tabindex="${inspector === id ? 0 : -1}">${t(label)}</button>`,
    )
    .join(
      "",
    )}</div><div class="inspector-content" role="tabpanel">${inspector === "composition" ? composition : inspector === "position" ? advanced : inspector === "guides" ? guides : minimum + (isReadyVariant(p) ? "" : `<section><button data-action="reset">${t("Réinitialiser la composition")}</button></section>`)}</div>`;
}

export function workspace(
  p,
  {
    view,
    projects,
    number,
    exportPanel,
    selected,
    font,
    history,
    busy,
    inspector,
    focus,
  },
) {
  const route =
    p.mode === "clearspace"
      ? steps
          .filter(([id]) => !["family", "guideline"].includes(id))
          .map(([id, label]) => [
            id,
            id === "compose" ? "Zone de sécurité" : label,
          ])
      : steps;
  const index = steps.findIndex(([id]) => id === view),
    ready = hasArtwork(p);
  const guidance =
    view === "import"
      ? "Importez votre logo"
      : p.mode === "clearspace"
        ? "Définissez la zone de sécurité"
        : "Assemblez votre logo";
  const left =
    view === "import"
      ? projectPanel(p, projects) +
        imports(p, font) +
        (p.mode === "clearspace" ? "" : palettePanel(p))
      : view === "compose"
        ? constructions(p)
        : "";
  const right =
    view === "compose" && ready
      ? properties(p, number, selected, inspector) + `<section><h2>${t("Recommandation de l’IA")}</h2><button data-ai-recommendation="clearspace">${t("Zone de sécurité")}</button><button data-ai-recommendation="minimum">${t("Taille minimale")}</button></section>`
      : view === "delivery"
        ? disclosure("export", "Personnaliser l’export", exportPanel()) + (p.mode!=="clearspace"?`<section><h2>Brand Guideline</h2><p>${t(p.brandGuideline.enabled?"Guide inclus dans le kit":"Guide non inclus")}${p.brandGuideline.enabled?` · ${p.brandGuideline.pages.length} ${t("pages")}`:""}</p><button data-view="guideline">${t("Modifier le guide")}</button></section>`:"")
        : view === "family"
          ? `<section><h2>${t("Votre sélection")}</h2><strong class="selected-versions" role="status"></strong><span id="selection-count" role="status"></span><button class="primary" data-view="delivery">${t("Préparer l’export")}${arrow}</button></section>${disclosure("logo-colors", "Modifier les couleurs du logo", rolePanel(p))}${disclosure("palette", "Palette de couleurs", palettePanel(p))}`
          : "";
  const next =
    view === "import"
      ? "compose"
      : p.mode === "clearspace"
        ? "delivery"
        : "family";
  const nextLabel =
    view === "import"
      ? p.mode === "clearspace"
        ? "Définir la zone de sécurité"
        : "Choisir les versions"
      : p.mode === "clearspace"
        ? "Préparer l’export"
        : "Choisir les couleurs";
  return `<header><div class="identity">${identity()}</div><nav aria-label="${t("Étapes du Logo Kit")}">${route.map(([id, label], i) => `<button data-view="${id}" ${i && !ready ? "disabled" : ""} aria-current="${view === id ? "step" : "false"}" class="${view === id ? "active" : ""}"><small>0${i + 1}</small>${t(label)}</button>`).join("")}</nav><div class="header-actions">${view === "guideline" ? `<button class="ai-launcher" data-ai-assistant><span aria-hidden="true">✦</span> ${t("Assistant IA")}</button>` : ""}<button data-action="undo" aria-label="${t("Annuler")}" ${history.past.length ? "" : "disabled"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter" aria-hidden="true"><path d="m9 4-5 5 5 5M4 9h15v11"/></svg></button><button data-action="redo" aria-label="${t("Rétablir")}" ${history.future.length ? "" : "disabled"}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="miter" aria-hidden="true"><path d="m15 4 5 5-5 5M20 9H5v11"/></svg></button><button data-action="export-project">${t("Sauvegarder .binksy")}</button></div></header><div class="workspace guided-workspace ${focus ? "focus-mode" : ""}" data-step="${view}" data-mode="${p.mode}">${left ? `<aside class="left">${left}</aside>` : ""}<main class="editor-main">${["import", "compose"].includes(view) ? `<div class="step-heading"><span class="eyebrow">0${index + 1} / ${t(view === "compose" && p.mode === "clearspace" ? "Zone de sécurité" : steps[index][1])}</span><h1>${t(guidance)}</h1></div><div class="canvas-toolbar"><strong data-no-i18n>${esc(p.brand)}</strong><div class="canvas-colors">${view === "compose" ? `<button data-action="focus" aria-pressed="${focus}">${t(focus ? "Afficher les panneaux" : "Mode focus")}</button><select id="zoom" aria-label="Zoom">${[0.5, 0.75, 1, 1.5, 2].map((n) => `<option value="${n}" ${n === 1 ? "selected" : ""}>${n * 100}%</option>`).join("")}</select>` : ""}<button data-canvas="#ffffff" aria-label="${t("Canvas blanc")}">${t("Clair")}</button><button data-canvas="#000000" aria-label="${t("Canvas noir")}">${t("Sombre")}</button></div></div><div id="stage" class="stage"></div><div class="canvas-footer"><span id="measure"></span></div><div class="step-next"><span data-no-i18n>${esc(variantName(p, p.active))}</span><button class="primary" data-view="${next}" ${ready ? "" : "disabled"}>${t(nextLabel)}${arrow}</button></div>` : '<div id="workshop"></div>'}</main>${right ? `<aside class="right" aria-label="${t("Propriétés")}" tabindex="0">${right}</aside>` : ""}</div><footer><span id="save-state">${t("Enregistré sur cet appareil")}</span><button data-view="agent">${t("Règles agent IA")}</button></footer><div id="notice" role="status" hidden></div><input id="project-file" type="file" accept=".json,.binksy" hidden>`;
}
