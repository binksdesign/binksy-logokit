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
} from "./model.js";
import { compositionSVG } from "./svg.js";
import { exportPlan, jpegPreview } from "./export.js";
import { gradientOptions } from "./paints.js";
import { esc } from "./ui.js";
import { t, translateDOM } from "./i18n.js";
const labels = {
  original: "Original",
  mono: "Couleurs simples",
  multi: "Variantes multicolores",
  gradient: "Dégradés",
};
const pages = {},
  opened = new Set(["constructions", "original"]);
let filter = "all",
  finalCategory = "all",
  finalBg = "all",
  finalFormat = "all",
  finalPage = 0;
const PAGE = 12n;
function previewBackground(p, item) {
  const paints = rolesFor(p, item.variant).map((r) =>
    r.locked
      ? r.paint
      : item.color.mapping?.[r.id] || item.color.hex || r.paint,
  );
  if (item.color.gradient)
    paints.push(item.color.gradient.from, item.color.gradient.to);
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
  return p.mode === "ready"
    ? p.ready.map((v) => ({ key: v.id, name: v.name, asset: v.asset }))
    : Object.entries(p.assets)
        .filter(([, asset]) => asset)
        .map(([key, asset]) => ({ key, name: key, asset }));
}
export function rolePanel(p) {
  return `<section class="role-panel"><div class="section-title">${t("Rôles colorimétriques")}</div><p class="muted">${t("Les rôles de même identifiant sont partagés entre les constructions. Les stops restent dans leurs dégradés.")}</p>${assetsFor(
    p,
  )
    .map(
      ({ key, name, asset }) =>
        `<details><summary data-no-i18n>${esc(name)} · ${asset.roles?.length || 0}</summary>${(asset.roles || []).map((r, i) => `<div class="role-row" data-role-row="${esc(r.id)}"><input aria-label="${t("Couleur du rôle")}" type="color" data-role-asset="${key}" data-role-index="${i}" data-role-field="paint" value="${r.paint}"><input aria-label="${t("Nom du rôle")}" data-role-asset="${key}" data-role-index="${i}" data-role-field="name" value="${esc(r.name)}"><label><input type="checkbox" data-role-asset="${key}" data-role-index="${i}" data-role-field="locked" ${r.locked ? "checked" : ""}>${t("Verrouiller")}</label><details><summary>${t("Éléments")} · ${r.targets.length}</summary><small>${r.targets.map((x) => `${x.index} / ${x.prop}`).join(", ")}</small>${r.targets.length > 1 ? `<button data-split-role="${key}:${i}">${t("Séparer les éléments")}</button>` : ""}</details></div>`).join("")}<button data-merge-roles="${key}">${t("Fusionner les couleurs identiques")}</button></details>`,
    )
    .join(
      "",
    )}<p class="muted">${t("Les modifications des rôles ou de la palette réinitialisent les choix de couleurs générées.")}</p></section>`;
}
export function bindRoles(p, edit, root = document) {
  const asset = (key) => assetsFor(p).find((a) => a.key === key)?.asset;
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
export function mountWorkshop(p, edit, runExport) {
  const main = document.querySelector(".editor-main");
  const opts = variantIds(p)
    .map(
      (v) =>
        `<option value="${v}" ${filter === v ? "selected" : ""}>${esc(variantName(p, v))}</option>`,
    )
    .join("");
  main.innerHTML = `<div class="family-heading"><div class="eyebrow">02 / ${t("Sélection finale")}</div><h1>${t("Choisir les couleurs, puis la livraison.")}</h1></div><div class="family-tools"><button class="primary" id="full-system">Full System</button><select id="construction-filter" aria-label="${t("Toutes les constructions")}"><option value="all">${t("Toutes les constructions")}</option>${opts}</select><button data-bulk-all="all">${t("Tout sélectionner")}</button><button data-bulk-all="none">${t("Tout désélectionner")}</button><button data-bulk-all="recommended">${t("Recommandées uniquement")}</button></div>`;
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
    const items = opened.has(cat) ? pageItems(p, cat, page) : [];
    displayed.push(...items);
    const cards = items
      .map(
        (item) =>
          `<article class="delivery ${selectedItem(p, item) ? "selected" : ""}"><label><input type="checkbox" aria-label="${esc(variantName(p, item.variant))} · ${esc(item.color.name)}" data-work-select="${esc(item.id)}" ${selectedItem(p, item) ? "checked" : ""}><span data-no-i18n>${esc(variantName(p, item.variant))}</span><small data-no-i18n>${esc(item.color.name)}</small><div class="delivery-preview checker" style="background-color:${previewBackground(p, item)}">${compositionSVG(p, item.variant, item.color)}</div></label><button data-work-single="${esc(item.id)}">${t("Exporter cette déclinaison")}</button>${item.color.gradient ? `<button data-gradient-edit="${item.color.id}">${t("Modifier le dégradé")}</button>` : ""}</article>`,
      )
      .join("");
    main.insertAdjacentHTML(
      "beforeend",
      accordion(
        cat,
        labels[cat],
        `${count(p, cat)} ${t("sélectionnées")} / ${total}`,
        `<div class="family-tools"><button data-bulk="${cat}:all">${t("Tout sélectionner")}</button><button data-bulk="${cat}:none">${t("Tout désélectionner")}</button></div><div class="family-grid">${cards || t("Aucune variante dans cette catégorie.")}</div><div class="pagination"><button data-page="${cat}:-1" ${!page ? "disabled" : ""}>${t("Précédente")}</button><label>${t("Page")} <input data-page-input="${cat}" aria-label="${t("Aller à la page")}" inputmode="numeric" value="${page + 1n}"> / ${max + 1n}</label><button data-page="${cat}:1" ${page === max ? "disabled" : ""}>${t("Suivante")}</button></div>`,
      ),
    );
  }
  const pairItems = [
    ...new Map(
      [
        ...scope(p).flatMap((v) => [
          catalog(p, v, "original").at(0n),
          ...colors(p)
            .filter((c) => c.hex)
            .map((color) => ({ variant: v, id: v + ":" + color.id, color })),
        ]),
        ...displayed,
      ]
        .filter(Boolean)
        .map((i) => [i.color.id, i]),
    ).values(),
  ];
  main.insertAdjacentHTML(
    "beforeend",
    accordion(
      "jpeg",
      "Associations JPEG",
      `${Object.keys(p.jpegGlobal || {}).length}`,
      `<p>${t("Ces choix s’appliquent à toutes les constructions compatibles.")}</p><button id="reset-global-pairs">${t("Revenir aux recommandations")}</button>${pairItems
        .map(
          (item, index) =>
            `<details data-pair-preview="${index}"><summary data-no-i18n>${esc(item.color.name)}</summary><div class="pair-grid">${jpegPairs(
              p,
              item,
            )
              .map(
                (pair) =>
                  `<label class="pair-option"><input type="checkbox" data-global-pair="${esc(pair.globalId)}" ${pair.enabled ? "checked" : ""}><span class="pair-swatch" style="background:${pair.background.hex};color:${item.color.hex || "#888"}">Aa</span><span data-no-i18n>${esc(pair.background.name)} · ${pair.ratio.toFixed(1)}:1</span></label>`,
              )
              .join("")}</div></details>`,
        )
        .join("")}`,
    ),
  );
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
        `${jobs.length + (jobs.length > 1 ? 1 : 0)} ${t("fichiers à exporter")}`,
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
        )}</select><button id="exclude-final">${t("Tout désélectionner")}</button></div><p role="status">${esc(error || `${jobs.length + (jobs.length > 1 ? 1 : 0)} ${t("fichiers à exporter")}`)}</p><div class="final-list">${finalJobs
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
  document.querySelector("#selection-count").textContent =
    error ||
    `${jobs.length + (jobs.length > 1 ? 1 : 0)} ${t("fichiers à exporter")}`;
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
      setCategory(p, p.enabled, CATEGORIES, "recommended");
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
  main.querySelectorAll("[data-global-pair]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          p.jpegGlobal ||= {};
          p.jpegGlobal[el.dataset.globalPair] = el.checked;
        })),
  );
  main.querySelectorAll("[data-pair-preview]").forEach(
    (el) =>
      (el.ontoggle = () => {
        if (!el.open || el.dataset.rendered) return;
        el.dataset.rendered = "true";
        const item = pairItems[+el.dataset.pairPreview];
        const pairs = jpegPairs(p, item);
        el.querySelectorAll(".pair-swatch").forEach((swatch, index) => {
          swatch.innerHTML = jpegPreview(p, pairs[index]);
        });
      }),
  );
  main.querySelector("#reset-global-pairs").onclick = () =>
    edit(() => {
      p.jpegGlobal = {};
      p.jpegOverrides = {};
    });
  main.querySelectorAll("[data-gradient-edit]").forEach(
    (el) =>
      (el.onclick = () => {
        const g = gradientOptions(p).find(
          (g) => g.id === el.dataset.gradientEdit,
        );
        const dialog = document.createElement("dialog");
        dialog.innerHTML = `<form method="dialog"><h2>${t("Modifier le dégradé")}</h2><label>${t("Début du dégradé")}<input name="from" type="color" value="${g.from}"></label><label>${t("Fin du dégradé")}<input name="to" type="color" value="${g.to}"></label><label>${t("Angle du dégradé")}<input name="angle" type="number" value="${g.angle || 0}" min="-360" max="360"></label><button value="cancel">${t("Annuler")}</button><button class="primary" value="apply">${t("Appliquer")}</button></form>`;
        document.body.append(dialog);
        dialog.showModal();
        dialog.onclose = () => {
          if (dialog.returnValue === "apply") {
            const f = dialog.querySelector("form");
            edit(() => {
              p.gradients = p.gradients.filter((x) => x.id !== g.id);
              p.gradients.push({
                ...g,
                from: f.elements.from.value,
                to: f.elements.to.value,
                angle: +f.elements.angle.value,
              });
            });
          }
          dialog.remove();
        };
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
}
