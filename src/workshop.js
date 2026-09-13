import {guidelineFileCount} from "./guideline-model.js";
import { editFraming } from "./format-editor.js";
import { clearspaceSVG } from "./clearspace.js";
import { mountJpegGallery } from "./jpeg-gallery.js";
import { editGradient } from "./gradient-editor.js";
import {
  catalog,
  CATEGORIES,
  selectedItem,
  selectedCount,
  selectedItems,
  deliveries,
  setCategory,
  rolesFor,
} from "./catalog.js";
import {
  variantIds,
  variantName,
  colors,
  jpegPairs,
  luminance,
  clearMeasure,
} from "./model.js";
import { compositionSVG, assetMarkup } from "./svg.js";
import { exportPlan, jpegPreview } from "./export.js";
import { esc } from "./ui.js";
import { t, translateDOM } from "./i18n.js";
const labels = {
  original: "Original",
  mono: "Couleurs simples",
  multi: "Variantes multicolores",
  gradient: "Dégradés",
};
const pages = {},
  opened = new Set(["original", "mono", "multi", "gradient"]);
let workshopStep = "family",
  galleryFilter = "original",
  fullCatalog = false;
let filter = "all",
  finalCategory = "all",
  finalBg = "all",
  finalFormat = "all",
  finalPage = 0;
const PAGE = 12n;
function previewBackground(p, item) {
  const paints = rolesFor(p, item.variant).flatMap((r) =>
    r.locked
      ? r.paint
      : r.sources.map(key=>item.color.partColors?.[key] || item.color.mapping?.[r.id] || item.color.hex || r.paint),
  );
  if (item.color.gradient)
    paints.push(
      ...(item.color.gradient.stops?.map((s) => s.color) || [
        item.color.gradient.from,
        item.color.gradient.to,
      ]),
    );
  if (paints.length && paints.every((c) => luminance(c) > 0.6))
    return "#333333";
  if (paints.some((c) => luminance(c) > 0.6)) return "#999999";
  return "#eeeeee";
}
export function resetColorChoices(p) {
  p.colorSelection = {};
  p.selectedDescriptors = {};
  p.excluded = [];
  p.excludedFiles = [];
}
export function assetsFor(p) {
  return [
    ...(p.mode === "compose" ? Object.entries(p.assets)
      .filter(([, asset]) => asset)
      .map(([key, asset]) => ({ key, name: key, asset })) : []),
    ...(p.ready || []).map((v) => ({ key: v.id, name: v.name, asset: v.asset })),
  ];
}
export function rolePanel(p) {
  return `<section class="role-panel"><h2>${t("Couleurs du logo")}</h2>${assetsFor(
    p,
  )
    .map(
      ({ key, name, asset }) =>
        `<div class="asset-colours"><h3 data-no-i18n>${esc(key === "icon" ? t("Icône") : key === "wordmark" ? t("Logotype") : name)}</h3><div class="colour-inspection" data-inspection="${key}">${assetMarkup(asset, null, "inspect-" + key)}</div><div class="colour-chips">${(asset.roles || []).map((r, i) => `<button data-highlight-asset="${key}" data-highlight-role="${esc(r.id)}" aria-pressed="false"><i class="paint-dot" style="background:${r.paint}"></i>${t("Couleur")} ${i + 1}${r.locked ? " 🔒" : ""}</button>`).join("")}</div><details class="optional" data-disclosure="roles-${key}"><summary>${t("Ajuster les couleurs manuellement")}</summary>${(asset.roles || []).map((r, i) => `<div class="role-row" data-role-row="${esc(r.id)}"><input aria-label="${t("Couleur")} ${i + 1}" type="color" data-role-asset="${key}" data-role-index="${i}" data-role-field="paint" value="${r.paint}"><input aria-label="${t("Nom de couleur")}" data-role-asset="${key}" data-role-index="${i}" data-role-field="name" value="${esc(r.name)}"><label><input type="checkbox" data-role-asset="${key}" data-role-index="${i}" data-role-field="locked" ${r.locked ? "checked" : ""}>${t("Conserver cette couleur dans les variantes")}</label>${r.targets.length > 1 ? `<button data-split-role="${key}:${i}">${t("Séparer les éléments")}</button>` : ""}</div>`).join("")}<button data-merge-roles="${key}">${t("Fusionner les couleurs identiques")}</button></details></div>`,
    )
    .join("")}</section>`;
}
export function bindRoles(p, edit, root = document) {
  const asset = (key) => assetsFor(p).find((a) => a.key === key)?.asset;
  root.querySelectorAll("[data-highlight-role]").forEach(
    (el) =>
      (el.onclick = () => {
        const key = el.dataset.highlightAsset,
          active = el.getAttribute("aria-pressed") !== "true";
        root
          .querySelectorAll(`[data-highlight-asset="${key}"]`)
          .forEach((b) =>
            b.setAttribute("aria-pressed", String(b === el && active)),
          );
        root.querySelector(`[data-inspection="${key}"]`).innerHTML =
          assetMarkup(
            asset(key),
            active ? { highlight: el.dataset.highlightRole } : null,
            "inspect-" + key,
          );
      }),
  );
  root.querySelectorAll("[data-role-field]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          const r = asset(el.dataset.roleAsset).roles[+el.dataset.roleIndex];
          for (const { asset: source } of assetsFor(p))
            for (const role of source.roles || [])
              if (role.id === r.id)
                role[el.dataset.roleField] =
                  el.type === "checkbox" ? el.checked : el.value;
          resetColorChoices(p);
        })),
  );
  root.querySelectorAll("[data-split-role]").forEach(
    (el) =>
      (el.onclick = () =>
        edit(() => {
          const [key, index] = el.dataset.splitRole.split(":");
          const a = asset(key),
            role = a.roles[+index];
          a.roles.splice(
            +index,
            1,
            ...role.targets.map((target, i) => ({
              ...role,
              id: role.id + "-" + crypto.randomUUID(),
              name: role.name + " " + (i + 1),
              targets: [target],
            })),
          );
          resetColorChoices(p);
        })),
  );
  root.querySelectorAll("[data-merge-roles]").forEach(
    (el) =>
      (el.onclick = () =>
        edit(() => {
          const a = asset(el.dataset.mergeRoles),
            groups = new Map();
          for (const r of a.roles) {
            const key = r.paint + ":" + r.locked;
            if (!groups.has(key))
              groups.set(key, {
                ...r,
                id: "paint-" + r.paint.slice(1) + (r.locked ? "-locked" : ""),
                targets: [],
              });
            groups.get(key).targets.push(...r.targets);
          }
          a.roles = [...groups.values()];
          resetColorChoices(p);
        })),
  );
}
function accordion(id, label, summary, body) {
  return `<details class="workflow-section" data-section="${id}" ${opened.has(id) ? "open" : ""}><summary><strong>${t(label)}</strong><span>${summary}</span></summary><div class="workflow-body">${body}</div></details>`;
}
function scope(p) {
  return p.enabled.filter((v) => filter === "all" || filter === v);
}
function count(p, cat) {
  return scope(p).reduce((sum, v) => sum + selectedCount(p, v, cat), 0n);
}
function suggestedItems(p, cat) {
  const variants = scope(p),
    result = [];
  for (let i = 0n; result.length < 12 && i < 12n; i++) {
    for (const v of variants) {
      const item = catalog(p, v, cat).at(i);
      if (item && result.length < 12) result.push(item);
    }
  }
  return result;
}
function pageItems(p, cat, page) {
  let offset = page * PAGE;
  const out = [];
  for (const variant of scope(p)) {
    const c = catalog(p, variant, cat);
    if (offset >= c.size) {
      offset -= c.size;
      continue;
    }
    for (let i = offset; i < c.size && out.length < Number(PAGE); i++)
      out.push(c.at(i));
    offset = 0n;
    if (out.length === Number(PAGE)) break;
  }
  return out;
}
export function mountWorkshop(p, edit, runExport, step = workshopStep) {
  workshopStep = step;
  if (filter !== "all" && !variantIds(p).includes(filter)) filter = "all";
  const main = document.querySelector(".editor-main");
  const toolsOpen = main.querySelector(".combination-tools")?.open;
  const opts = variantIds(p)
    .map(
      (v) =>
        `<option value="${v}" ${filter === v ? "selected" : ""}>${esc(variantName(p, v))}</option>`,
    )
    .join("");
  main.innerHTML = `<div class="family-heading"><div class="eyebrow">02 / ${t("Sélection finale")}</div><h1>${t("Choisir les couleurs, puis la livraison.")}</h1></div><div class="family-tools"><button id="full-system" title="${t("Génère toutes les combinaisons possibles.")}">${t("Système complet")}</button><small>${t("Génère toutes les combinaisons possibles.")}</small><select id="construction-filter" aria-label="${t("Toutes les constructions")}"><option value="all">${t("Toutes les constructions")}</option>${opts}</select><button data-bulk-all="all">${t("Tout sélectionner")}</button><button data-bulk-all="none">${t("Tout désélectionner")}</button><button data-bulk-all="recommended">${t("Recommandées uniquement")}</button></div>`;
  main.insertAdjacentHTML(
    "beforeend",
    accordion(
      "constructions",
      "Variantes du logo",
      p.enabled.length,
      variantIds(p)
        .map(
          (v) =>
            `<label class="check"><input type="checkbox" data-work-variant="${v}" ${p.enabled.includes(v) ? "checked" : ""}><span data-no-i18n>${esc(variantName(p, v))}</span></label>`,
        )
        .join(""),
    ),
  );
  main.insertAdjacentHTML(
    "beforeend",
    accordion("roles", "Rôles colorimétriques", "", rolePanel(p)),
  );
  const displayed = [];
  for (const cat of CATEGORIES) {
    const total = scope(p).reduce(
        (sum, v) => sum + catalog(p, v, cat).size,
        0n,
      ),
      max = total ? (total - 1n) / PAGE : 0n;
    let page = pages[cat] || 0n;
    if (page > max) page = max;
    pages[cat] = page;
    const visible =
      step !== "delivery" && (galleryFilter === "all" || galleryFilter === cat);
    const items =
      visible && opened.has(cat)
        ? fullCatalog || cat === "mono" || cat === "original"
          ? pageItems(p, cat, page)
          : suggestedItems(p, cat)
        : [];
    displayed.push(...items);
    const cards = items
      .map(
        (item) =>
          `<article class="delivery ${selectedItem(p, item) ? "selected" : ""}"><label><input type="checkbox" aria-label="${esc(variantName(p, item.variant))} · ${esc(item.color.name)}" data-work-select="${esc(item.id)}" ${selectedItem(p, item) ? "checked" : ""}><span data-no-i18n>${esc(variantName(p, item.variant))}</span><small data-no-i18n>${esc(item.color.name)}</small><div class="delivery-preview checker" style="background-color:${previewBackground(p, item)}">${compositionSVG(p, item.variant, item.color)}</div></label><button data-framing="${esc(item.id)}">${t("Taille du logo dans l’image")}</button><button data-work-single="${esc(item.id)}">${t("Exporter cette déclinaison")}</button>${item.color.gradient ? `<button data-gradient-edit="${item.color.id}">${t("Modifier le dégradé")}</button>` : ""}</article>`,
      )
      .join("");
    main.insertAdjacentHTML(
      "beforeend",
      accordion(
        cat,
        labels[cat],
        `${count(p, cat)} ${t("sélectionnées")}${fullCatalog ? " / " + total : ""}`,
        `<div class="family-tools"><button data-bulk="${cat}:all">${t("Tout sélectionner")}</button><button data-bulk="${cat}:none">${t("Tout désélectionner")}</button></div><div class="family-grid">${cards || t("Aucune variante dans cette catégorie.")}</div><div class="pagination"><button data-page="${cat}:-1" ${!page ? "disabled" : ""}>${t("Précédente")}</button><label>${t("Page")} <input data-page-input="${cat}" aria-label="${t("Aller à la page")}" inputmode="numeric" value="${page + 1n}"> / ${max + 1n}</label><button data-page="${cat}:1" ${page === max ? "disabled" : ""}>${t("Suivante")}</button></div>`,
      ),
    );
  }
  main.insertAdjacentHTML("beforeend", accordion("jpeg", "JPEG", "", '<div id="jpeg-gallery"></div>'));
  let items = [],
    jobs = [],
    allJobs = [],
    error = "";
  try {
    items = deliveries(p, selectedItems(p));
    allJobs = exportPlan(p, items, true);
    jobs = exportPlan(p, items);
  } catch (e) {
    error = t(e.message);
  }
  const totalFiles=jobs.length+guidelineFileCount(p),fileCount=totalFiles+(totalFiles>1?1:0);
  const finalJobs = allJobs.filter(
    (j) =>
      (filter === "all" || (j.item?.variant || j.variant) === filter) &&
      (finalCategory === "all" ||
        (j.tone ? "clearspace" : j.item?.category) === finalCategory) &&
      (finalFormat === "all" || j.format === finalFormat) &&
      (finalBg === "all" ||
        (finalBg === "transparent"
          ? !j.item?.background
          : j.item?.background?.id === finalBg)),
  );
  finalPage = Math.max(
    0,
    Math.min(finalPage, Math.ceil(finalJobs.length / 60) - 1),
  );
  main.insertAdjacentHTML(
    "beforeend",
    accordion(
      "final",
      "Sélection finale",
      error ||
        `${fileCount} ${t("fichiers à exporter")}`,
      `<div class="family-tools"><select id="final-category" aria-label="${t("Toutes les catégories")}"><option value="all">${t("Toutes les catégories")}</option>${[...CATEGORIES, "clearspace"].map((c) => `<option value="${c}" ${finalCategory === c ? "selected" : ""}>${t(labels[c] || "Clearspace")}</option>`).join("")}</select><select id="final-format" aria-label="${t("Tous les formats")}"><option value="all">${t("Tous les formats")}</option>${p.exports.formats.map((f) => `<option value="${f}" ${finalFormat === f ? "selected" : ""}>${f.toUpperCase()}</option>`).join("")}</select><select id="final-background" aria-label="${t("Tous les fonds JPEG")}"><option value="all">${t("Tous les fonds JPEG")}</option><option value="transparent" ${finalBg === "transparent" ? "selected" : ""}>${t("Transparent")}</option>${colors(
        p,
      )
        .filter((c) => c.hex)
        .map(
          (c) =>
            `<option value="${c.id}" ${finalBg === c.id ? "selected" : ""}>${esc(c.name)}</option>`,
        )
        .join(
          "",
        )}</select><button id="exclude-final">${t("Tout désélectionner")}</button></div><p role="status">${esc(error || `${fileCount} ${t("fichiers à exporter")}`)}</p><div class="final-list">${finalJobs
        .slice(finalPage * 60, finalPage * 60 + 60)
        .map(
          (j) =>
            `<label><input type="checkbox" ${p.excludedFiles?.includes(j.key) || p.excludedFiles?.includes(j.path) ? "" : "checked"} data-file-select="${esc(j.key)}"><span data-no-i18n>${esc(j.path.split("/").pop())}</span></label>`,
        )
        .join(
          "",
        )}</div><div class="pagination"><button id="final-prev" ${!finalPage ? "disabled" : ""}>${t("Précédente")}</button><span>${finalPage + 1} / ${Math.max(1, Math.ceil(finalJobs.length / 60))}</span><button id="final-next" ${(finalPage + 1) * 60 >= finalJobs.length ? "disabled" : ""}>${t("Suivante")}</button></div>`,
    ),
  );
  main.dataset.workshopStep = step;
  main.classList.toggle("full-catalog", fullCatalog);
  main.querySelector(".family-heading").innerHTML =
    `<div class="eyebrow">${step === "delivery" ? (p.mode==="clearspace"?"03":"05") : "03"} / ${t(step === "delivery" ? "Exporter" : "Variantes")}</div><h1>${t(step === "delivery" ? "Votre Logo Kit est prêt à partir." : "Choisissez visuellement les versions à livrer.")}</h1>`;
  const toolbar = main.querySelector(".family-tools");
  const custom = document.createElement("details");
  custom.className = "combination-tools";
  custom.innerHTML = `<summary>${t("Personnaliser les combinaisons")}</summary>`;
  toolbar.before(custom);
  custom.append(toolbar);
  custom.open = !!toolsOpen;
  custom.append(main.querySelector('[data-section="constructions"]'));
  main.querySelector('[data-section="roles"]').remove();
  main.querySelectorAll("[data-section]").forEach((el) => {
    const cat = el.dataset.section;
    if (CATEGORIES.includes(cat))
      el.hidden = step === "delivery" || galleryFilter !== cat;
    if ([...CATEGORIES, "jpeg"].includes(cat)) {
      el.id = "category-" + cat;
      el.setAttribute("role", "tabpanel");
      el.classList.add("category-panel");
    }
  });
  if (step === "family") {
    const nav = document.createElement("div");
    nav.className = "gallery-filters";
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", t("Versions du logo"));
    nav.innerHTML =
      [
        ["original", "Original"],
        ["mono", "Une seule couleur"],
        ["multi", "Plusieurs couleurs"],
        ["gradient", "Dégradés"],
        ["jpeg", "JPEG"],
      ]
        .map(
          ([id, label]) =>
            `<button role="tab" data-gallery-filter="${id}" aria-controls="category-${id}" tabindex="${galleryFilter === id ? 0 : -1}" aria-selected="${galleryFilter === id}" aria-pressed="${galleryFilter === id}">${t(label)}</button>`,
        )
        .join("") +
      `<button data-catalog-toggle ${["original", "mono", "jpeg"].includes(galleryFilter) ? "hidden" : ""} aria-pressed="${fullCatalog}">${t(fullCatalog ? "Suggestions" : "Tout voir")}</button>`;
    main.querySelector(".family-heading").after(nav);
    const selectionBar = document.createElement("div");
    selectionBar.className = "selection-bar";
    selectionBar.innerHTML = `<strong role="status">${p.enabled.reduce((sum,v) => sum+CATEGORIES.reduce((n,c) => n+selectedCount(p,v,c),0n),0n)} ${t("versions sélectionnées")}</strong><button data-recommendations>${t("Recommandées")}</button>`;
    nav.after(selectionBar);
    selectionBar.querySelector("button").onclick = () => edit(() => setCategory(p,p.enabled,CATEGORIES,"recommended"));
    nav.querySelectorAll("[data-gallery-filter]").forEach(
      (el) =>
        (el.onclick = () => {
          galleryFilter = el.dataset.galleryFilter;
          opened.add(galleryFilter);
          mountWorkshop(p, edit, runExport);
        }),
    );
    nav.querySelector("[data-catalog-toggle]").onclick = () => {
      fullCatalog = !fullCatalog;
      mountWorkshop(p, edit, runExport);
    };
    main.querySelector('[data-section="final"]').hidden = true;
    main.querySelector('[data-section="jpeg"]').hidden = galleryFilter !== "jpeg";
    if (galleryFilter === "jpeg") main.querySelector('[data-section="jpeg"]').open = true;
    nav.querySelectorAll("[data-gallery-filter]").forEach(el => el.onkeydown = e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const tabs=[...nav.querySelectorAll("[data-gallery-filter]")], index=tabs.indexOf(el);
      const next=e.key==="Home"?tabs[0]:e.key==="End"?tabs.at(-1):tabs[(index+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length];
      galleryFilter=next.dataset.galleryFilter; opened.add(galleryFilter); mountWorkshop(p,edit,runExport);
      main.querySelector(`[data-gallery-filter="${galleryFilter}"]`).focus();
    });
  } else {
    custom.hidden = true;
    // Keep the final-file construction filter usable independently of the gallery.
    main
      .querySelector('[data-section="final"] .family-tools')
      .prepend(main.querySelector("#construction-filter"));
    main.querySelector('[data-section="constructions"]').hidden = true;
    const summary = document.createElement("section");
    summary.className = "kit-summary";
    summary.innerHTML = `<div class="kit-previews">${p.enabled
      .filter((v) => catalog(p, v, "original").size)
      .map(
        (v) =>
          `<div>${p.mode === "clearspace" ? clearspaceSVG(p,v) : compositionSVG(p, v)}<span data-no-i18n>${esc(variantName(p, v))}</span>${p.exports.clearspace ? `<small class="summary-measure">${t("Zone de sécurité")} · ${clearMeasure(p,v).space.toFixed(2)} ${t("unités")}</small>` : ""}</div>`,
      )
      .join(
        "",
      )}</div>${p.mode !== "clearspace" && p.colors.length ? `<div class="summary-colors" aria-label="${t("Palette de couleurs")}">${p.colors.map(c => `<span title="${esc(c.name)} · ${c.hex}" style="background:${c.hex}"></span>`).join("")}</div>` : ""}<div class="kit-metrics"><span><strong>${p.enabled.filter(v => catalog(p,v,"original").size).length}</strong>${t("versions du logo")}</span><span><strong>${p.enabled.reduce((sum,v) => sum+CATEGORIES.reduce((n,c) => n+selectedCount(p,v,c),0n),0n)}</strong>${t(p.mode === "clearspace" ? "zones de sécurité" : "déclinaisons")}</span><span><strong>${error ? "—" : fileCount}</strong>${t("fichiers")}</span></div><h2>${t(p.mode === "clearspace" ? "Vos zones de sécurité" : "Logo Kit complet")}</h2><p>${t("Vos variantes sélectionnées, leurs fichiers et les recommandations dans un ZIP.")}</p><p>${p.exports.formats.map((f) => f.toUpperCase()).join(" · ")} · WEB · 72 DPI / PRINT · 300 DPI</p><button class="primary" id="export-kit" ${error || !jobs.length ? "disabled" : ""}>${t("Exporter le Logo Kit complet")}</button><p role="status">${esc(error || String(fileCount) + " " + t("fichiers à exporter"))}</p>`;
    main.querySelector(".family-heading").after(summary);
    if (p.mode === "clearspace") summary.querySelector("#export-kit").textContent = t("Exporter les zones de sécurité");
    summary.querySelector("#export-kit").onclick = () => runExport(items);
  }
  const versionCount = document.querySelector(".selected-versions");
  if (versionCount) versionCount.textContent = `${p.enabled.reduce((sum,v) => sum+CATEGORIES.reduce((n,c) => n+selectedCount(p,v,c),0n),0n)} ${t("versions sélectionnées")}`;
  const countTarget = document.querySelector("#selection-count");
  if (countTarget) countTarget.textContent =
    error ||
    `${fileCount} ${t("fichiers à exporter")}`;
  if (document.querySelector('[data-action="export"]'))
    document.querySelector('[data-action="export"]').onclick = () => {
      if (error) return;
      runExport(deliveries(p, selectedItems(p)));
    };
  main.querySelectorAll("[data-section]").forEach(
    (el) =>
      (el.ontoggle = () => {
        const id = el.dataset.section;
        if (el.open === opened.has(id)) return;
        el.open ? opened.add(id) : opened.delete(id);
        if (CATEGORIES.includes(id)) mountWorkshop(p, edit, runExport);
      }),
  );
  main.querySelector("#construction-filter").onchange = (e) => {
    filter = e.target.value;
    for (const cat of CATEGORIES) pages[cat] = 0n;
    mountWorkshop(p, edit, runExport);
  };
  main.querySelectorAll("[data-work-variant]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          p.enabled = el.checked
            ? [...p.enabled, el.dataset.workVariant]
            : p.enabled.filter((v) => v !== el.dataset.workVariant);
        })),
  );
  main.querySelector("#full-system").onclick = () =>
    edit(() => {
      p.enabled = variantIds(p);
      p.excluded = [];
      p.excludedFiles = [];
      setCategory(p, p.enabled, CATEGORIES, "all");
    });
  const bulk = (categories, mode) =>
    edit(() => setCategory(p, scope(p), categories, mode));
  main.querySelectorAll("[data-bulk]").forEach(
    (el) =>
      (el.onclick = () => {
        const [cat, mode] = el.dataset.bulk.split(":");
        bulk([cat], mode);
      }),
  );
  main
    .querySelectorAll("[data-bulk-all]")
    .forEach((el) => (el.onclick = () => bulk(CATEGORIES, el.dataset.bulkAll)));
  main.querySelectorAll("[data-work-select]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          p.colorSelection ||= {};
          p.selectedDescriptors ||= {};
          p.colorSelection[el.dataset.workSelect] = el.checked;
          p.selectedDescriptors[el.dataset.workSelect] = displayed.find(
            (i) => i.id === el.dataset.workSelect,
          );
        })),
  );
  main
    .querySelectorAll("[data-work-single]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          runExport(
            deliveries(p, [
              displayed.find((i) => i.id === el.dataset.workSingle),
            ]),
          )),
    );
  main.querySelectorAll("[data-page]").forEach(
    (el) =>
      (el.onclick = () => {
        const [cat, delta] = el.dataset.page.split(":");
        pages[cat] = (pages[cat] || 0n) + BigInt(delta);
        mountWorkshop(p, edit, runExport);
      }),
  );
  main.querySelectorAll("[data-page-input]").forEach(
    (el) =>
      (el.onchange = () => {
        if (/^\d+$/.test(el.value) && BigInt(el.value) > 0n)
          pages[el.dataset.pageInput] = BigInt(el.value) - 1n;
        mountWorkshop(p, edit, runExport);
      }),
  );
  const jpeg = main.querySelector('[data-section="jpeg"]');
  jpeg.hidden = p.mode === "clearspace" || step === "delivery" || galleryFilter !== "jpeg";
  if (!jpeg.hidden) mountJpegGallery(main.querySelector("#jpeg-gallery"), p, scope(p), edit, () => mountWorkshop(p,edit,runExport));
  main.querySelectorAll('[data-framing]').forEach(el=>el.onclick=()=>{const item=displayed.find(i=>i.id===el.dataset.framing);if(item)editFraming(p,item,edit);});
  if(step === 'family' && galleryFilter === 'gradient') {
    const button=document.createElement('button');button.className='primary';button.dataset.createGradient='';button.textContent=t('Créer un dégradé');
    main.querySelector('.selection-bar').after(button);
    button.onclick=()=>{const variant=scope(p).find(v=>rolesFor(p,v).some(r=>!r.locked));if(!variant)return;
      const from=p.colors[0]?.hex||'#000000',to=p.colors[1]?.hex||from;
      editGradient(p,{variant,color:{id:'draft',gradient:{id:'g-'+crypto.randomUUID(),name:t('Dégradé')+' '+(p.gradients.length+1),from,to,mode:'global',angle:0}}},edit);
    };
  }
  main.querySelectorAll("[data-gradient-edit]").forEach(
    (el) =>
      (el.onclick = () => {
        const id = el.closest(".delivery").querySelector("[data-work-select]")
          .dataset.workSelect;
        const item = displayed.find((i) => i.id === id);
        if (item) editGradient(p, item, edit);
      }),
  );
  const remove = (paths) =>
    edit(() => {
      p.excludedFiles = [...new Set([...(p.excludedFiles || []), ...paths])];
    });
  main.querySelectorAll("[data-file-select]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          p.excludedFiles = el.checked
            ? (p.excludedFiles || []).filter(
                (x) =>
                  x !== el.dataset.fileSelect &&
                  x !==
                    allJobs.find((j) => j.key === el.dataset.fileSelect)?.path,
              )
            : [...(p.excludedFiles || []), el.dataset.fileSelect];
        })),
  );
  main.querySelector("#exclude-final").onclick = () =>
    remove(finalJobs.map((j) => j.key));
  main.querySelector("#final-category").onchange = (e) => {
    finalCategory = e.target.value;
    mountWorkshop(p, edit, runExport);
  };
  main.querySelector("#final-background").onchange = (e) => {
    finalBg = e.target.value;
    mountWorkshop(p, edit, runExport);
  };
  main.querySelector("#final-format").onchange = (e) => {
    finalFormat = e.target.value;
    mountWorkshop(p, edit, runExport);
  };
  main.querySelector("#final-prev").onclick = () => {
    finalPage--;
    mountWorkshop(p, edit, runExport);
  };
  main.querySelector("#final-next").onclick = () => {
    finalPage++;
    mountWorkshop(p, edit, runExport);
  };
  bindRoles(p, edit, main);
  translateDOM(main);
  const tabs = main.querySelector(".gallery-filters");
  const activeTab = tabs?.querySelector('[aria-selected="true"]');
  if (activeTab) {
    const right = activeTab.offsetLeft + activeTab.offsetWidth;
    if (right > tabs.scrollLeft + tabs.clientWidth) tabs.scrollLeft = right - tabs.clientWidth;
    else if (activeTab.offsetLeft < tabs.scrollLeft) tabs.scrollLeft = activeTab.offsetLeft;
  }
}
