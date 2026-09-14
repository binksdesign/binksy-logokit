import { t } from "./i18n.js";
import { escape as esc } from "./guideline-svg.js";
import { finalPalette, COLOR_ROLES, colorRoles } from "./guideline-config.js";
import { typeStyle } from "./guideline-theme.js";
import { ROLES } from "./guideline-model.js";
import { importResource, loadFonts } from "./guideline-fonts.js";
import { resetCrop } from "./guideline-media.js";

export const field = (label, input) =>
  `<label class="field"><span>${esc(t(label))}</span>${input.replace(/<(input|select|textarea)\b/g, `<$1 aria-label="${esc(t(label))}"`)}</label>`;
export const option = (value, label, selected) =>
  `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(t(label))}</option>`;
export function paletteSelect(p, attr, selected, label) {
  const auto = /data-(bg-fill|page-color|bg-theme="(?:text|muted|accent))/.test(attr);
  const colors = finalPalette(p);
  const current = colors.find((c) => c.hex === selected) || colors[0];
  return field(
    label,
    `<span class="bg-palette-select"><i aria-hidden="true" style="background:${current?.hex || "transparent"}"></i><select ${attr}>${auto ? option("auto", "Automatique", selected || "auto") : ""}${colors.map((c) => option(c.hex, c.name + (COLOR_ROLES[c.role] ? " · " + t(COLOR_ROLES[c.role]) : ""), selected)).join("")}</select></span>`,
  );
}
export function fontControls(g) {
  const fonts = g.resources.filter((r) => r.type === "font");
  return `<label class="file-button">${t("Importer TTF / OTF")}<input data-font-import type="file" accept=".ttf,.otf" multiple hidden></label><div class="bg-font-families">${[
    ...new Set(fonts.map((f) => f.family)),
  ]
    .map(
      (family) =>
        `<div><strong>${esc(family)}</strong><span>${fonts
          .filter((f) => f.family === family)
          .map((f) => f.weight)
          .join(" · ")}</span></div>`,
    )
    .join("")}</div>${field("Ajouter une typographie d’accent", `<input type="checkbox" data-accent-enabled ${g.accentTypography?.enabled ? "checked" : ""}>`)}${[...ROLES,...(g.accentTypography?.enabled ? ["accent"] : [])].map((role) => {
    const s = typeStyle(g, role);
    return `<details class="bg-type-role"><summary>${t(role)} <span>${esc(s.family)} · ${s.weight}</span></summary>${field("Police", `<select data-type-font="${role}">${option("", "Instrument Sans", s.font)}${fonts.map((f) => option(f.id, f.family + " · " + f.weight, s.font)).join("")}</select>`)}<div class="two-fields">${field("Taille pt", `<input data-type-size="${role}" type="number" min="5" max="150" step=".25" value="${s.size}">`)}${field("Taille px", `<input data-type-px="${role}" type="number" min="6.67" max="200" step=".25" value="${+((s.size * 4) / 3).toFixed(2)}">`)}</div>${field("Interlignage", `<input data-type-leading="${role}" type="number" min=".8" max="3" step=".05" value="${s.leading}">`)}${field("Tracking", `<input data-type-tracking="${role}" type="number" min="-3" max="20" step=".1" value="${s.tracking}">`)}</details>`;
  }).join("")}`;
}
export function bindFonts(host, g, update, notice, assign) {
  host.querySelector("[data-accent-enabled]")?.addEventListener("change",e=>update(()=>{g.accentTypography={enabled:e.target.checked};}));
  const input = host.querySelector("[data-font-import]");
  if (input)
    input.onchange = async () => {
      try {
        for (const file of input.files) {
          const r = await importResource(file, g);
          update(() => {
            if (!g.resources.some((f) => f.id === r.id)) g.resources.push(r);
            assign?.(g);
          });
        }
        await loadFonts(g);
      } catch (e) {
        notice(t(e.message));
      }
    };
  for (const key of ["font", "size", "px", "leading", "tracking"])
    host.querySelectorAll(`[data-type-${key}]`).forEach(
      (el) =>
        (el.onchange = () => {
          if (!el.validity.valid) return;
          update(() => {
            const role = el.getAttribute(`data-type-${key}`),
              s = typeStyle(g, role);
            if (key === "font") {
              const f = g.resources.find((f) => f.id === el.value);
              Object.assign(s, {
                font: el.value,
                family: f?.family || "Instrument Sans",
                weight: f?.weight || 400,
              });
            } else if (key === "px") s.size = +el.value * 0.75;
            else s[key] = +el.value;
            s.pt = s.size;
            s.px = (s.size * 4) / 3;
            g.typography[role] = s;
          });
        }),
    );
}
export function mediaControls(media, resource, key = "main") {
  return `<section data-media="${esc(key)}">${resource ? `<div class="bg-crop-preview"><img src="${resource.data}" alt="${esc(resource.name)}" style="object-fit:${media.fit === "contain" ? "contain" : "cover"};object-position:${(media.panX ?? 0.5) * 100}% ${(media.panY ?? 0.5) * 100}%;transform:scale(${media.zoom || 1})"></div>` : ""}<label class="file-button">${t(resource ? "Remplacer l’image" : "Importer une image")}<input data-media-file type="file" accept="image/png,image/jpeg,image/webp" hidden></label>${
    resource
      ? `<div class="bg-media-fit"><button data-media-fit="contain" aria-pressed="${media.fit === "contain"}">${t("Ajuster")}</button><button data-media-fit="cover" aria-pressed="${media.fit !== "contain"}">${t("Remplir")}</button></div>${[
          ["zoom", "Zoom", 1, 5, 0.05],
          ["panX", "Cadrage horizontal", 0, 1, 0.01],
          ["panY", "Cadrage vertical", 0, 1, 0.01],
        ]
          .map(([k, label, min, max, step]) =>
            field(
              label,
              `<input data-media-value="${k}" type="range" min="${min}" max="${max}" step="${step}" value="${media[k] ?? (k === "zoom" ? 1 : 0.5)}">`,
            ),
          )
          .join(
            "",
          )}<button data-media-reset>${t("Réinitialiser le cadrage")}</button>`
      : ""
  }</section>`;
}
export function bindMedia(host, g, lookup, update, notice) {
  host.querySelectorAll("[data-media]").forEach((section) => {
    const key = section.dataset.media;
    section.querySelector("[data-media-file]").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const r = await importResource(file, g);
        update(() => {
          if (!g.resources.some((a) => a.id === r.id)) g.resources.push(r);
          const media = lookup(key);
          Object.assign(media, { resource: r.id, fit: "cover" });
          resetCrop(media);
        });
      } catch (e) {
        notice(t(e.message));
      }
    };
    section.querySelectorAll("[data-media-fit]").forEach(
      (el) =>
        (el.onclick = () =>
          update(() => {
            lookup(key).fit = el.dataset.mediaFit;
            resetCrop(lookup(key));
          })),
    );
    section
      .querySelector("[data-media-reset]")
      ?.addEventListener("click", () => update(() => resetCrop(lookup(key))));
    section
      .querySelectorAll("[data-media-value]")
      .forEach(
        (el) =>
          (el.onchange = () =>
            update(() => (lookup(key)[el.dataset.mediaValue] = +el.value))),
      );
  });
}
