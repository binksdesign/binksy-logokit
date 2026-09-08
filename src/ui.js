import { agentContent } from "./agent-doc.js";
import { t } from "./i18n.js";
import { CLEAR_REFS, clearMeasure, variantName, variantIds } from "./model";
export const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const arrow =
  '<img class="arrow" src="/brand/arrow.svg" alt="" aria-hidden="true">';
export function identity() {
  return `<button class="brand-home" data-view="home" aria-label="BINKSY LOGOKIT — Accueil"><img src="/brand/logokit.svg" alt="BINKSY LOGOKIT"></button><a class="creator" href="https://www.instagram.com/graphiste.binks/" target="_blank" rel="noopener noreferrer">by binks design</a>`;
}
export function home(projects) {
  return `<div class="landing"><header><div class="identity">${identity()}</div><button data-view="agent">Règles agent IA</button></header><div class="home-layout"><aside class="project-nav"><div class="section-title">VOS PROJETS <span>${projects.length}</span></div>${projects.length ? projects.map((p) => `<button data-open="${esc(p.id)}"><strong>${esc(p.brand)}</strong><small>${p.mode === "ready" ? "Variantes prêtes" : "Composition"}</small>${arrow}</button>`).join("") : '<p class="muted">Vos projets apparaîtront ici.</p>'}<button class="import-home" data-action="import-project">Importer un fichier .binksy ${arrow}</button></aside><main class="home-content"><div class="eyebrow">DE LA CONSTRUCTION À LA LIVRAISON</div><h1>Votre logo.<br>Tout son système<span class="accent">.</span></h1><p class="home-intro">Composez vos variantes. Préparez une livraison impeccable.</p><div class="mode-grid"><button data-mode="compose" aria-label="Nouveau projet — Variantes à créer"><span class="mode-number">01</span><h2>Variantes à créer</h2><p>Une icône et un logotype séparés. Combinez-les pour construire votre système.</p><span class="mode-cta">Créer mon projet ${arrow}</span></button><button data-mode="ready" aria-label="Nouveau projet — Variantes déjà prêtes"><span class="mode-number">02</span><h2>Variantes déjà prêtes</h2><p>Importez vos constructions. Générez les couleurs, clearspaces et fichiers de livraison.</p><span class="mode-cta">Préparer mes fichiers ${arrow}</span></button></div><p class="privacy">Sans compte. Vos SVG et projets restent sur cet appareil.</p></main></div></div>`;
}
export function readyAssets(p) {
  return `<section><div class="section-title">VARIANTES IMPORTÉES</div><label class="file-button ready-upload">Ajouter des SVG ${arrow}<input id="ready-files" aria-label="Importer des variantes SVG" type="file" accept=".svg,image/svg+xml" multiple hidden></label>${p.ready.map((v) => `<div class="variant-row ${p.active === v.id ? "active" : ""}"><input type="checkbox" aria-label="Activer ${esc(v.name)}" data-variant="${v.id}" ${p.enabled.includes(v.id) ? "checked" : ""}><button data-active="${v.id}">${esc(v.name)}</button><button data-remove-variant="${v.id}" aria-label="Retirer ${esc(v.name)}">×</button></div>`).join("")}<p class="muted">Un SVG par construction. Nommez chaque variante.</p><details><summary>Mon SVG contient du texte</summary><label class="file-button">Charger la police exacte OTF / TTF<input id="font" aria-label="Police pour vectoriser les SVG" type="file" accept=".otf,.ttf" hidden></label></details></section>`;
}
export function clearPanel(p) {
  const c = p.compositions[p.active],
    m = clearMeasure(p);
  return `<section class="clear-settings"><div class="section-title">CLEARSPACE</div><label class="check"><input data-setting="clear" type="checkbox" ${p.clear ? "checked" : ""}>Afficher la zone de protection</label><label class="field"><span>Référence</span><select id="clear-reference" aria-label="Référence du clearspace">${Object.entries(
    CLEAR_REFS,
  )
    .map(
      ([key, label]) =>
        `<option value="${key}" ${c.clearRef === key ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label>${p.mode === "ready" ? `<label class="field"><span>Mesure de la référence · unités SVG</span><input id="clear-reference-value" aria-label="Mesure de référence du clearspace" type="number" min=".01" step="any" placeholder="À renseigner" value="${c.references?.[c.clearRef] || ""}"></label><p class="muted">Le SVG est assemblé : renseignez la dimension du brandmark ou du logotype dans ses coordonnées SVG.</p>` : ""}<div class="segmented multipliers">${[0.5, 1, 1.5, 2].map((n) => `<button data-multiplier="${n}" aria-pressed="${c.clearMultiplier === n}" class="${c.clearMultiplier === n ? "active" : ""}">×${n}</button>`).join("")}</div>${![0.5, 1, 1.5, 2].includes(c.clearMultiplier) ? `<p class="muted">Valeur conservée du projet : ×${c.clearMultiplier}</p>` : ""}<output class="clear-value">${m.space ? `X = ${m.value.toFixed(2)} × ${m.multiplier} = ${m.space.toFixed(2)} unités` : "Mesure de référence à définir"}</output><div class="clear-preview-actions"><button data-board="dark">Planche foncée ${arrow}</button><button data-board="light">Planche claire ${arrow}</button></div><p class="muted">Même espace tout autour. Planches séparées des logos.</p></section>`;
}
export function readyProperties(p) {
  const v = p.ready.find((v) => v.id === p.active);
  return `<div class="properties-title">PROPRIÉTÉS</div>${v ? `<section><label class="field"><span>Nom de la variante</span><input id="variant-name" aria-label="Nom de la variante" value="${esc(v.name)}" maxlength="100"></label><p class="muted">Construction d’origine conservée.</p></section>${clearPanel(p)}<section><div class="two-fields"><label>Print · mm<input data-comp="minPrint" type="number" min="1" max="1000" value="${p.compositions[p.active].minPrint}"></label><label>Digital · px<input data-comp="minDigital" type="number" min="1" max="10000" value="${p.compositions[p.active].minDigital}"></label></div></section>` : "<section><p>Importez une première variante SVG.</p></section>"}`;
}
export function agentRules() {
  return `<div class="landing"><header><div class="identity">${identity()}</div><button data-view="home">${t("Accueil")}</button></header><main class="agent-doc" aria-label="${t("RÈGLES AGENT IA")}"><div class="eyebrow">BINKSY LOGOKIT · V3</div><h1>${t("RÈGLES AGENT IA")}</h1>${agentContent()}</main></div>`;
}
