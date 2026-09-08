import {
  selectedItems,
  deliveries,
  CATEGORIES,
  selectedCount,
} from "./catalog.js";
import {
  mountWorkshop,
  rolePanel,
  bindRoles,
  resetColorChoices,
} from "./workshop.js";
import { t, language, setLanguage, translateDOM } from "./i18n.js";
import {
  identity,
  home,
  readyAssets,
  readyProperties,
  clearPanel,
  agentRules,
  arrow,
} from "./ui";
import { clearspaceSVG, clearGuides } from "./clearspace";
import { validate } from "./project";
import "./style.css";
import {
  project,
  layout,
  colors,
  filename,
  History,
  clone,
  variantIds,
  variantName,
  clearMeasure,
  baseFamily,
} from "./model";
import { importSVG, assetMarkup, assetContent, compositionSVG } from "./svg";
import { exportFiles, download } from "./export";
import opentype from "opentype.js";
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const history = new History();
let projects = [],
  p,
  view = "home",
  zoom = 1,
  selected = "icon",
  font = null,
  saving,
  gesture = null,
  busy = false;
try {
  projects = JSON.parse(localStorage.getItem("binksy-logo-system") || "[]");
  if (!Array.isArray(projects)) projects = [];
  p = projects[0] ? await validate(projects[0]) : project();
} catch {
  p = project();
  projects = [p];
  queueMicrotask(() =>
    notice("Sauvegarde locale illisible. Importez votre fichier projet."),
  );
}

function save() {
  p.locale = language();
  projects = projects.map((x) => (x.id === p.id ? clone(p) : x));
  clearTimeout(saving);
  $("#save-state").textContent = t("Enregistrement…");
  saving = setTimeout(() => {
    try {
      localStorage.setItem("binksy-logo-system", JSON.stringify(projects));
      $("#save-state").textContent = t("Enregistré sur cet appareil");
    } catch {
      $("#save-state").textContent =
        "Sauvegarde impossible — exportez le projet";
      notice(
        "Stockage local plein ou indisponible. Exportez votre fichier projet.",
      );
    }
  }, 350);
}
function edit(fn, redraw = true) {
  history.push(p);
  fn();
  save();
  if (redraw) render();
}
function notice(message) {
  let n = $("#notice");
  if (!n) return;
  n.textContent = t(message);
  n.hidden = false;
  clearTimeout(notice.timer);
  notice.timer = setTimeout(() => (n.hidden = true), 9000);
}
function check(label, key, value) {
  return `<label class="check"><input type="checkbox" data-setting="${key}" ${value ? "checked" : ""}>${label}</label>`;
}
function number(label, key, value, min, max, step = 1, suffix = "") {
  return `<label class="field"><span>${label}<output id="o-${key}">${Number(value).toFixed(step < 1 ? 2 : 0)}${suffix}</output></span><div class="range-row"><input aria-label="${label}" type="range" data-comp="${key}" min="${min}" max="${key.endsWith("Height") ? Math.max(1000, Math.ceil(value * 2)) : max}" step="${step}" value="${value}"><input aria-label="${label} précis" type="number" data-comp="${key}" min="${min}" max="${max}" step="${step}" value="${value}"></div></label>`;
}
function render() {
  const scrolls = [".left", ".right", "main"].map((selector) => [
    selector,
    $(selector)?.scrollTop || 0,
  ]);
  if (view === "home" || view === "agent") {
    $("#app").innerHTML =
      (view === "home" ? home(projects) : agentRules()) +
      `<footer><span id="save-state">Projets enregistrés sur cet appareil</span><span>SVG · PNG · JPEG · PDF</span></footer><div id="notice" role="status" hidden></div><input id="project-file" type="file" accept=".binksy,.json" hidden>`;
    bindLanding();
    bindLanguage();
    bindProjectDeletion();
    translateDOM();
    return;
  }

  const c = p.compositions[p.active],
    l = layout(p);
  $("#app").innerHTML =
    `<header><div class="identity">${identity()}</div><nav><button data-view="compose" class="${view === "compose" ? "active" : ""}"><small>01</small> Composer</button><button data-view="family" class="${view === "family" ? "active" : ""}"><small>02</small> Générer & exporter <span class="count">${p.enabled.reduce((n, v) => n + CATEGORIES.reduce((a, c) => a + selectedCount(p, v, c), 0n), 0n)}</span></button></nav><div class="header-actions"><button data-action="undo" aria-label="Annuler" title="Annuler · ⌘Z" ${!history.past.length ? "disabled" : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5L3 10l5 5M3 10h10a6 6 0 0 1 0 12"/></svg></button><button data-action="redo" aria-label="Rétablir" title="Rétablir · ⌘⇧Z" ${!history.future.length ? "disabled" : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5l5 5-5 5m5-5h-10a6 6 0 0 0 0 12"/></svg></button><button class="primary" data-action="export-project">Sauvegarder .binksy ${arrow}</button></div></header><div class="workspace" data-mode="${p.mode}"><aside class="left"><section><div class="section-title">01 / PROJET <button data-action="new" title="Nouveau projet">+</button></div><select id="projects" aria-label="Projet actif">${projects.map((x) => `<option value="${esc(x.id)}" ${x.id === p.id ? "selected" : ""}>${esc(x.id === p.id ? p.brand : x.brand)}</option>`).join("")}</select><label class="field"><span>Nom de la marque</span><input id="brand" value="${esc(p.brand)}" maxlength="100"></label><button class="text-button" data-action="import-project">Importer .binksy ${arrow}</button></section><section><div class="section-title">02 / ASSETS <span>SVG</span></div>${["icon", "wordmark"].map((k) => `<label class="asset" data-drop="${k}"><input type="file" accept=".svg,image/svg+xml" data-upload="${k}" aria-label="Importer ${k === "icon" ? "le brandmark SVG" : "le logotype SVG"}" hidden><span class="asset-label">${k === "icon" ? "ICON" : "WORDMARK"}<span>${arrow}</span></span><div class="asset-preview">${p.assets[k] ? assetMarkup(p.assets[k], null, "asset-" + k) : '<span class="upload-cross">+</span>'}</div><span class="asset-name">${p.assets[k] ? esc(p.assets[k].name) : "Importer ou déposer un SVG"}</span></label>`).join("")}<details><summary>Mon SVG contient du texte</summary><p>Chargez la police exacte avant le SVG. Les textes simples seront vectorisés.</p><label class="file-button">${font ? "Police chargée ✓" : "Charger OTF / TTF"}<input id="font" type="file" accept=".otf,.ttf" hidden></label></details></section><section><div class="section-title">03 / COMPOSITIONS <span>04</span></div>${variantIds(
      p,
    )
      .map(
        (v, i) =>
          `<div class="variant-row ${p.active === v ? "active" : ""}"><input aria-label="Activer ${esc(variantName(p, v))}" type="checkbox" data-variant="${v}" ${p.enabled.includes(v) ? "checked" : ""}><button data-active="${v}"><span class="variant-icon">${["▰ ▬", "▰", "◆", "▬"][i]}</span>${esc(variantName(p, v))}</button><span class="tiny">0${i + 1}</span></div>`,
      )
      .join(
        "",
      )}</section><section><div class="section-title">04 / COULEURS <button data-action="add-color" title="Ajouter une couleur">+</button></div><div class="system-colors"><span><i style="background:#000"></i>Noir</span><span><i style="background:#fff"></i>Blanc</span><small>SYSTÈME</small></div>${p.colors
      .map(
        (col, i) =>
          `<div class="color-row"><input type="color" aria-label="Couleur ${esc(col.name)}" data-color="${col.id}" value="${col.hex}"><input aria-label="Nom de couleur" data-color-name="${col.id}" value="${esc(col.name)}"><button data-move="${i}" title="Monter la couleur" ${!i ? "disabled" : ""}><img class="arrow arrow-up" src="/brand/arrow.svg" alt="" aria-hidden="true"></button><button data-delete="${col.id}" title="Supprimer la couleur">×</button><input class="hex" aria-label="HEX" data-color-hex="${col.id}" value="${col.hex}" maxlength="7"><small>RGB ${col.hex
            .match(/\w\w/g)
            .map((n) => parseInt(n, 16))
            .join(" / ")}</small></div>`,
      )
      .join(
        "",
      )}${!p.colors.length ? '<p class="muted">Ajoutez les couleurs de votre marque.<br>Une couleur, une déclinaison.</p>' : ""}</section><div class="local-note"><span class="status-dot"></span> LOCAL & PRIVÉ<p>Vos fichiers restent dans ce navigateur.</p></div></aside><main class="editor-main">${
      view === "compose"
        ? `<div class="canvas-toolbar"><div><span class="eyebrow">PLAN DE TRAVAIL /</span> <strong>${esc(variantName(p, p.active))}</strong></div><div><div class="canvas-colors" aria-label="Fond du canvas"><button data-canvas="#ffffff" aria-label="Canvas blanc" aria-pressed="${p.canvas === "#ffffff"}">Clair</button><button data-canvas="#000000" aria-label="Canvas noir" aria-pressed="${p.canvas === "#000000"}">Sombre</button></div>${check("Grille", "grid", p.grid)}${check("Snap", "snap", p.snap)}<select id="zoom" aria-label="Zoom">${[0.5, 0.75, 1, 1.5, 2].map((n) => `<option value="${n}" ${zoom === n ? "selected" : ""}>${n * 100}%</option>`).join("")}</select></div></div><div id="stage" class="stage"></div><div class="canvas-footer"><span id="measure">X = ${l.X.toFixed(2)} unités SVG</span><span>Glisser pour déplacer · Alt : réglage libre</span><button data-action="reset">Réinitialiser la composition</button></div><div class="overview"><div class="section-title">VOTRE SYSTÈME <button data-view="family">Générer les fichiers ${arrow}</button></div><div class="mini-grid">${variantIds(
            p,
          )
            .map(
              (v) =>
                `<button class="mini ${p.active === v ? "active" : ""}" data-active="${v}"><div>${layout(p, v).parts.length ? compositionSVG(p, v) : "<span>—</span>"}</div><span>${esc(variantName(p, v))}</span></button>`,
            )
            .join("")}</div></div>`
        : `<div id="workshop"></div>`
    }</main><aside class="right" aria-label="Propriétés" tabindex="0">${view === "compose" ? `<div class="properties-title">PROPRIÉTÉS <span>${esc(variantName(p, p.active))}</span></div><section><div class="section-title">RELATION & ÉCHELLE</div>${p.active !== "wordmark" ? number("Hauteur de l’icône", "iconSize", c.iconSize, 0.25, 8, p.snap ? 0.25 : 0.01, "X") : ""}${p.active !== "icon" ? number("Échelle du logotype", "wordSize", c.wordSize, 0.25, 3, 0.05, "×") : ""}${["horizontal", "vertical"].includes(p.active) ? number("Espacement", "gap", c.gap, 0, 5, p.snap ? 0.25 : 0.01, "X") : ""}<div class="unit-note"><strong>1X</strong><span>½ hauteur visuelle du logotype<br><b id="unit-px">${l.X.toFixed(2)}</b> unités SVG</span></div></section><section><div class="section-title">ALIGNEMENT</div><div class="segmented">${["start", "center", "end"].map((v, i) => `<button data-align="${v}" class="${c.align === v ? "active" : ""}">${["Début", "Centre", "Fin"][i]}</button>`).join("")}</div><div class="segmented center-modes"><button data-center="real" class="${c.center === "real" ? "active" : ""}">Real Center</button><button data-center="optical" class="${c.center === "optical" ? "active" : ""}">Optical Center</button></div><p class="muted">${c.center === "real" ? "Centrage exact des bounding boxes." : "Centrage sur la masse opaque des formes. Ajustez librement les offsets."}</p></section><section><div class="section-title">AJUSTEMENTS MANUELS</div><div class="segmented">${["icon", "wordmark"].map((k) => `<button data-element="${k}" class="${selected === k ? "active" : ""}">${k === "icon" ? "Icône" : "Logotype"}</button>`).join("")}</div>${number("Position X", selected + "X", c[selected + "X"], -10, 10, p.snap ? 0.25 : 0.01, "X")}${number("Position Y", selected + "Y", c[selected + "Y"], -10, 10, p.snap ? 0.25 : 0.01, "X")}</section>${clearPanel(p)}<section><div class="section-title">TAILLES MINIMALES</div><div class="two-fields"><label>Print · mm<input type="number" data-comp="minPrint" value="${c.minPrint}" min="1" max="1000"></label><label>Digital · px<input type="number" data-comp="minDigital" value="${c.minDigital}" min="1" max="10000"></label></div></section>` : exportPanel()}</aside></div><footer><span id="save-state">Enregistré sur cet appareil</span><button data-view="agent">Règles agent IA</button></footer><div id="notice" role="status" hidden></div><input id="project-file" type="file" accept=".json,.binksy" hidden>`;
  if (p.mode === "ready") {
    const sections = $(".left").querySelectorAll(":scope > section");
    sections[1].outerHTML = readyAssets(p);
    sections[2].remove();
    document
      .querySelectorAll('[data-setting="snap"],[data-setting="grid"]')
      .forEach((el) => (el.closest("label").hidden = true));
    const reset = document.querySelector('[data-action="reset"]');
    if (reset) reset.hidden = true;
    const hint = document.querySelector(".canvas-footer>span:nth-child(2)");
    if (hint) hint.textContent = "Construction importée";
    if (view === "compose") $(".right").innerHTML = readyProperties(p);
  }
  if (view === "compose") {
    if (p.mode !== "ready") {
      const first = $(".right > section");
      first.innerHTML = `<div class="section-title">RELATION & ÉCHELLE</div>${l.parts.map((q) => number(t(q.key === "icon" ? "Hauteur du brandmark · px" : "Hauteur du logotype · px"), q.key + "Height", q.h, 1, 100000, 1, " px") + `<label class="field"><span>${t(q.key === "icon" ? "Largeur du brandmark · px" : "Largeur du logotype · px")}</span><input type="number" aria-label="${t(q.key === "icon" ? "Largeur du brandmark · px" : "Largeur du logotype · px")}" data-width="${q.key}" value="${q.w.toFixed(2)}" min="1" max="100000" step="any"></label>`).join("")}<p class="muted">${t("Proportions verrouillées")}</p>${["horizontal", "vertical"].includes(p.active) ? number("Espacement", "gap", c.gap, 0, 5, p.snap ? 0.25 : 0.01, "X") : ""}<div class="unit-note"><strong>1X</strong><span>½ hauteur visuelle du logotype<br><b id="unit-px">${l.X.toFixed(2)}</b> unités SVG</span></div>`;
    }
    $(".right").insertAdjacentHTML("beforeend", rolePanel(p));
  }
  bind();
  bindExtra();
  bindLanguage();
  bindProjectDeletion();
  bindRoles(p, edit);
  document.querySelectorAll("[data-width]").forEach(
    (el) =>
      (el.onchange = () => {
        if (el.validity.valid) {
          const q = layout(p).parts.find((q) => q.key === el.dataset.width);
          edit(() => {
            p.compositions[p.active][q.key + "Height"] =
              (+el.value * q.asset.box.height) / q.asset.box.width;
          });
        }
      }),
  );
  for (const [selector, top] of scrolls)
    if ($(selector)) $(selector).scrollTop = top;
  if (view === "compose") drawStage();
  else mountWorkshop(p, edit, runExport);
  translateDOM();
}
function exportPanel() {
  const e = p.exports;
  return `<div class="properties-title">LIVRAISON <span>FULL SYSTEM</span></div><section><div class="section-title">FORMATS</div><div class="formats">${["svg", "png", "jpeg", "pdf"].map((f) => `<label><input type="checkbox" data-format="${f}" ${e.formats.includes(f) ? "checked" : ""}>${f.toUpperCase()}</label>`).join("")}</div><p class="muted">SVG, PNG et PDF toujours transparents.</p></section><section><div class="section-title">CANVAS RASTER</div><div class="two-fields"><label>Largeur · px<input type="number" data-export="width" value="${e.width}" min="16" max="8192"></label><label>Hauteur · px<input type="number" data-export="height" value="${e.height}" min="16" max="8192"></label></div><label class="field"><span>Résolution cible · ppp</span><input type="number" data-export="dpi" value="${e.dpi}" min="72" max="1200"></label><p class="muted">Proportions conservées, logo centré dans le canvas. Résolution intégrée aux fichiers.</p><label class="field"><span>Marge JPEG · × petit côté du logo</span><input aria-label="Marge JPEG" data-export="jpegMargin" type="number" min=".1" max="3" step=".1" value="${e.jpegMargin}"></label><label class="field"><span>Contraste JPEG recommandé</span><select aria-label="Seuil de contraste JPEG" data-export="contrast">${[3, 4.5, 7].map((n) => `<option value="${n}" ${e.contrast === n ? "selected" : ""}>${n}:1</option>`).join("")}</select></label><label class="check"><input data-export="clearspace" type="checkbox" ${e.clearspace ? "checked" : ""}>Inclure les planches clearspace</label></section><section><div class="section-title">NOMMAGE</div><label class="field"><span>Modèle de nom</span><input data-naming="pattern" value="${esc(p.naming.pattern)}" maxlength="200"></label><div class="tokens">${["brand", "variant", "orientation", "color", "background", "format", "size"].map((k) => `<button data-token="${k}">{${k}}</button>`).join("")}</div><div class="two-fields"><label>Séparateur<select data-naming="separator">${["-", "_", "."].map((s) => `<option ${s === p.naming.separator ? "selected" : ""}>${s}</option>`).join("")}</select></label><label>Casse<select data-naming="uppercase"><option value="false">minuscules</option><option value="true" ${p.naming.uppercase ? "selected" : ""}>MAJUSCULES</option></select></label></div><code class="filename">${esc(filename(p, baseFamily(p)[0] || { variant: "horizontal", color: { id: "black", name: "black" } }, e.formats[0] || "svg", "transparent"))}</code></section><section><div class="section-title">ORGANISATION</div><select aria-label="Organisation du ZIP" data-export="organization"><option value="format">Par format / SVG, PNG…</option><option value="variant" ${e.organization === "variant" ? "selected" : ""}>Par variante / Horizontal…</option></select></section><div class="export-bottom"><span id="selection-count"></span><button class="primary export-button" data-action="export" ${busy ? "disabled" : ""}>Exporter la sélection ${arrow}</button><p class="muted">ZIP automatique pour plusieurs fichiers.<br>Recommandations incluses dans le ZIP.</p></div>`;
}
function drawStage() {
  const l = layout(p),
    c = p.compositions[p.active],
    stage = $("#stage");
  if (!l.parts.length) {
    stage.innerHTML = `<div class="empty"><span class="empty-mark">${arrow}</span><div class="eyebrow">VOTRE PROCHAIN SYSTÈME COMMENCE ICI</div><h1>${p.mode === "ready" ? "Vos variantes.<br>Une livraison complète." : "Deux SVG.<br>Un système complet."}</h1><p>${p.mode === "ready" ? "Ajoutez vos constructions SVG à gauche.<br>Réglez les couleurs et leur clearspace." : "Importez votre icône et votre logotype à gauche.<br>Composez, ajustez, puis préparez toute la livraison."}</p><div class="steps"><span>01 IMPORTER</span><span>02 COMPOSER</span><span>03 EXPORTER</span></div></div>`;
    return;
  }
  const margin = Math.max(l.X * 1.5, clearMeasure(p).space + 25),
    w = (l.width + margin * 2) / zoom,
    h = (l.height + margin * 2) / zoom,
    x = l.x + l.width / 2 - w / 2,
    y = l.y + l.height / 2 - h / 2;
  stage.innerHTML = `<span class="stage-label">${esc(p.brand)} <span>/ ${esc(variantName(p, p.active))}</span></span><svg id="canvas" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"><defs><pattern id="grid" x="${l.parts.find((q) => q.key === "wordmark")?.x || 0}" y="${l.parts.find((q) => q.key === "wordmark")?.y || 0}" width="${l.X}" height="${l.X}" patternUnits="userSpaceOnUse"><path d="M ${l.X} 0 L 0 0 0 ${l.X}" fill="none" stroke="#c6c6c6" stroke-width=".6" vector-effect="non-scaling-stroke"/></pattern></defs>${p.grid ? `<rect x="${x - w}" y="${y - h}" width="${w * 3}" height="${h * 3}" fill="url(#grid)"/>` : ""}<g id="clear-guides">${p.clear ? clearGuides(l, clearMeasure(p).space, p.canvas === "#000000" ? "light" : "dark") : ""}</g>${l.parts.map((q) => `<g data-drag="${q.key}" transform="translate(${q.x} ${q.y})" tabindex="0" role="button" aria-label="Déplacer ${q.key}"><svg width="${q.w}" height="${q.h}" viewBox="${q.asset.box.x} ${q.asset.box.y} ${q.asset.box.width} ${q.asset.box.height}" overflow="visible">${assetContent(q.asset, null, "stage-" + q.key)}</svg><rect width="${q.w}" height="${q.h}" fill="transparent" stroke="${selected === q.key ? "#ff5500" : "transparent"}" stroke-width="1" vector-effect="non-scaling-stroke"/></g>`).join("")}</svg><span class="stage-caption">${c.center === "real" ? "REAL CENTER" : "OPTICAL CENTER"} <span> / </span> ${p.snap ? "SNAP ¼X" : "AJUSTEMENT LIBRE"}</span>`;
  $("#measure").textContent =
    `X = ${l.X.toFixed(2)} unités SVG · Logo ${l.width.toFixed(1)} × ${l.height.toFixed(1)}`;
  if ($("#unit-px")) $("#unit-px").textContent = l.X.toFixed(2);
  stage.style.background = p.canvas;
  stage.classList.toggle("dark-canvas", p.canvas === "#000000");
  if (p.mode === "ready") {
    stage.querySelectorAll("[data-drag]").forEach((el) => {
      el.removeAttribute("data-drag");
      el.removeAttribute("role");
      el.removeAttribute("tabindex");
    });
    return;
  }
  stage.querySelectorAll("[data-drag]").forEach((el) => {
    el.onpointerdown = beginDrag;
    el.onkeydown = (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
        return;
      e.preventDefault();
      edit(() => {
        const axis = ["ArrowLeft", "ArrowRight"].includes(e.key) ? "X" : "Y";
        p.compositions[p.active][el.dataset.drag + axis] +=
          (e.altKey ? 0.01 : 0.25) *
          (["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 1);
      });
    };
  });
  resizeHandles();
  translateDOM(stage);
}

function bind() {
  document.querySelectorAll("[data-view]").forEach(
    (el) =>
      (el.onclick = () => {
        view = el.dataset.view;
        render();
      }),
  );
  document.querySelectorAll("[data-active]").forEach(
    (el) =>
      (el.onclick = () => {
        p.active = el.dataset.active;
        save();
        render();
      }),
  );
  document
    .querySelectorAll("[data-setting]")
    .forEach(
      (el) =>
        (el.onchange = () => edit(() => (p[el.dataset.setting] = el.checked))),
    );
  document
    .querySelectorAll("[data-variant]")
    .forEach(
      (el) =>
        (el.onchange = () =>
          edit(
            () =>
              (p.enabled = el.checked
                ? [...p.enabled, el.dataset.variant]
                : p.enabled.filter((v) => v !== el.dataset.variant)),
          )),
    );
  document.querySelectorAll("[data-comp]").forEach((el) => {
    el.onpointerdown = () => {
      if (!gesture) {
        history.push(p);
        gesture = "slider";
      }
    };
    el.oninput = () => {
      if (!el.validity.valid) return;
      if (!gesture) {
        history.push(p);
        gesture = "slider";
      }
      const key = el.dataset.comp;
      p.compositions[p.active][key] = +el.value;
      document.querySelectorAll(`[data-comp="${key}"]`).forEach((other) => {
        if (other !== el) other.value = el.value;
      });
      const output = $("#o-" + key);
      if (output)
        output.textContent =
          (+el.value).toFixed(2) +
          (key.endsWith("Height") ? " px" : key === "wordSize" ? "×" : "X");
      drawStage();
      const part = layout(p).parts.find((q) => q.key + "Height" === key);
      if (part) {
        const width = document.querySelector(`[data-width="${part.key}"]`);
        if (width) width.value = part.w.toFixed(2);
      }
    };
    el.onchange = () => {
      gesture = null;
      save();
      render();
    };
    el.onblur = () => {
      if (gesture === "slider") {
        gesture = null;
        save();
      }
    };
  });
  document.querySelectorAll("[data-center],[data-align]").forEach(
    (el) =>
      (el.onclick = () =>
        edit(() => {
          if (el.dataset.center)
            p.compositions[p.active].center = el.dataset.center;
          else p.compositions[p.active].align = el.dataset.align;
        })),
  );
  document.querySelectorAll("[data-element]").forEach(
    (el) =>
      (el.onclick = () => {
        selected = el.dataset.element;
        render();
      }),
  );
  document
    .querySelectorAll("[data-upload]")
    .forEach(
      (el) => (el.onchange = () => loadAsset(el.files[0], el.dataset.upload)),
    );
  document.querySelectorAll("[data-drop]").forEach((el) => {
    el.ondragover = (e) => {
      e.preventDefault();
      el.classList.add("dragover");
    };
    el.ondragleave = () => el.classList.remove("dragover");
    el.ondrop = (e) => {
      e.preventDefault();
      loadAsset(e.dataTransfer.files[0], el.dataset.drop);
    };
  });
  $("#brand").onchange = (e) =>
    edit(() => (p.brand = e.target.value.trim() || "Sans titre"));
  $("#projects").onchange = async (e) => {
    try {
      p = await validate(projects.find((x) => x.id === e.target.value));
      history.past = [];
      history.future = [];
      render();
    } catch (error) {
      notice(error.message);
    }
  };
  if ($("#font"))
    $("#font").onchange = async (e) => {
      try {
        font = opentype.parse(await e.target.files[0].arrayBuffer());
        render();
        notice("Police chargée. Réimportez le SVG contenant du texte.");
      } catch {
        notice("Police OTF / TTF illisible.");
      }
    };
  $("#project-file").onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 30e6) throw Error("Projet trop volumineux.");
      const imported = await validate(JSON.parse(await file.text()));
      imported.id = crypto.randomUUID();
      p = imported;
      view = "compose";
      projects.push(p);
      history.past = [];
      history.future = [];
      render();
      save();
      notice("Projet importé.");
    } catch (error) {
      notice("Import refusé : " + error.message);
    }
  };
  if ($("#zoom"))
    $("#zoom").onchange = (e) => {
      zoom = +e.target.value;
      drawStage();
    };
  document
    .querySelectorAll("[data-color],[data-color-name],[data-color-hex]")
    .forEach(
      (el) =>
        (el.onchange = () => {
          const id =
            el.dataset.color || el.dataset.colorName || el.dataset.colorHex;
          if (el.dataset.colorHex && !/^#[0-9a-f]{6}$/i.test(el.value)) {
            notice("Utilisez un HEX à six chiffres, par exemple #FF5500.");
            render();
            return;
          }
          edit(() => {
            const col = p.colors.find((c) => c.id === id);
            col[el.dataset.colorName ? "name" : "hex"] = el.value.slice(0, 100);
            resetColorChoices(p);
          });
        }),
    );
  document.querySelectorAll("[data-delete]").forEach(
    (el) =>
      (el.onclick = () =>
        edit(() => {
          p.colors = p.colors.filter((c) => c.id !== el.dataset.delete);
          resetColorChoices(p);
        })),
  );
  document.querySelectorAll("[data-move]").forEach(
    (el) =>
      (el.onclick = () =>
        edit(() => {
          const i = +el.dataset.move;
          [p.colors[i - 1], p.colors[i]] = [p.colors[i], p.colors[i - 1]];
        })),
  );
  document
    .querySelectorAll("[data-format]")
    .forEach(
      (el) =>
        (el.onchange = () =>
          edit(
            () =>
              (p.exports.formats = el.checked
                ? [...p.exports.formats, el.dataset.format]
                : p.exports.formats.filter((f) => f !== el.dataset.format)),
          )),
    );
  document.querySelectorAll("[data-export]").forEach(
    (el) =>
      (el.onchange = () => {
        if (!el.validity.valid) {
          notice("Valeur hors limites.");
          render();
          return;
        }
        edit(
          () =>
            (p.exports[el.dataset.export] =
              el.type === "checkbox"
                ? el.checked
                : el.type === "number" || el.dataset.export === "contrast"
                  ? +el.value
                  : el.value),
        );
      }),
  );
  document
    .querySelectorAll("[data-naming]")
    .forEach(
      (el) =>
        (el.onchange = () =>
          edit(
            () =>
              (p.naming[el.dataset.naming] =
                el.dataset.naming === "uppercase"
                  ? el.value === "true"
                  : el.value),
          )),
    );
  document
    .querySelectorAll("[data-token]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          edit(
            () =>
              (p.naming.pattern +=
                p.naming.separator + "{" + el.dataset.token + "}"),
          )),
    );
  document
    .querySelectorAll("[data-action]")
    .forEach((el) => (el.onclick = () => action(el.dataset.action)));
}
async function loadAsset(file, key) {
  if (!file) return;
  try {
    const asset = await importSVG(await file.text(), file.name, font);
    edit(() => {
      p.assets[key] = asset;
      resetColorChoices(p);
      for (const c of Object.values(p.compositions)) {
        if (key === "wordmark" && c.wordmarkHeight == null)
          c.wordmarkHeight = asset.box.height;
        if (c.iconHeight == null)
          c.iconHeight = (2.5 * (p.assets.wordmark?.box.height || 100)) / 2;
      }
    });
    notice(
      asset.hasStroke
        ? "SVG importé avec contours : limites conservatrices. Vectorisez les contours pour une grille X exacte."
        : `${key === "icon" ? "Icône" : "Logotype"} importé · formes vectorielles conservées.`,
    );
  } catch (error) {
    notice(error.message);
  }
}
function beginDrag(e) {
  if (e.target.closest("[data-resize]")) return;
  if (e.button !== 0) return;
  e.preventDefault();
  const el = e.currentTarget,
    canvas = $("#canvas"),
    matrix = canvas.getScreenCTM().inverse(),
    start = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix),
    key = el.dataset.drag,
    c = p.compositions[p.active],
    initial = { x: c[key + "X"], y: c[key + "Y"] },
    X = layout(p).X;
  history.push(p);
  selected = key;
  el.setPointerCapture(e.pointerId);
  const part = layout(p).parts.find((q) => q.key === key);
  el.onpointermove = (event) => {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix,
      ),
      snap = (v) =>
        p.snap && !event.altKey
          ? Math.round(v * 4) / 4
          : Math.round(v * 100) / 100;
    c[key + "X"] = Math.max(
      -10,
      Math.min(10, snap(initial.x + (point.x - start.x) / X)),
    );
    c[key + "Y"] = Math.max(
      -10,
      Math.min(10, snap(initial.y + (point.y - start.y) / X)),
    );
    el.setAttribute(
      "transform",
      `translate(${part.x + (c[key + "X"] - initial.x) * X} ${part.y + (c[key + "Y"] - initial.y) * X})`,
    );
    const current = layout(p),
      wordmark = current.parts.find((part) => part.key === "wordmark");
    if (wordmark && $("#grid")) {
      $("#grid").setAttribute("x", wordmark.x);
      $("#grid").setAttribute("y", wordmark.y);
    }
    if (p.clear && $("#clear-guides"))
      $("#clear-guides").innerHTML = clearGuides(
        current,
        clearMeasure(p).space,
        p.canvas === "#000000" ? "light" : "dark",
      );
    for (const axis of ["X", "Y"]) {
      document
        .querySelectorAll(`[data-comp="${key + axis}"]`)
        .forEach((n) => (n.value = c[key + axis]));
      const o = $("#o-" + key + axis);
      if (o) o.textContent = c[key + axis].toFixed(2) + "X";
    }
  };
  const end = () => {
    el.onpointermove = null;
    save();
    render();
  };
  el.onpointerup = end;
  el.onpointercancel = end;
}
function action(name) {
  if (name === "undo" || name === "redo") {
    p = history[name](p);
    save();
    render();
  }
  if (name === "new") {
    view = "home";
    render();
    return;
  }
  if (name === "import-project") $("#project-file").click();
  if (name === "export-project")
    download(
      new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
      p.brand.replace(/[^a-z0-9]/gi, "-") + ".binksy",
    );
  if (name === "add-color")
    edit(() => {
      p.colors.push({
        id: crypto.randomUUID(),
        name: "Couleur " + (p.colors.length + 1),
        hex: "#ff5500",
      });
      resetColorChoices(p);
    });
  if (name === "reset")
    if (p.mode !== "ready")
      edit(() => (p.compositions[p.active] = project().compositions[p.active]));
  if (name === "export") {
    try {
      runExport(deliveries(p, selectedItems(p)));
    } catch (error) {
      notice(error.message);
    }
  }
}
async function runExport(items) {
  if (busy) return;
  busy = true;
  document
    .querySelectorAll('[data-action="export"]')
    .forEach((el) => (el.disabled = true));
  const snapshot = clone(p);
  try {
    await exportFiles(snapshot, items, (message) => notice(message));
    notice("Export terminé. Votre téléchargement est prêt.");
  } catch (error) {
    notice(error.message);
  } finally {
    busy = false;
    document
      .querySelectorAll('[data-action="export"]')
      .forEach((el) => (el.disabled = false));
  }
}
document.addEventListener("keydown", (e) => {
  if (
    (e.metaKey || e.ctrlKey) &&
    e.key.toLowerCase() === "z" &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
  ) {
    e.preventDefault();
    action(e.shiftKey ? "redo" : "undo");
  }
});
render();
if (import.meta.env.PROD && "serviceWorker" in navigator)
  navigator.serviceWorker
    .register("/sw.js")
    .catch(() =>
      notice("Le cache hors ligne est indisponible dans ce navigateur."),
    );
function bindLanding() {
  document.querySelectorAll("[data-view]").forEach(
    (el) =>
      (el.onclick = () => {
        view = el.dataset.view;
        render();
      }),
  );
  document.querySelectorAll("[data-mode]").forEach(
    (el) =>
      (el.onclick = () => {
        p = project(el.dataset.mode);
        projects.push(p);
        history.past = [];
        history.future = [];
        view = "compose";
        render();
        save();
      }),
  );
  document.querySelectorAll("[data-open]").forEach(
    (el) =>
      (el.onclick = async () => {
        try {
          p = await validate(projects.find((p) => p.id === el.dataset.open));
          view = "compose";
          history.past = [];
          history.future = [];
          render();
        } catch (e) {
          notice(e.message);
        }
      }),
  );
  document
    .querySelectorAll('[data-action="import-project"]')
    .forEach((el) => (el.onclick = () => $("#project-file").click()));
  $("#project-file").onchange = handleProjectImport;
}
async function handleProjectImport(e) {
  try {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 30e6) throw Error("Projet trop volumineux.");
    p = await validate(JSON.parse(await file.text()));
    p.id = crypto.randomUUID();
    projects.push(p);
    view = "compose";
    history.past = [];
    history.future = [];
    render();
    save();
    notice("Projet importé.");
  } catch (e) {
    notice("Import refusé : " + e.message);
  }
}
function bindExtra() {
  document
    .querySelectorAll("[data-canvas]")
    .forEach(
      (el) => (el.onclick = () => edit(() => (p.canvas = el.dataset.canvas))),
    );
  if ($("#variant-name"))
    $("#variant-name").onchange = (e) =>
      edit(
        () =>
          (p.ready.find((v) => v.id === p.active).name =
            e.target.value.trim() || "Variante"),
      );
  if ($("#clear-reference"))
    $("#clear-reference").onchange = (e) =>
      edit(() => (p.compositions[p.active].clearRef = e.target.value));
  if ($("#clear-reference-value"))
    $("#clear-reference-value").onchange = (e) => {
      if (e.target.validity.valid && +e.target.value > 0)
        edit(
          () =>
            (p.compositions[p.active].references[
              p.compositions[p.active].clearRef
            ] = +e.target.value),
        );
      else notice("Indiquez une dimension strictement positive.");
    };
  document
    .querySelectorAll("[data-multiplier]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          edit(
            () =>
              (p.compositions[p.active].clearMultiplier =
                +el.dataset.multiplier),
          )),
    );
  document.querySelectorAll("[data-board]").forEach(
    (el) =>
      (el.onclick = () => {
        try {
          download(
            new Blob([clearspaceSVG(p, p.active, el.dataset.board)], {
              type: "image/svg+xml",
            }),
            `${p.brand}-${variantName(p, p.active)}-clearspace-${el.dataset.board === "light" ? "clair" : "fonce"}.svg`,
          );
        } catch (e) {
          notice(e.message);
        }
      }),
  );
  if ($("#ready-files"))
    $("#ready-files").onchange = async (e) => {
      const files = [...e.target.files];
      try {
        const imported = [];
        for (const file of files)
          imported.push({
            id: "v-" + crypto.randomUUID(),
            name: file.name.replace(/\.svg$/i, ""),
            asset: await importSVG(await file.text(), file.name, font),
          });
        edit(() => {
          for (const variant of imported) {
            p.ready.push(variant);
            p.enabled.push(variant.id);
            p.compositions[variant.id] = clone(
              project().compositions.horizontal,
            );
          }
          p.active = imported[0]?.id || p.active;
        });
        notice(`${imported.length} variante(s) importée(s).`);
      } catch (e) {
        notice(e.message);
      }
    };
  document.querySelectorAll("[data-remove-variant]").forEach(
    (el) =>
      (el.onclick = () =>
        edit(() => {
          const id = el.dataset.removeVariant;
          p.ready = p.ready.filter((v) => v.id !== id);
          p.enabled = p.enabled.filter((v) => v !== id);
          delete p.compositions[id];
          p.active = p.ready[0]?.id || "horizontal";
        })),
  );
}
window.addEventListener("pagehide", () => {
  clearTimeout(saving);
  try {
    localStorage.setItem("binksy-logo-system", JSON.stringify(projects));
  } catch {}
});

function bindLanguage() {
  const header = document.querySelector("header");
  if (!header) return;
  header.insertAdjacentHTML(
    "beforeend",
    `<div class="language-switch" aria-label="Language"><button data-language="fr" aria-pressed="${language() === "fr"}">FR</button><button data-language="en" aria-pressed="${language() === "en"}">EN</button></div>`,
  );
  header.querySelectorAll("[data-language]").forEach(
    (el) =>
      (el.onclick = () => {
        setLanguage(el.dataset.language);
        render();
        if (projects.some((x) => x.id === p.id)) save();
      }),
  );
}
function bindProjectDeletion() {
  document
    .querySelectorAll("[data-open]")
    .forEach((el) =>
      el.insertAdjacentHTML(
        "afterend",
        `<button class="delete-project" data-delete-project="${el.dataset.open}" aria-label="${t("Supprimer le projet")}">${t("Supprimer")}</button>`,
      ),
    );
  const picker = document.querySelector("#projects");
  if (picker)
    picker.insertAdjacentHTML(
      "afterend",
      `<button class="delete-project" data-delete-project="${p.id}">${t("Supprimer le projet")}</button>`,
    );
  document.querySelectorAll("[data-delete-project]").forEach(
    (el) =>
      (el.onclick = () => {
        const id = el.dataset.deleteProject,
          target = projects.find((x) => x.id === id);
        if (!target) return;
        const dialog = document.createElement("dialog");
        dialog.setAttribute("aria-label", t("Supprimer le projet"));
        dialog.innerHTML = `<form method="dialog"><h2>${esc(t("Supprimer « {name} » ?", { name: target.brand }))}</h2><p>${t("Le projet enregistré sera supprimé de cet appareil. Les fichiers .binksy déjà exportés seront conservés.")}</p><div class="dialog-actions"><button value="cancel" autofocus>${t("Annuler")}</button><button class="destructive" value="delete">${t("Supprimer")}</button></div></form>`;
        document.body.append(dialog);
        dialog.showModal();
        dialog.onclose = () => {
          if (dialog.returnValue === "delete") {
            clearTimeout(saving);
            const next = projects.filter((x) => x.id !== id);
            try {
              localStorage.setItem("binksy-logo-system", JSON.stringify(next));
              projects = next;
              if (p.id === id) {
                p = project();
                view = "home";
                history.past = [];
                history.future = [];
              }
              render();
            } catch (error) {
              notice(error.message);
            }
          }
          dialog.remove();
        };
      }),
  );
}
function resizeHandles() {
  if (p.mode === "ready") return;
  const canvas = $("#canvas");
  if (!canvas) return;
  const q = layout(p).parts.find((q) => q.key === selected);
  if (!q) return;
  const k = canvas.getScreenCTM().a,
    size = 9 / k;
  const group = canvas.querySelector(`[data-drag="${selected}"]`);
  for (const [corner, x, y] of [
    ["nw", 0, 0],
    ["ne", q.w, 0],
    ["se", q.w, q.h],
    ["sw", 0, q.h],
  ]) {
    group.insertAdjacentHTML(
      "beforeend",
      `<rect data-resize="${corner}" x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="#fff" stroke="#ff5500" stroke-width="1" vector-effect="non-scaling-stroke" tabindex="0" role="button" aria-label="${t("Redimensionner")} ${selected} ${corner}" style="cursor:${corner === "nw" || corner === "se" ? "nwse" : "nesw"}-resize"/>`,
    );
  }
  group.querySelectorAll("[data-resize]").forEach((handle) => {
    handle.onpointerdown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      history.push(p);
      const matrix = canvas.getScreenCTM().inverse(),
        start = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix),
        corner = handle.dataset.resize;
      const c = p.compositions[p.active],
        initial = q.h,
        sx = corner.includes("w") ? -1 : 1,
        sy = corner.includes("n") ? -1 : 1,
        ratio = q.w / q.h;
      const frozen = canvas.getAttribute("viewBox");
      const move = (event) => {
        const point = new DOMPoint(
          event.clientX,
          event.clientY,
        ).matrixTransform(matrix);
        const change =
          ((point.x - start.x) * sx * ratio + (point.y - start.y) * sy) /
          (ratio * ratio + 1);
        const height = Math.max(
          1,
          Math.min(
            100000,
            Math.round((initial + change) * (event.altKey ? 100 : 1)) /
              (event.altKey ? 100 : 1),
          ),
        );
        c[selected + "Height"] = height;
        drawStage();
        $("#canvas").setAttribute("viewBox", frozen);
        document
          .querySelectorAll(`[data-comp="${selected}Height"]`)
          .forEach((n) => (n.value = height));
        const output = $("#o-" + selected + "Height");
        if (output) output.textContent = height + " px";
        const width = document.querySelector(`[data-width="${selected}"]`);
        if (width) width.value = (height * ratio).toFixed(2);
      };
      const end = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        save();
        render();
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end, { once: true });
      window.addEventListener("pointercancel", end, { once: true });
    };
    handle.onkeydown = (e) => {
      if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        edit(
          () =>
            (p.compositions[p.active][selected + "Height"] = Math.max(
              1,
              q.h + (["ArrowUp", "ArrowRight"].includes(e.key) ? 1 : -1),
            )),
        );
      }
    };
  });
}
