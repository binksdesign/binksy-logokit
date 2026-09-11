import { normalizeFormats, framing, bitmapRect } from "./export-formats.js";
import { layout } from "./model.js";
import { compositionSVG } from "./svg.js";
import { t } from "./i18n.js";
import { esc } from "./ui.js";
export function formatControls(p) {
  const { available, selected } = normalizeFormats(p.exports);
  return `<section><div class="section-title">${t("Dimensions PNG / JPEG")}</div>${[
    "web",
    "use",
  ]
    .map(
      (kind) =>
        `<details ${kind === "web" ? "open" : ""}><summary>${t(kind === "web" ? "Tailles web standards" : "Cas d’usage")}</summary>${available
          .filter((f) => f.kind === kind)
          .map(
            (f) =>
              `<label class="check"><input type="checkbox" data-raster-format="${esc(f.id)}" ${selected.some((s) => s.id === f.id) ? "checked" : ""}>${esc(t(f.name))} · ${f.width} × ${f.height} px</label>`,
          )
          .join("")}</details>`,
    )
    .join(
      "",
    )}<button type="button" data-custom-format>${t("Créer un format personnalisé")}</button><details><summary>${t("Destinations")}</summary>${["WEB", "PRINT"].map((d) => `<label class="check"><input type="checkbox" data-destination="${d}" ${(p.exports.destinations || ["WEB", "PRINT"]).includes(d) ? "checked" : ""}>${d} · ${d === "WEB" ? 72 : 300} DPI</label>`).join("")}<p>${t("Les cas d’usage sont livrés à 72 DPI.")}</p></details></section>`;
}
export function bindFormats(root, p, edit) {
  root.querySelectorAll("[data-raster-format]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          const ids = normalizeFormats(p.exports).selected.map((f) => f.id);
          p.exports.rasterFormats = el.checked
            ? [...new Set([...ids, el.dataset.rasterFormat])]
            : ids.filter((id) => id !== el.dataset.rasterFormat);
        })),
  );
  root.querySelectorAll("[data-destination]").forEach(
    (el) =>
      (el.onchange = () =>
        edit(() => {
          const ids = p.exports.destinations || ["WEB", "PRINT"];
          p.exports.destinations = el.checked
            ? [...new Set([...ids, el.dataset.destination])]
            : ids.filter((id) => id !== el.dataset.destination);
        })),
  );
  root.querySelectorAll("[data-custom-format]").forEach(
    (el) =>
      (el.onclick = () => {
        const d = document.createElement("dialog");
        d.className = "gradient-editor";
        d.innerHTML = `<form method="dialog"><h2>${t("Créer un format personnalisé")}</h2><label class="field">${t("Nom du format")}<input name="label" required maxlength="100"></label><label class="field">${t("Largeur")}<input name="width" type="number" min="16" max="8192" value="1000" required></label><label class="field">${t("Hauteur")}<input name="height" type="number" min="16" max="8192" value="1000" required></label><button value="cancel" formnovalidate>${t("Annuler")}</button><button class="primary" value="apply">${t("Créer")}</button></form>`;
        d.querySelector("form").onsubmit = (e) => {
          if (
            e.submitter.value === "apply" &&
            !d.querySelector("[name=label]").value.trim()
          ) {
            e.preventDefault();
            d.querySelector("[name=label]").focus();
          }
        };
        d.onclose = () => {
          if (d.returnValue === "apply")
            edit(() => {
              const selected = normalizeFormats(p.exports).selected.map(
                  (f) => f.id,
                ),
                id = "custom-" + crypto.randomUUID();
              p.exports.customFormats ||= [];
              p.exports.customFormats.push({
                id,
                name: d.querySelector("[name=label]").value.trim(),
                width: +d.querySelector("[name=width]").value,
                height: +d.querySelector("[name=height]").value,
              });
              p.exports.rasterFormats = [...selected, id];
            });
          d.remove();
        };
        document.body.append(d);
        d.showModal();
      }),
  );
}
export function editFraming(p, item, edit) {
  const choices = normalizeFormats(p.exports);
  const formats = [
    ...choices.selected,
    ...choices.available.filter(
      (f) => !choices.selected.some((s) => s.id === f.id),
    ),
  ];
  const draft = { ...p.exports.framing };
  let id = formats[0].id;
  const d = document.createElement("dialog");
  d.className = "gradient-editor";
  d.innerHTML = `<form method="dialog"><h2>${t("Taille du logo dans l’image")}</h2><select aria-label="${t("Format")}">${formats.map((f) => `<option value="${esc(f.id)}">${esc(t(f.name))}</option>`).join("")}</select><p>${t("Centré et proportionnel. Ce réglage est partagé par toutes les versions de ce format.")}</p><div class="framing-stage checker"><div class="framing-logo">${compositionSVG(p, item.variant, item.color)}<button type="button" class="framing-handle" aria-label="${t("Redimensionner le logo")}"></button></div></div><label class="field">${t("Taille du logo")}<input type="range" min="5" max="100" value="80"><output></output></label><button value="cancel">${t("Annuler")}</button><button class="primary" value="apply">${t("Appliquer")}</button></form>`;
  const stage = d.querySelector(".framing-stage"),
    logo = d.querySelector(".framing-logo"),
    range = d.querySelector("input"),
    handle = d.querySelector(".framing-handle");
  if (item.background)
    d.querySelector(".framing-stage").style.background = item.background.hex;
  const update = () => {
    const f = formats.find((f) => f.id === id),
      scale = framing({ framing: draft }, id);
    stage.style.aspectRatio = `${f.width}/${f.height}`;
    stage.style.width = `${Math.min(440, (320 * f.width) / f.height)}px`;
    const l = layout(p, item.variant),
      rect = bitmapRect(f.width, f.height, l.width, l.height, scale);
    logo.style.width = `${(rect.width / f.width) * 100}%`;
    logo.style.height = `${(rect.height / f.height) * 100}%`;
    range.value = Math.round(scale * 100);
    d.querySelector("output").value = range.value + " %";
  };
  const set = (value) => {
    draft[id] = Math.max(0.05, Math.min(1, value));
    update();
  };
  d.querySelector("select").onchange = (e) => {
    id = e.target.value;
    update();
  };
  range.oninput = () => set(+range.value / 100);
  handle.onpointerdown = (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const b = stage.getBoundingClientRect(),
      cx = b.x + b.width / 2,
      cy = b.y + b.height / 2,
      start = Math.hypot(e.clientX - cx, e.clientY - cy),
      initial = framing({ framing: draft }, id);
    handle.onpointermove = (e) =>
      set(
        (initial * Math.hypot(e.clientX - cx, e.clientY - cy)) /
          Math.max(start, 1),
      );
    handle.onpointerup = handle.onpointercancel = () =>
      (handle.onpointermove = null);
  };
  handle.onkeydown = (e) => {
    if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(e.key)) {
      e.preventDefault();
      set(
        framing({ framing: draft }, id) +
          (["ArrowUp", "ArrowRight"].includes(e.key) ? 0.01 : -0.01),
      );
    }
  };
  d.onclose = () => {
    if (d.returnValue === "apply") edit(() => (p.exports.framing = draft));
    d.remove();
  };
  document.body.append(d);
  d.showModal();
  update();
}
