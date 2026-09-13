import {
  field,
  option,
  paletteSelect,
  fontControls,
  mediaControls,
  bindFonts,
  bindMedia,
} from "./guideline-controls.js";
import { FORMATS, MISUSES } from "./guideline-model.js";
import {
  finalPalette,
  assignFontRoles,
  EDITORIAL_TYPES,
} from "./guideline-config.js";
import { theme, contrast } from "./guideline-theme.js";
import { variantName, variantIds } from "./model.js";
import { escape as esc } from "./guideline-svg.js";
import { t } from "./i18n.js";
import { editorialContent } from "./guideline-content.js";
let tab = "page";
let pairForeground = "",
  pairBackground = "";
export function inspectorHTML(p, a, elementPanel, selected) {
  const g = p.brandGuideline,
    T = theme(p),
    media = selected?.type === "image" ? selected : a.media;
  const global = `${field(
    "Format",
    `<select data-bg-format>${Object.entries(FORMATS)
      .map(([id, f]) => option(id, f.label, g.format))
      .join("")}</select>`,
  )}${[
    ["background", "Fond général"],
    ["text", "Texte principal"],
    ["muted", "Texte secondaire"],
    ["accent", "Accent"],
    ["secondary", "Fond secondaire"],
  ]
    .map(([key, label]) =>
      paletteSelect(p, `data-bg-theme="${key}"`, T[key], label),
    )
    .join(
      "",
    )}${field("Marges", `<input data-bg-theme="margin" type="number" min="12" max="80" value="${T.margin}">`)}${["headers", "footers", "numbers", "brandName"].map((key) => field({ headers: "En-têtes", footers: "Pieds de page", numbers: "Numéros de pages", brandName: "Nom de la marque" }[key], `<input data-global-toggle="${key}" type="checkbox" ${g.theme[key] !== false ? "checked" : ""}>`)).join("")}<details><summary>${t("Système typographique")}</summary>${fontControls(g)}</details><button data-reopen-setup>${t("Modifier la préparation")}</button>`;
  let local =
    field("Titre", `<input data-bg-title value="${esc(a.title)}">`) +
    paletteSelect(
      p,
      "data-bg-background",
      a.background || T.background,
      "Fond de page",
    );
  if (
    EDITORIAL_TYPES.includes(a.type) ||
    a.type === "contact" ||
    a.type === "applications"
  )
    local += field(
      a.type === "applications" ? "Légende" : "Texte",
      `<textarea data-page-body>${esc(a.body)}</textarea>`,
    );
  if (EDITORIAL_TYPES.includes(a.type))
    local +=
      field(
        "Composition",
        `<select data-bg-layout>${["minimal", "statement", "columns", "editorial", "manifesto"].map((v) => option(v, { minimal: "Automatique", statement: "Déclaration", columns: "Colonnes", editorial: "Éditorial", manifesto: "Manifeste" }[v], a.layout)).join("")}</select>`,
      ) +
      (a.body
        ? ""
        : `<button data-example-copy>${t("Insérer un texte fictif")}</button>`);
  if (["cover", "clearspace", "misuse"].includes(a.type))
    local += field(
      "Variante",
      `<select data-page-variant>${variantIds(p)
        .map((v) => option(v, variantName(p, v), a.variants[0] || p.active))
        .join("")}</select>`,
    );
  if (a.type === "clearspace") {
    const c = p.compositions[a.variants[0] || p.active];
    local += field(
      "Multiplicateur X",
      `<input data-clear-x type="number" min="0" max="5" step=".25" value="${c?.clearMultiplier ?? 0.5}">`,
    );
    for (const [key, label] of [
      ["guides", "Repères"],
      ["explanation", "Explication"],
    ])
      local += field(
        label,
        `<input data-page-toggle="${key}" type="checkbox" ${a.settings?.[key] !== false ? "checked" : ""}>`,
      );
    local +=
      paletteSelect(
        p,
        'data-page-color="rule"',
        a.settings?.rule || T.text,
        "Repères",
      ) +
      paletteSelect(
        p,
        'data-page-color="text"',
        a.settings?.text || T.text,
        "Annotations",
      );
  }
  if (a.type === "palette")
    for (const [key, label] of [
      ["hex", "HEX"],
      ["rgb", "RGB"],
      ["cmyk", "CMYK"],
      ["pantone", "Pantone"],
      ["roles", "Rôles"],
    ])
      local += field(
        label,
        `<input data-page-toggle="${key}" type="checkbox" ${a.settings?.[key] !== false ? "checked" : ""}>`,
      );
  if (a.type === "pairs") {
    const colors = finalPalette(p);
    const fg = colors.find((c) => c.id === pairForeground) || colors[0],
      bg =
        colors.find((c) => c.id === pairBackground) || colors[1] || colors[0];
    pairForeground = fg?.id;
    pairBackground = bg?.id;
    if (fg && bg) {
      const good =
        g.pairs[fg.id + ":" + bg.id]?.allowed ??
        contrast(fg.hex, bg.hex) >= 4.5;
      local +=
        field(
          "Texte",
          `<select data-pair-foreground>${colors.map((c) => option(c.id, c.name, fg.id)).join("")}</select>`,
        ) +
        field(
          "Fond",
          `<select data-pair-background>${colors.map((c) => option(c.id, c.name, bg.id)).join("")}</select>`,
        ) +
        field(
          "Association",
          `<select data-pair-allowed>${option("yes", "Recommandée", good ? "yes" : "no")}${option("no", "À éviter", good ? "yes" : "no")}</select>`,
        );
    }
  }
  if (a.type === "minimum")
    for (const v of a.variants)
      local += `<fieldset><legend>${esc(variantName(p, v))}</legend>${field("Print · mm", `<input data-minimum="${v}:minPrint" type="number" min="1" max="1000" value="${p.compositions[v]?.minPrint}">`)}${field("Digital · px", `<input data-minimum="${v}:minDigital" type="number" min="1" max="10000" value="${p.compositions[v]?.minDigital}">`)}</fieldset>`;
  if (a.type === "misuse")
    local += `<div class="bg-checks">${Object.entries(MISUSES)
      .filter(([key]) => key !== "correct")
      .map(
        ([key, label]) =>
          `<label><input data-bg-misuse="${key}" type="checkbox" ${a.misuses.includes(key) ? "checked" : ""}>${t(label)}</label>`,
      )
      .join("")}</div>`;
  if (a.type === "applications")
    local += field(
      "Composition",
      `<select data-bg-layout>${option("hero", "Hero", a.layout)}${option("editorial", "Éditorial", a.layout)}</select>`,
    );
  if (
    ["cover", "applications", "photography", "icons", "social"].includes(
      a.type,
    ) ||
    selected?.type === "image"
  )
    local += mediaControls(
      media || {},
      g.resources.find((r) => r.id === media?.resource),
    );
  return `<div class="bg-inspector-heading"><span>${t("Page")} ${g.pages.indexOf(a) + 1}</span><strong>${esc(a.title || t(a.type === "clearspace" ? "Zone de sécurité" : a.type))}</strong></div><div class="bg-inspector-tabs" role="tablist"><button data-inspector-tab="page" role="tab" aria-selected="${tab === "page"}">${t("Réglages page")}</button><button data-inspector-tab="global" role="tab" aria-selected="${tab === "global"}">${t("Réglages globaux")}</button></div><div role="tabpanel">${tab === "global" ? global : elementPanel || local}</div>`;
}
export function bindInspector(host, p, a, selected, update, rerender, notice) {
  const g = p.brandGuideline;
  host.querySelectorAll("[data-inspector-tab]").forEach(
    (el) =>
      (el.onclick = () => {
        tab = el.dataset.inspectorTab;
        rerender();
      }),
  );
  host.querySelector("[data-reopen-setup]")?.addEventListener("click", () =>
    update(() => {
      g.setup.complete = false;
      g.setup.step = 0;
    }),
  );
  host
    .querySelector("[data-page-body]")
    ?.addEventListener("change", (e) =>
      update(() => (a.body = e.target.value)),
    );
  host
    .querySelector("[data-example-copy]")
    ?.addEventListener("click", () =>
      update(() => (a.body = editorialContent(g, a).body)),
    );
  host
    .querySelector("[data-pair-foreground]")
    ?.addEventListener("change", (e) => {
      pairForeground = e.target.value;
      rerender();
    });
  host
    .querySelector("[data-pair-background]")
    ?.addEventListener("change", (e) => {
      pairBackground = e.target.value;
      rerender();
    });
  host
    .querySelector("[data-pair-allowed]")
    ?.addEventListener("change", (e) =>
      update(
        () =>
          (g.pairs[pairForeground + ":" + pairBackground] = {
            allowed: e.target.value === "yes",
            manual: true,
            source: "manual",
          }),
      ),
    );
  host
    .querySelector("[data-page-variant]")
    ?.addEventListener("change", (e) =>
      update(() => (a.variants = [e.target.value])),
    );
  host.querySelector("[data-clear-x]")?.addEventListener("change", (e) => {
    if (e.target.validity.valid)
      update(
        () =>
          (p.compositions[a.variants[0] || p.active].clearMultiplier =
            +e.target.value),
      );
  });
  for (const [attr, target] of [
    ["page-toggle", (a.settings ||= {})],
    ["global-toggle", g.theme],
  ])
    host
      .querySelectorAll(`[data-${attr}]`)
      .forEach(
        (el) =>
          (el.onchange = () =>
            update(
              () => (target[el.getAttribute("data-" + attr)] = el.checked),
            )),
      );
  host.querySelectorAll("[data-page-color]").forEach(
    (el) =>
      (el.onchange = () =>
        update(() => {
          if (finalPalette(p).some((c) => c.hex === el.value))
            (a.settings ||= {})[el.dataset.pageColor] = el.value;
        })),
  );
  host.querySelectorAll("[data-minimum]").forEach(
    (el) =>
      (el.onchange = () => {
        if (el.validity.valid)
          update(() => {
            const [v, k] = el.dataset.minimum.split(":");
            p.compositions[v][k] = +el.value;
          });
      }),
  );
  bindFonts(host, g, update, notice, assignFontRoles);
  bindMedia(
    host,
    g,
    () =>
      selected?.type === "image"
        ? a.elements.find((e) => e.id === selected.id) ||
          a.media ||
          (a.media = {})
        : a.media || (a.media = {}),
    update,
    notice,
  );
}
