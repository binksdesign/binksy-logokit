import { arrangeImages } from "./guideline-media.js";
import { selectionControls } from "./guideline-interactions.js";
import {
  FORMATS,
  PAGE_TYPES,
  MISUSES,
  ROLES,
  page,
  uid,
  initializeGuide,
  movePage,
  duplicatePage,
  normalizeDistribution,
  setDistribution,
  limit,
} from "./guideline-model.js";
import { theme, dimensions, typeStyle } from "./guideline-theme.js";
import { pageElements, pageHeading } from "./guideline-layout.js";
import { guidelineSVG, escape as esc } from "./guideline-svg.js";
import { loadFonts, importResource, fontsReady } from "./guideline-fonts.js";
import {
  guidelinePDF,
  standaloneSVG,
  exportWarnings,
} from "./guideline-export.js";
import { download } from "./export.js";
import { variantIds, variantName, slug, isReadyVariant } from "./model.js";
import { t } from "./i18n.js";
import "./guideline.css";
let mountedHost = null,
  mountedProject = null;
let active = "",
  selection = "",
  zoom = 1,
  replaceImage = false,
  lastClick = { id: "", at: 0 };
const thumbnails = new Map();
function thumbnail(p, a, i) {
  const key = JSON.stringify([
    a,
    i,
    p.enabled,
    p.brandGuideline.brief,
    p.brandGuideline.resources.map((r) => r.id),
    p.brandGuideline.theme,
    p.brandGuideline.format,
    p.colors,
    p.compositions,
    p.brandGuideline.typography,
    p.brand,
  ]);
  const cached = thumbnails.get(a.id);
  if (cached?.key === key) return cached.svg;
  const svg = guidelineSVG(p, a, i);
  thumbnails.set(a.id, { key, svg });
  if (thumbnails.size > 100) thumbnails.delete(thumbnails.keys().next().value);
  return svg;
}
const field = (label, control) =>
  `<label class="field"><span>${esc(t(label))}</span>${control.replace(/<(input|select|textarea)\b/g, `<$1 aria-label="${esc(t(label))}"`)}</label>`;
const button = (action, label) =>
  `<button data-bg="${action}">${t(label)}</button>`;
const option = (v, label, current) =>
  `<option value="${esc(v)}" ${v === current ? "selected" : ""}>${esc(t(label))}</option>`;
const input = (key, value, type = "text") =>
  `<input data-bg-field="${key}" type="${type}" value="${esc(value)}">`;
export function mountGuideline(host, p, edit, navigate, notice) {
  const previous = mountedProject === p.id && mountedHost ? mountedHost : host;
  mountedHost = host;
  mountedProject = p.id;
  const scrolls = [".bg-pages", ".bg-properties", ".bg-center"].map(
    (selector) => [selector, previous.querySelector(selector)?.scrollTop || 0],
  );
  const openPanels = new Set(
    [...previous.querySelectorAll("details[open]")].map(
      (d) => d.querySelector("summary")?.textContent,
    ),
  );
  host.setAttribute("data-no-i18n", "");
  const g = p.brandGuideline;
  if (!fontsReady(g)) {
    host.innerHTML = `<div class="bg-loading">${t("Préparation du document…")}</div>`;
    loadFonts(g)
      .then(() => {
        if (host.isConnected) mountGuideline(host, p, edit, navigate, notice);
      })
      .catch((e) => notice(t(e.message)));
    return;
  }
  if (!g?.pages.length) {
    host.innerHTML = `<div class="bg-start"><h1>Brand Guideline</h1><p>${t("Un guide construit avec votre identité visuelle.")}</p>${button("start", "Créer ma Brand Guideline")}${button("skip", "Ignorer la Brand Guideline")}</div>`;
    host.querySelector('[data-bg="start"]').onclick = () =>
      edit(() => initializeGuide(p));
    host.querySelector('[data-bg="skip"]').onclick = () => navigate("delivery");
    return;
  }
  let current = g.pages.find((a) => a.id === active) || g.pages[0];
  active = current.id;
  const els = pageElements(p, current, g.pages.indexOf(current)),
    selected = els.find((e) => e.id === selection),
    { width: W, height: H } = dimensions(g);
  const update = (fn) => edit(fn),
    options = (obj, val) =>
      Object.entries(obj)
        .map(([v, l]) => option(v, typeof l === "object" ? l.label : l, val))
        .join("");
  const elementPanel = selected
    ? `<h2>${t("Élément sélectionné")}</h2>${selected.type === "text" ? field("Texte", `<textarea data-bg-text>${esc(selected.text)}</textarea>`) + field("Taille", input("size", selected.size, "number")) + field("Rôle typographique", `<select data-bg-element-role>${[...new Set([...ROLES, ...Object.keys(g.typography)])].map((r) => option(r, r, selected.role)).join("")}</select>`) : ""}${["x", "y", "w", "h"].map((k) => field({ x: "Position X", y: "Position Y", w: "Largeur", h: "Hauteur" }[k], input(k, Math.round(selected[k]), "number"))).join("")}${
        selected.type === "logo"
          ? field(
              "Variante",
              `<select data-bg-variant>${variantIds(p)
                .map((v) => option(v, variantName(p, v), selected.variant))
                .join("")}</select>`,
            )
          : ""
      }${selected.type === "image" ? field("Zoom image", input("zoom", selected.zoom || 1, "number")) + field("Cadrage horizontal", input("panX", selected.panX ?? 0.5, "number")) + field("Cadrage vertical", input("panY", selected.panY ?? 0.5, "number")) + button("replace", "Remplacer l’image") : ""}${["text", "rect"].includes(selected.type) ? field("Couleur", `<input data-bg-fill type="color" value="${selected.fill || theme(p).text}">`) : ""}${button("duplicate-element", "Dupliquer l’élément")}${button("delete-element", "Supprimer l’élément")}${button("front", "Premier plan")}${button("align-left", "Aligner à gauche")}${button("align-center", "Centrer horizontalement")}${button("align-top", "Aligner en haut")}${button("deselect", "Propriétés de la page")}`
    : "";
  const pagePanel = `<h2>${t("Propriétés de la page")}</h2>${field("Titre", `<input data-bg-title value="${esc(pageHeading(current))}">`)}${["cover", "end", "applications", "photography", "social", "icons"].includes(current.type) ? field("Composition", `<select data-bg-layout>${(["cover", "end"].includes(current.type) ? ["minimal", "typographic", "image", "dominant"] : ["full", "two", "three", "mixed", "mosaic"]).map((v) => option(v, v, current.layout)).join("")}</select>`) : ""}${field("Fond de page", `<input data-bg-background type="color" value="${current.background || (["cover", "end"].includes(current.type) ? theme(p).accent : theme(p).background)}">`)}${button("reset", "Réinitialiser cette page avec le template")}${
    ["logos", "clearspace", "minimum", "misuse", "cover"].includes(current.type)
      ? `<details><summary>${t("Variantes affichées")}</summary>${variantIds(p)
          .map(
            (v) =>
              `<label class="check"><input data-bg-show-variant="${v}" type="checkbox" ${(current.variants.length ? current.variants : p.enabled).includes(v) ? "checked" : ""}>${esc(variantName(p, v))}</label>`,
          )
          .join("")}</details>`
      : ""
  }${
    current.type === "misuse"
      ? `<details open><summary>${t("Mauvais usages")}</summary>${current.misuses.map((id, i) => `<div class="bg-rule-order"><span>${t(MISUSES[id])}</span><button data-bg-rule-up="${id}" ${i === 0 ? "disabled" : ""} aria-label="${t("Monter")}">↑</button><button data-bg-rule-down="${id}" ${i === current.misuses.length - 1 ? "disabled" : ""} aria-label="${t("Descendre")}">↓</button></div>`).join("")}${Object.entries(
          MISUSES,
        )
          .map(
            ([id, label]) =>
              `<label class="check"><input data-bg-misuse="${id}" type="checkbox" ${["proportions", "spacing"].includes(id) && (isReadyVariant(p, current.variants[0] || p.enabled[0]) || p.mode !== "compose") ? "disabled" : ""} ${current.misuses.includes(id) ? "checked" : ""}>${t(label)}</label>`,
          )
          .join("")}</details>`
      : ""
  }`;
  const documentPanel = `<details><summary>${t("Document et thème")}</summary>${field("Format", `<select data-bg-format>${options(FORMATS, g.format)}</select>`)}${["background", "secondary", "text", "muted", "accent"].map((k) => field(k, `<input data-bg-theme="${k}" type="color" value="${theme(p)[k]}">`)).join("")}${field("Numéros de pages", `<input data-bg-numbers type="checkbox" ${theme(p).numbers ? "checked" : ""}>`)}${field("Afficher les repères", `<input data-bg-guides type="checkbox" ${g.theme.guides ? "checked" : ""}>`)}${["margin", "spacing", "grid"].map((k) => field(k, `<input data-bg-theme="${k}" type="number" min="0" max="100" value="${theme(p)[k]}">`)).join("")}${button("theme", "Réappliquer le thème")}</details>`;
  const fontsPanel = `<details><summary>${t("Typographies")}</summary><label class="file-button">${t("Importer TTF / OTF")}<input data-bg-fonts type="file" accept=".ttf,.otf" multiple hidden></label>${button("custom-role", "Ajouter un rôle typographique")}${[
    ...new Set([...ROLES, ...Object.keys(g.typography)]),
  ]
    .map((role) => {
      const s = typeStyle(g, role);
      return `<fieldset><legend>${t(role)}</legend><select data-bg-font-role="${role}">${option("", "Instrument Sans", s.font)}${g.resources
        .filter((r) => r.type === "font")
        .map((r) => option(r.id, r.name, s.font))
        .join(
          "",
        )}</select>${["size", "weight", "leading", "tracking"].map((k) => field(k, `<input data-bg-type="${role}:${k}" ${k === "weight" ? `disabled title="${t("La graisse dépend du fichier de police importé.")}"` : ""} type="number" step="any" value="${s[k]}">`)).join("")}</fieldset>`;
    })
    .join("")}</details>`;
  const colorsPanel = `<details><summary>${t("Rôles et règles couleur")}</summary>${p.colors.map((c, i) => `<fieldset><legend>${esc(c.name)} ${c.hex}</legend>${field("Rôle", `<input data-bg-color="${c.id}:role" list="bg-roles" value="${esc(g.colorRoles[c.id]?.role || "")}">`)}${field("Référence spot", `<input data-bg-color="${c.id}:spot" value="${esc(g.colorRoles[c.id]?.spot || "")}">`)}${field("Ordre", `<input type="number" data-bg-color="${c.id}:order" value="${g.colorRoles[c.id]?.order ?? i}">`)}${field("Répartition %", `<input type="range" min="0" max="100" data-bg-percent="${c.id}" value="${g.distribution[c.id] || 0}"><input type="number" min="0" max="100" data-bg-percent="${c.id}" value="${g.distribution[c.id] || 0}">`)}</fieldset>`).join("")}<datalist id="bg-roles">${["primary", "secondary", "accent", "background", "secondary-background", "text", "secondary-text", "support"].map((r) => `<option>${r}</option>`).join("")}</datalist>${button("normalize", "Normaliser à 100 %")}${p.colors.flatMap((a) => p.colors.filter((b) => b.id !== a.id).map((b) => field(a.name + " / " + b.name, `<select data-bg-pair="${a.id}:${b.id}">${option("auto", "Automatique", g.pairs[a.id + ":" + b.id]?.manual ? String(g.pairs[a.id + ":" + b.id].allowed) : "auto")}${option("true", "À faire", String(g.pairs[a.id + ":" + b.id]?.allowed))}${option("false", "À éviter", String(g.pairs[a.id + ":" + b.id]?.allowed))}</select>`))).join("")}</details>`;
  const briefPanel = `<details><summary>${t("Brief de marque")}</summary>${["description", "activity", "audience", "values", "goal", "tone", "tagline", "keywords"].map((k) => field(k, `<textarea data-bg-brief="${k}">${esc(g.brief[k] || "")}</textarea>`)).join("")}</details>`;
  host.innerHTML = `<div class="bg-toolbar"><div class="bg-document-title"><strong>Brand Guideline</strong><span>${esc(p.brand)} · ${t(FORMATS[g.format].label)}</span></div><label class="check"><input data-bg-enabled type="checkbox" ${g.enabled ? "checked" : ""}>${t("Inclure dans le kit")}</label>${button("skip", "Ignorer la Brand Guideline")}${button("export", "Exporter")}${button("pdf", "Télécharger le PDF")}<select data-bg-zoom aria-label="Zoom">${[0.5, 0.75, 1, 1.25, 1.5, 2].map((z) => option(String(z), Math.round(z * 100) + "%", String(zoom))).join("")}</select></div><div class="bg-workspace"><aside class="bg-pages"><div class="bg-panel-heading"><span>${t("Pages")}</span><span>${g.pages.length}</span></div><select data-bg-library aria-label="${t("Bibliothèque de pages")}">${options(PAGE_TYPES, "blank")}</select>${button("add-page", "Ajouter une page")}<ol>${g.pages.map((a, i) => `<li draggable="true" data-bg-page="${a.id}"><button aria-current="${a.id === active}" data-bg-open="${a.id}"><span class="bg-thumbnail" style="aspect-ratio:${W / H}">${thumbnail(p, a, i)}</span><span>${String(i + 1).padStart(2, "0")} ${esc(a.title || t(PAGE_TYPES[a.type]))}</span></button></li>`).join("")}</ol>${button("up", "Monter")}${button("down", "Descendre")}${button("duplicate-page", "Dupliquer la page")}${button("delete-page", "Supprimer la page")}</aside><section class="bg-center"><div class="bg-stage-heading"><span>${String(g.pages.indexOf(current) + 1).padStart(2, "0")} / ${String(g.pages.length).padStart(2, "0")}</span><strong>${esc(current.title || t(PAGE_TYPES[current.type]))}</strong><span>${t(FORMATS[g.format].label)}</span></div><div class="bg-canvas" style="--bg-ratio:${W / H};--bg-zoom:${zoom}">${guidelineSVG(p, current, g.pages.indexOf(current), { editor: true })}</div><div class="bg-insert">${button("text", "Ajouter un texte")}${button("rect", "Ajouter une forme")}<label class="file-button">${t("Importer des images")}<input data-bg-images type="file" accept="image/png,image/jpeg,image/webp" multiple hidden></label></div><p class="bg-hint">${t("Double-cliquez pour éditer. Déplacez les éléments sur la page.")} ${t("Les textes sont ajustés à leur bloc si nécessaire.")}</p></section><aside class="bg-properties">${elementPanel || pagePanel}${documentPanel}${fontsPanel}${colorsPanel}${briefPanel}<details><summary>${t("Options d’export")}</summary>${["pdf", "svg"].map((k) => `<label class="check"><input data-bg-export="${k}" type="checkbox" ${g.exports[k] ? "checked" : ""}>${k.toUpperCase()}</label>`).join("")}<select data-bg-text-mode>${option("text", "Conserver les textes", g.exports.text)}${option("paths", "Vectoriser les textes", g.exports.text)}</select>${exportWarnings(
    p,
  )
    .map((w) => `<p>${t(w)}</p>`)
    .join(
      "",
    )}${button("pdf", "Télécharger la Brand Guideline")}${button("svg", "Exporter les pages SVG")}</details></aside></div>`;
  host.querySelectorAll("details").forEach((d) => {
    if (openPanels.has(d.querySelector("summary")?.textContent)) d.open = true;
  });
  const bind = (sel, event, fn) =>
    host
      .querySelectorAll(sel)
      .forEach((el) => el.addEventListener(event, (e) => fn(el, e)));
  const modifyElement = (changes) => {
    const custom = current.elements.find((e) => e.id === selection);
    if (custom) {
      for (const [k, v] of Object.entries(changes))
        custom[k] = ["x", "w"].includes(k)
          ? v / W
          : ["y", "h"].includes(k)
            ? v / H
            : v;
    } else {
      current.styles[selection] = {
        x: selected.x / W,
        y: selected.y / H,
        w: selected.w / W,
        h: selected.h / H,
        size: selected.size || 12,
        ...current.styles[selection],
        ...Object.fromEntries(
          Object.entries(changes).map(([k, v]) => [
            k,
            ["x", "w"].includes(k) ? v / W : ["y", "h"].includes(k) ? v / H : v,
          ]),
        ),
      };
    }
  };
  const addElement = (type, extra = {}) => {
    const e = {
      id: uid(),
      type,
      x: 0.15,
      y: 0.25,
      w: 0.45,
      h: 0.25,
      size: 12,
      fill: theme(p).text,
      text: t("Votre texte"),
      role: "body",
      ...extra,
    };
    current.elements.push(e);
    selection = e.id;
  };
  bind("[data-bg-open]", "click", (el) => {
    active = el.dataset.bgOpen;
    selection = "";
    mountGuideline(host, p, edit, navigate, notice);
  });
  bind("[data-bg-page]", "dragstart", (el, e) =>
    e.dataTransfer.setData("text/bg-page", el.dataset.bgPage),
  );
  bind("[data-bg-page]", "dragover", (_, e) => e.preventDefault());
  bind("[data-bg-page]", "drop", (el, e) => {
    e.preventDefault();
    update(() =>
      movePage(g, e.dataTransfer.getData("text/bg-page"), el.dataset.bgPage),
    );
  });
  bind("[data-bg]", "click", async (el) => {
    try {
      const action = el.dataset.bg;
      if (action === "skip") {
        update(() => (g.enabled = false));
        navigate("delivery");
        return;
      }
      if (action === "export") {
        navigate("delivery");
        return;
      }
      if (action === "pdf" || action === "svg") {
        if (
          exportWarnings(p, action).length &&
          !confirm(exportWarnings(p, action).map(t).join("\n"))
        )
          return;
        el.disabled = true;
        const blob =
          action === "pdf" ? await guidelinePDF(p) : await standaloneSVG(p);
        download(
          blob,
          slug(p.brand) +
            "-brand-guidelines." +
            (action === "pdf" ? "pdf" : "zip"),
        );
        return;
      }
      if (action === "deselect") {
        selection = "";
        mountGuideline(host, p, edit, navigate, notice);
        return;
      }
      if (action === "replace") {
        replaceImage = true;
        host.querySelector("[data-bg-images]").click();
        return;
      }
      update(() => {
        if (action === "add-page") {
          if (g.pages.length >= 100)
            throw Error(t("Guide invalide : 100 pages maximum."));
          const a = page(host.querySelector("[data-bg-library]").value);
          g.pages.push(a);
          active = a.id;
          selection = "";
        }
        if (action === "duplicate-page") {
          if (g.pages.length >= 100)
            throw Error(t("Guide invalide : 100 pages maximum."));
          active = duplicatePage(g, active).id;
        }
        if (action === "delete-page") {
          g.pages = g.pages.filter((a) => a.id !== active);
          selection = "";
        }
        if (action === "up" || action === "down") {
          const i = g.pages.indexOf(current),
            j = i + (action === "up" ? -1 : 1);
          if (j >= 0 && j < g.pages.length)
            [g.pages[i], g.pages[j]] = [g.pages[j], g.pages[i]];
        }
        if (action === "reset") {
          g.pages[g.pages.indexOf(current)] = {
            ...page(current.type),
            id: current.id,
          };
          selection = "";
        }
        if (action === "theme")
          g.pages.forEach((a) => {
            a.background = "";
            Object.values(a.styles).forEach((style) => {
              for (const key of [
                "fill",
                "size",
                "font",
                "weight",
                "leading",
                "tracking",
              ])
                delete style[key];
            });
          });
        if (action === "text" || action === "rect") addElement(action);
        if (action === "delete-element") {
          if (current.elements.some((e) => e.id === selection))
            current.elements = current.elements.filter(
              (e) => e.id !== selection,
            );
          else modifyElement({ hidden: true });
          selection = "";
        }
        if (action === "duplicate-element")
          addElement(selected.type, {
            ...selected,
            id: uid(),
            x: Math.min(0.9, selected.x / W + 0.02),
            y: Math.min(0.9, selected.y / H + 0.02),
            w: selected.w / W,
            h: selected.h / H,
          });
        if (action === "front") {
          const e = current.elements.find((e) => e.id === selection);
          if (e) {
            current.elements = current.elements.filter((a) => a !== e);
            current.elements.push(e);
          } else {
            modifyElement({ hidden: true });
            addElement(selected.type, {
              ...selected,
              id: uid(),
              x: selected.x / W,
              y: selected.y / H,
              w: selected.w / W,
              h: selected.h / H,
            });
          }
        }
        if (action.startsWith("align-"))
          modifyElement(
            action === "align-left"
              ? { x: theme(p).margin }
              : action === "align-top"
                ? { y: theme(p).margin }
                : { x: (W - selected.w) / 2 },
          );
        if (action === "custom-role") {
          const role =
            "custom-" +
            (Object.keys(g.typography).filter((k) => k.startsWith("custom-"))
              .length +
              1);
          g.typography[role] = { ...typeStyle(g, "body") };
        }
        if (action === "normalize") normalizeDistribution(g, p.colors);
      });
    } catch (e) {
      notice(t(e.message));
    } finally {
      el.disabled = false;
    }
  });
  bind("[data-bg-format]", "change", (el) =>
    update(() => {
      g.format = el.value;
      g.pages.forEach((a) => arrangeImages(a, g.format));
    }),
  );
  bind("[data-bg-title]", "change", (el) =>
    update(() => (current.title = el.value)),
  );
  bind("[data-bg-layout]", "change", (el) =>
    update(() => {
      current.layout = el.value;
      arrangeImages(current, g.format);
    }),
  );
  bind("[data-bg-background]", "change", (el) =>
    update(() => (current.background = el.value)),
  );
  bind("[data-bg-enabled]", "change", (el) =>
    update(() => (g.enabled = el.checked)),
  );
  bind("[data-bg-numbers]", "change", (el) =>
    update(() => (g.theme.numbers = el.checked)),
  );
  bind("[data-bg-guides]", "change", (el) =>
    update(() => (g.theme.guides = el.checked)),
  );
  bind("[data-bg-theme]", "change", (el) =>
    update(
      () =>
        (g.theme[el.dataset.bgTheme] =
          el.type === "number" ? limit(el.value, 0, 100) : el.value),
    ),
  );
  bind("[data-bg-text]", "change", (el) =>
    update(() => modifyElement({ text: el.value })),
  );
  bind("[data-bg-field]", "change", (el) => {
    const k = el.dataset.bgField;
    update(() =>
      modifyElement({
        [k]: limit(
          el.value,
          k === "size" ? 5 : 0,
          ["x", "w"].includes(k)
            ? W
            : ["y", "h"].includes(k)
              ? H
              : k === "zoom"
                ? 5
                : k.startsWith("pan")
                  ? 1
                  : 150,
        ),
      }),
    );
  });
  bind("[data-bg-fill]", "change", (el) =>
    update(() => modifyElement({ fill: el.value })),
  );
  bind("[data-bg-variant]", "change", (el) =>
    update(() => modifyElement({ variant: el.value })),
  );
  bind("[data-bg-element-role]", "change", (el) =>
    update(() =>
      modifyElement({
        role: el.value,
        size: typeStyle(g, el.value).size,
        font: "",
      }),
    ),
  );
  bind("[data-bg-show-variant]", "change", (el) =>
    update(() => {
      current.variants = host.querySelectorAll("[data-bg-show-variant]:checked")
        .length
        ? [...host.querySelectorAll("[data-bg-show-variant]:checked")].map(
            (e) => e.dataset.bgShowVariant,
          )
        : [];
    }),
  );
  bind("[data-bg-rule-up], [data-bg-rule-down]", "click", (el) =>
    update(() => {
      const id = el.dataset.bgRuleUp || el.dataset.bgRuleDown,
        i = current.misuses.indexOf(id),
        j = i + (el.dataset.bgRuleUp ? -1 : 1);
      if (j >= 0 && j < current.misuses.length)
        [current.misuses[i], current.misuses[j]] = [
          current.misuses[j],
          current.misuses[i],
        ];
    }),
  );
  bind("[data-bg-misuse]", "change", (el) =>
    update(() => {
      current.misuses = el.checked
        ? [...current.misuses, el.dataset.bgMisuse]
        : current.misuses.filter((id) => id !== el.dataset.bgMisuse);
      if (current.misuses.length > 6) {
        const extra = page("misuse");
        extra.variants = [...current.variants];
        extra.misuses = current.misuses.splice(6);
        g.pages.splice(g.pages.indexOf(current) + 1, 0, extra);
      }
    }),
  );
  bind("[data-bg-brief]", "change", (el) =>
    update(() => (g.brief[el.dataset.bgBrief] = el.value)),
  );
  bind("[data-bg-color]", "change", (el) =>
    update(() => {
      const [id, k] = el.dataset.bgColor.split(":");
      (g.colorRoles[id] ||= {})[k] = k === "order" ? +el.value : el.value;
    }),
  );
  bind("[data-bg-percent]", "change", (el) =>
    update(() => setDistribution(g, p.colors, el.dataset.bgPercent, el.value)),
  );
  bind("[data-bg-pair]", "change", (el) =>
    update(
      () =>
        (g.pairs[el.dataset.bgPair] = {
          manual: el.value !== "auto",
          allowed: el.value === "true",
        }),
    ),
  );
  bind("[data-bg-font-role]", "change", (el) =>
    update(
      () =>
        (g.typography[el.dataset.bgFontRole] = {
          ...typeStyle(g, el.dataset.bgFontRole),
          font: el.value,
        }),
    ),
  );
  bind("[data-bg-type]", "change", (el) =>
    update(() => {
      const [r, k] = el.dataset.bgType.split(":");
      g.typography[r] = {
        ...typeStyle(g, r),
        [k]: limit(
          el.value,
          k === "tracking" ? -3 : k === "leading" ? 0.8 : 5,
          k === "weight" ? 900 : k === "leading" ? 3 : 150,
        ),
      };
    }),
  );
  bind("[data-bg-export]", "change", (el) =>
    update(() => (g.exports[el.dataset.bgExport] = el.checked)),
  );
  bind("[data-bg-text-mode]", "change", (el) =>
    update(() => (g.exports.text = el.value)),
  );
  bind("[data-bg-zoom]", "change", (el) => {
    zoom = +el.value;
    mountGuideline(host, p, edit, navigate, notice);
  });
  const imports = async (files) => {
    const replaceId = replaceImage ? selection : null;
    replaceImage = false;
    try {
      for (const [fileIndex, file] of files.entries()) {
        const resource = await importResource(file, g);
        update(() => {
          if (!g.resources.some((r) => r.id === resource.id))
            g.resources.push(resource);
          if (resource.type === "font") {
            for (const role of ROLES)
              if (!g.typography[role]?.font)
                g.typography[role] = {
                  ...typeStyle(g, role),
                  font: resource.id,
                };
          } else {
            const chosen = current.elements.find(
              (e) =>
                fileIndex === 0 && e.id === replaceId && e.type === "image",
            );
            if (chosen) chosen.resource = resource.id;
            else {
              addElement("image", {
                resource: resource.id,
                text: "",
                zoom: 1,
                panX: 0.5,
                panY: 0.5,
              });
              arrangeImages(current, g.format);
            }
          }
        });
      }
      await loadFonts(g);
    } catch (e) {
      notice(t(e.message));
    }
  };
  bind("[data-bg-images], [data-bg-fonts]", "change", (el) =>
    imports([...el.files]),
  );
  const canvas = host.querySelector(".bg-canvas");
  if (g.theme.guides) {
    const guides = document.createElement("div");
    guides.className = "bg-guides";
    const m = theme(p).margin;
    Object.assign(guides.style, {
      left: (m / W) * 100 + "%",
      right: (m / W) * 100 + "%",
      top: (m / H) * 100 + "%",
      bottom: (m / H) * 100 + "%",
      backgroundSize: `${(theme(p).grid / W) * 100}% ${(theme(p).grid / H) * 100}%`,
    });
    canvas.append(guides);
  }
  canvas.ondragover = (e) => e.preventDefault();
  canvas.ondrop = (e) => {
    e.preventDefault();
    imports([...e.dataTransfer.files]);
  };
  canvas.querySelectorAll("[data-guide-element]").forEach((node) => {
    const id = node.dataset.guideElement,
      e = els.find((a) => a.id === id);
    node.onkeydown = (event) => {
      if (event.key === "Enter") {
        selection = id;
        mountGuideline(host, p, edit, navigate, notice);
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      ) {
        event.preventDefault();
        selection = id;
        const d = event.shiftKey ? 10 : 1;
        const original = els.find((a) => a.id === id);
        update(() => {
          const destination =
            current.elements.find((a) => a.id === id) ||
            (current.styles[id] ||= {});
          Object.assign(destination, {
            x: original.x / W,
            y: original.y / H,
            w: original.w / W,
            h: original.h / H,
            size: original.size || 12,
            ...current.styles[id],
            ...(event.key === "ArrowLeft" || event.key === "ArrowRight"
              ? {
                  x:
                    limit(
                      original.x + (event.key === "ArrowLeft" ? -d : d),
                      0,
                      W - original.w,
                    ) / W,
                }
              : {
                  y:
                    limit(
                      original.y + (event.key === "ArrowUp" ? -d : d),
                      0,
                      H - original.h,
                    ) / H,
                }),
          });
        });
      }
    };
    node.ondblclick = () => {
      selection = id;
      mountGuideline(host, p, edit, navigate, notice);
      host.querySelector("[data-bg-text]")?.focus();
    };
    node.onpointerdown = (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      selection = id;
      const rect = canvas.querySelector("svg").getBoundingClientRect(),
        startX = event.clientX,
        startY = event.clientY;
      const move = (ev) => {
        node.setAttribute(
          "transform",
          `translate(${((ev.clientX - startX) * W) / rect.width} ${((ev.clientY - startY) * H) / rect.height})`,
        );
      };
      const up = (ev) => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        const dx = ((ev.clientX - startX) * W) / rect.width,
          dy = ((ev.clientY - startY) * H) / rect.height;
        if (Math.abs(dx) + Math.abs(dy) < 2) {
          const inline =
            lastClick.id === id &&
            Date.now() - lastClick.at < 500 &&
            e.type === "text";
          lastClick = { id, at: Date.now() };
          mountGuideline(host, p, edit, navigate, notice);
          if (inline) {
            lastClick = { id: "", at: 0 };
            host
              .querySelector('.bg-canvas [data-guide-element="' + id + '"]')
              ?.ondblclick?.();
          }
          return;
        }
        update(() => {
          const custom = current.elements.find((a) => a.id === id),
            snap = (value) =>
              g.theme.guides && theme(p).grid
                ? Math.round(value / theme(p).grid) * theme(p).grid
                : value,
            x = limit(snap(e.x + dx), 0, W - e.w) / W,
            y = limit(snap(e.y + dy), 0, H - e.h) / H;
          if (custom) {
            custom.x = x;
            custom.y = y;
          } else
            current.styles[id] = {
              ...current.styles[id],
              x,
              y,
              w: e.w / W,
              h: e.h / H,
              size: e.size || 12,
              ...(e.text !== undefined ? { text: e.text } : {}),
            };
        });
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up, { once: true });
    };
  });
  selectionControls(canvas, p, current, selected, update, () =>
    mountGuideline(host, p, edit, navigate, notice),
  );
  for (const [selector, top] of scrolls)
    host.querySelector(selector).scrollTop = top;
  loadFonts(g).catch((e) => notice(t(e.message)));
}
