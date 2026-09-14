import { normalizeFormats, framing, bitmapRect, USE_FORMATS } from "./export-formats.js";
import { layout, variantName } from "./model.js";
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
        `<details><summary>${t(kind === "web" ? "Tailles web standards" : "Cas d’usage")}</summary>${available
          .filter((f) => f.kind === kind)
          .map(
            (f) =>
              `<label class="check"><input type="checkbox" data-raster-format="${esc(f.id)}" ${selected.some((s) => s.id === f.id) ? "checked" : ""}>${f.kind === "web" ? "" : esc(f.kind === "use" && f.id.startsWith("custom-") ? f.name : t(f.name)) + " · "}${f.width} × ${f.height} px</label>`,
          )
          .join("")}</details>`,
    )
    .join(
      "",
    )}<button type="button" data-custom-format>${t("Créer un format personnalisé")}</button>${selected.map(f=>`<details data-standard-framing="${esc(f.id)}"><summary>${esc(f.kind === "use" ? t(f.name) + " · " : "")}${f.width} × ${f.height} px</summary>${p.exports.customFormats?.some(c=>c.id===f.id) ? `<label class="field">${t("Fond")}<select data-format-background="${esc(f.id)}">${[["","PNG + JPEG"],["transparent","Transparent"],["color","Fond coloré"]].map(([value,label])=>`<option value="${value}" ${(f.background || "")===value?"selected":""}>${t(label)}</option>`).join("")}</select></label><details><summary>${t("Options avancées")}</summary><select data-format-raster="${esc(f.id)}" aria-label="${t("Formats")}">${[["","Automatique"],["png","PNG"],["jpeg","JPEG"],["both","PNG + JPEG"]].map(([value,label])=>`<option value="${value}" ${(f.raster || "")===value?"selected":""}>${t(label)}</option>`).join("")}</select></details>` : ""}${framingControls(p,p.enabled.filter(v=>layout(p,v).parts.length),f)}</details>`).join("")}<details><summary>${t("Options avancées")}</summary><label class="check"><input type="checkbox" data-print-bitmaps ${(p.exports.printBitmaps ?? p.exports.destinations?.includes("PRINT")) ? "checked" : ""}>${t("Générer aussi les bitmaps PRINT")}</label></details></section>`;
}
export function bindFormats(root, p, edit, created = () => {}) {
  for(const key of ['background','raster'])root.querySelectorAll(`[data-format-${key}]`).forEach(el=>el.onchange=()=>edit(()=>{
    const f=p.exports.customFormats.find(f=>f.id===el.getAttribute(`data-format-${key}`));if(!f)return;
    f[key]=el.value || undefined;
    if(key==='background')delete f.raster;
    const formats=f.raster==='both' || !f.background?['png','jpeg']:[f.raster || (f.background==='transparent'?'png':'jpeg')];
    p.exports.formats=[...new Set([...p.exports.formats,...formats])];
  }));
  root.querySelector("[data-print-bitmaps]")?.addEventListener("change",e=>edit(()=>p.exports.printBitmaps=e.target.checked));
  root.querySelectorAll("[data-standard-framing]").forEach(section=>{const f=normalizeFormats(p.exports).available.find(f=>f.id===section.dataset.standardFraming);if(f)bindFraming(section,p,f,edit);});
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
        d.innerHTML = `<form method="dialog"><h2>${t("Dimensions supplémentaires")}</h2><label class="field">${t("Preset")}<select name="preset"><option value="">${t("Dimensions personnalisées")}</option>${USE_FORMATS.map(f => `<option value="${f.id}">${esc(t(f.name))} · ${f.width} × ${f.height}</option>`).join("")}</select></label><label class="field">${t("Nom du format")}<input name="label" required maxlength="100"></label><label class="field">${t("Largeur")}<input name="width" type="number" min="16" max="8192" value="1000" required></label><label class="field">${t("Hauteur")}<input name="height" type="number" min="16" max="8192" value="1000" required></label><label class="field">${t("Fond")}<select name="background"><option value="transparent">${t("Transparent")} · PNG</option><option value="color">${t("Fond coloré")} · JPEG</option></select></label><button value="cancel" formnovalidate>${t("Annuler")}</button><button class="primary" value="apply">${t("Créer")}</button></form>`;
        d.querySelector('[name=preset]').onchange = e => {
          const f = USE_FORMATS.find(f => f.id === e.target.value);
          if (f) { d.querySelector('[name=label]').value = t(f.name); d.querySelector('[name=width]').value = f.width; d.querySelector('[name=height]').value = f.height; }
        };
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
                background:d.querySelector("[name=background]").value,
                name: d.querySelector("[name=label]").value.trim(),
                width: +d.querySelector("[name=width]").value,
                height: +d.querySelector("[name=height]").value,
              });
              p.exports.rasterFormats = [...selected, id];
              p.exports.formats = [...new Set([...p.exports.formats,d.querySelector("[name=background]").value === "transparent" ? "png" : "jpeg"])];
              created(id);
            });
          d.remove();
        };
        document.body.append(d);
        d.showModal();
      }),
  );
}
export function editFraming(p, item, edit, formatId) {
  const choices = normalizeFormats(p.exports);
  const formats = [
    ...choices.selected,
    ...choices.available.filter(
      (f) => !choices.selected.some((s) => s.id === f.id),
    ),
  ];
  const draft = structuredClone(p.exports.variantFraming || {});
  const legacyDraft = {...p.exports.framing};
  let id = formatId || formats[0].id;
  const d = document.createElement("dialog");
  d.className = "gradient-editor";
  d.innerHTML = `<form method="dialog"><h2>${t("Taille du logo dans l’image")}</h2><select aria-label="${t("Format")}">${formats.map((f) => `<option value="${esc(f.id)}">${esc(t(f.name))}</option>`).join("")}</select><p>${t("Appliqué à toutes les couleurs PNG/JPEG de cette variante")}</p><div class="framing-stage checker"><div class="framing-logo">${framingSVG(p, item.variant)}<button type="button" class="framing-handle" aria-label="${t("Redimensionner le logo")}"></button></div></div><label class="field">${t("Taille du logo")}<input type="range" min="5" max="100" value="80"><output></output></label><button value="cancel">${t("Annuler")}</button><button class="primary" value="apply">${t("Appliquer")}</button></form>`;
  const stage = d.querySelector(".framing-stage"),
    logo = d.querySelector(".framing-logo"),
    range = d.querySelector("input"),
    handle = d.querySelector(".framing-handle");
  stage.style.background = "#ffffff";
  const update = () => {
    const f = formats.find((f) => f.id === id),
      scale = framing({ ...p.exports, framing:legacyDraft, variantFraming: draft }, id, item.variant);
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
    const scale = Math.max(0.05, Math.min(1, value));
    (draft[id] ||= {})[item.variant] = scale;
    update();
  };
  d.querySelector("select").value = id;
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
      initial = framing({ ...p.exports, framing:legacyDraft, variantFraming: draft }, id, item.variant);
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
        framing({ ...p.exports, framing:legacyDraft, variantFraming: draft }, id, item.variant) +
          (["ArrowUp", "ArrowRight"].includes(e.key) ? 0.01 : -0.01),
      );
    }
  };
  d.onclose = () => {
    if (d.returnValue === "apply") edit(() => {p.exports.variantFraming = draft;p.exports.framing = legacyDraft;});
    d.remove();
  };
  document.body.append(d);
  d.showModal();
  update();
}

export function framingSVG(p, variant) {
  // Force black only in this transient framing preview; exported paint locks stay intact.
  const svg = compositionSVG(p, variant, {hex:'#000000', force:true});
  return svg;
}
export function framingControls(p, variants, target) {
  return `<div class="use-framing"><h3 title="${t("Appliqué à toutes les couleurs PNG/JPEG de cette variante")}">${t("Cadrage par variante")}</h3>${variants.map(v => {
    const scale=framing(p.exports,target.id,v), l=layout(p,v), r=bitmapRect(target.width,target.height,l.width,l.height,scale);
    return `<label class="field"><span class="variant-framing-preview" data-framing-preview="${esc(v)}" style="aspect-ratio:${target.width}/${target.height}"><span style="width:${r.width/target.width*100}%;height:${r.height/target.height*100}%">${framingSVG(p,v)}</span></span><span>${esc(variantName(p,v))}</span><input data-use-framing="${esc(v)}" type="range" min="5" max="100" value="${Math.round(scale*100)}"><output>${Math.round(scale*100)} %</output><button type="button" data-reset-framing="${esc(v)}" title="${t("Réinitialiser cette variante")}" aria-label="${t("Réinitialiser cette variante")}">↺</button></label>`;
  }).join('')}</div>`;
}
export function bindFraming(root,p,target,edit,preview=()=>{}) {
  root.querySelectorAll('[data-reset-framing]').forEach(el=>el.onclick=()=>edit(()=>{((p.exports.variantFraming ||= {})[target.id] ||= {})[el.dataset.resetFraming]=.8;}));
  root.querySelectorAll('[data-use-framing]').forEach(el=>{
    el.oninput=()=>{
      const variant=el.dataset.useFraming, scale=+el.value/100, l=layout(p,variant), r=bitmapRect(target.width,target.height,l.width,l.height,scale);
      el.nextElementSibling.value=el.value+' %';
      const node=[...root.querySelectorAll('[data-framing-preview]')].find(n=>n.dataset.framingPreview===variant)?.firstElementChild;
      if(node){node.style.width=r.width/target.width*100+'%';node.style.height=r.height/target.height*100+'%';}
      preview({...p,exports:{...p.exports,variantFraming:{...p.exports.variantFraming,[target.id]:{...p.exports.variantFraming?.[target.id],[variant]:scale}}}},variant);
    };
    el.onchange=()=>edit(()=>{((p.exports.variantFraming ||= {})[target.id] ||= {})[el.dataset.useFraming]=+el.value/100;});
  });
}
