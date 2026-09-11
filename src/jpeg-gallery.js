import { editFraming } from "./format-editor.js";
import { catalog, CATEGORIES, selectedItem, selectedItems } from "./catalog.js";
import { backgrounds, jpegPairs, variantName } from "./model.js";
import { jpegPreview, exportPlan } from "./export.js";
import { esc } from "./ui.js";
import { t } from "./i18n.js";
let page = 0n,
  category = "selected";
const PAGE = 12n;
export function mountJpegGallery(root, p, variants, edit, refresh) {
  const bgs = backgrounds(p);
  let selected = [],
    warning = "";
  if (category === "selected") {
    try {
      selected = selectedItems(p).filter((i) => variants.includes(i.variant));
    } catch {
      warning = t(
        "Sélection très étendue : parcourez les catégories pour ajuster les JPEG.",
      );
    }
  }
  const groups =
    category === "selected"
      ? [{ size: BigInt(selected.length), at: (i) => selected[Number(i)] }]
      : variants.flatMap((v) =>
          (category === "all" ? CATEGORIES : [category]).map((c) =>
            catalog(p, v, c),
          ),
        );
  const total = groups.reduce((n, g) => n + g.size, 0n) * BigInt(bgs.length);
  const max = total ? (total - 1n) / PAGE : 0n;
  page = page < 0n ? 0n : page > max ? max : page;
  const pairs = [];
  for (let i = page * PAGE; i < total && pairs.length < Number(PAGE); i++) {
    let index = i / BigInt(bgs.length);
    let item;
    for (const group of groups) {
      if (index < group.size) {
        item = group.at(index);
        break;
      }
      index -= group.size;
    }
    const pair = jpegPairs(p, item)[Number(i % BigInt(bgs.length))];
    const jobs = exportPlan(
      { ...p, exports: { ...p.exports, formats: ["jpeg"], clearspace: false } },
      [pair],
      true,
    );
    pairs.push({ pair, item, jobs });
  }
  root.innerHTML = `<div class="jpeg-toolbar"><label>${t("Afficher")}<select id="jpeg-category">${[
    ["selected", "Versions sélectionnées"],
    ["all", "Tout voir"],
    ["original", "Original"],
    ["mono", "Une seule couleur"],
    ["multi", "Plusieurs couleurs"],
    ["gradient", "Dégradés"],
  ]
    .map(
      ([id, label]) =>
        `<option value="${id}" ${category === id ? "selected" : ""}>${t(label)}</option>`,
    )
    .join(
      "",
    )}</select></label><button id="reset-global-pairs">${t("Revenir aux recommandations")}</button></div>${!p.exports.formats.includes("jpeg") ? `<p class="jpeg-format-note">${t("JPEG n’est pas activé pour l’export.")} <button id="enable-jpeg">${t("Inclure les JPEG")}</button></p>` : ""}<p>${t("Chaque aperçu montre le fond et la marge du fichier JPEG.")}</p>${warning ? `<p role="status">${warning}</p>` : ""}<div class="family-grid jpeg-grid">${
    pairs
      .map(({ pair, item, jobs }, i) => {
        const included =
          selectedItem(p, item) &&
          pair.enabled &&
          !p.excluded.includes(pair.id) &&
          jobs.some(
            (job) =>
              !p.excludedFiles?.includes(job.key) &&
              !p.excludedFiles?.includes(job.path),
          );
        return `<article class="delivery ${included ? "selected" : ""}"><label><input type="checkbox" data-jpeg-pair="${i}" ${included ? "checked" : ""} aria-label="${esc(variantName(p, item.variant))} · ${esc(item.color.name)} · ${esc(pair.background.name)}"><span data-no-i18n>${esc(variantName(p, item.variant))}</span><small data-no-i18n>${esc(item.color.name)} / ${esc(pair.background.name)}</small><div class="delivery-preview">${jpegPreview(p, pair)}</div></label><button data-jpeg-framing="${i}">${t("Taille du logo dans l’image")}</button><span class="pair-contrast">${pair.ratio.toFixed(1)}:1 · ${t(pair.recommended ? "Contraste conseillé" : "Contraste faible")}</span><details><summary>${t("Appliquer ce fond aux autres versions")}</summary><label class="check"><input type="checkbox" data-global-pair="${esc(pair.globalId)}" ${pair.enabled ? "checked" : ""}>${t("Utiliser cette association pour toutes les versions")}</label></details></article>`;
      })
      .join("") ||
    `<p>${t("Aucun JPEG dans cette sélection. Choisissez une autre catégorie.")}</p>`
  }</div><div class="pagination"><button id="jpeg-prev" ${page === 0n ? "disabled" : ""}>${t("Précédente")}</button><label>${t("Page")} <input id="jpeg-page" inputmode="numeric" value="${page + 1n}" aria-label="${t("Aller à la page")}"> / ${max + 1n}</label><button id="jpeg-next" ${page === max ? "disabled" : ""}>${t("Suivante")}</button></div>`;
  root.querySelector("#jpeg-category").onchange = (e) => {
    category = e.target.value;
    page = 0n;
    refresh();
  };
  root.querySelector("#jpeg-prev").onclick = () => {
    page--;
    refresh();
  };
  root.querySelector("#jpeg-next").onclick = () => {
    page++;
    refresh();
  };
  root.querySelector("#jpeg-page").onchange = (e) => {
    if (/^\d+$/.test(e.target.value) && BigInt(e.target.value) > 0n)
      page = BigInt(e.target.value) - 1n;
    refresh();
  };
  root
    .querySelector("#enable-jpeg")
    ?.addEventListener("click", () =>
      edit(() => p.exports.formats.push("jpeg")),
    );
  root.querySelector("#reset-global-pairs").onclick = () =>
    edit(() => {
      p.jpegGlobal = {};
      p.jpegOverrides = {};
      p.jpegExceptions = {};
    });
  root
    .querySelectorAll("[data-jpeg-framing]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          editFraming(p, pairs[+el.dataset.jpegFraming].pair, edit)),
    );
  root.querySelectorAll("[data-jpeg-pair]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          const { pair, item, jobs } = pairs[+el.dataset.jpegPair];
          // Per-version exceptions take precedence over the optional shared association.
          (p.jpegExceptions ||= {})[pair.id] = el.checked;
          if (el.checked) {
            p.colorSelection[item.id] = true;
            (p.selectedDescriptors ||= {})[item.id] = item;
            p.excluded = p.excluded.filter(
              (id) => id !== pair.id && id !== item.id,
            );
            p.excludedFiles = (p.excludedFiles || []).filter(
              (id) =>
                id !== `${pair.id}:jpeg` &&
                !jobs.some((job) => id === job.key || id === job.path),
            );
          }
        })),
  );
  root.querySelectorAll("[data-global-pair]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          p.jpegGlobal[el.dataset.globalPair] = el.checked;
          for (const rules of [p.jpegOverrides, p.jpegExceptions || {}])
            for (const id of Object.keys(rules))
              if (id.endsWith(":" + el.dataset.globalPair)) delete rules[id];
        })),
  );
}
