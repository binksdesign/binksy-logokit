import {
  prepareGuide,
  generateGuide,
  finalPalette,
  COLOR_ROLES, colorRoles,
  EDITORIAL_TYPES,
  assignFontRoles,
  guideVariants,
} from "./guideline-config.js";
import {
  field,
  option,
  fontControls,
  bindFonts,
  mediaControls,
  bindMedia,
} from "./guideline-controls.js";
import { PAGE_TYPES, MISUSES, uid } from "./guideline-model.js";
import { escape as esc } from "./guideline-svg.js";
import { variantName, isReadyVariant, contrast } from "./model.js";
import { t } from "./i18n.js";

const STEPS = [
  "Typographies",
  "Palette finale",
  "Pantone",
  "Associations de couleurs",
  "Couverture",
  "Mockups",
  "Interdits logo",
];
export function mountGuideWizard(host, p, edit, notice) {
  const g = prepareGuide(p),
    s = g.setup,
    colors = finalPalette(p),
    step = s.step;
  const variants = guideVariants(p);
  const update = (fn) => edit(fn);
  const variantOptions = (selected) =>
    variants.map((v) => option(v, variantName(p, v), selected)).join("");
  let content = "";
  if (step === 0) content = fontControls(g);
  if (step === 1)
    content =
      colors
        .map(
          (c, i) =>
            `<div class="bg-palette-row"><input aria-label="${t("Couleur")}" data-palette-hex="${c.id}" type="color" value="${c.hex}">${field("Nom", `<input data-palette-name="${c.id}" value="${esc(c.name)}">`)}${field(
              "Rôle",
              `<input data-palette-role="${c.id}" list="guide-color-roles" value="${esc(t(colorRoles(g)[c.role] || c.role || ''))}" placeholder="${t('Rechercher ou créer un rôle')}" maxlength="100">`,
            )}<button data-palette-up="${c.id}" aria-label="${t("Monter")}" ${i === 0 ? "disabled" : ""}>↑</button><button data-palette-remove="${c.id}" aria-label="${t("Retirer de la palette")}" ${colors.length < 2 ? "disabled" : ""}>×</button></div>`,
        )
        .join("") +
      `<datalist id="guide-color-roles">${Object.values(colorRoles(g)).map(label=>`<option value="${esc(t(label))}"></option>`).join("")}</datalist><button type="button" data-add-color-role>+ ${t("Ajouter un rôle personnalisé")}</button><button data-palette-add>+ ${t("Ajouter une couleur")}</button>`;
  if (step === 2)
    content = colors
      .map((c) =>
        field(
          c.name,
          `<input data-palette-spot="${c.id}" value="${esc(c.spot || "")}" placeholder="${t("Optionnel")}">`,
        ),
      )
      .join("");
  if (step === 3)
    content = `<p class="bg-wizard-note">${t("Cochez les associations à valider. Décochez celles à éviter.")}</p><div class="bg-pair-review">${colors.flatMap(foreground=>colors.filter(background=>background.id!==foreground.id).map(background=>{
      const key=foreground.id+":"+background.id, decision=g.pairs[key], recommended=contrast(foreground.hex,background.hex)>=4.5;
      const allowed=decision?.manual ? decision.allowed : recommended;
      return `<label class="bg-pair-choice" style="--pair-bg:${background.hex};--pair-fg:${foreground.hex}"><input type="checkbox" data-setup-pair="${esc(key)}" ${allowed?"checked":""}><span class="bg-pair-sample">Aa</span><span><strong>${esc(foreground.name)} ${t("sur")} ${esc(background.name)}</strong><small>${contrast(foreground.hex,background.hex).toFixed(2)}:1 · ${t(allowed?"Validée":"À éviter")}</small></span></label>`;
    })).join("")}</div>`;
  if (step === 4)
    content =
      `<div class="bg-choice"><button data-cover-mode="logo" aria-pressed="${s.cover.mode === "logo"}">${t("Version du logo")}</button><button data-cover-mode="image" aria-pressed="${s.cover.mode === "image"}">${t("Image")}</button></div>` +
      (s.cover.mode === "logo"
        ? field(
            "Variante",
            `<select data-cover-variant>${variantOptions(s.cover.variant)}</select>`,
          )
        : mediaControls(
            s.cover.media || {},
            g.resources.find((r) => r.id === s.cover.media?.resource),
            "cover",
          ));
  if (step === 5)
    content = `<p class="bg-wizard-note">${t("Une image par page. Jusqu’à 3 mockups.")}</p>${s.mockups
      .map(
        (m, i) =>
          `<div class="bg-mockup"><h3>${t("Mockup")} ${i + 1}</h3>${mediaControls(
            m.media || {},
            g.resources.find((r) => r.id === m.media?.resource),
            m.id,
          )}${field("Titre", `<input data-mockup-title="${m.id}" value="${esc(m.title || "")}">`)}${field("Légende", `<input data-mockup-caption="${m.id}" value="${esc(m.caption || "")}">`)}<button data-mockup-remove="${m.id}">${t("Supprimer")}</button></div>`,
      )
      .join(
        "",
      )}<button data-mockup-add ${s.mockups.length >= 3 ? "disabled" : ""}>+ ${t("Ajouter un mockup")}</button>`;
  if (step === 6)
    content =
      field(
        "Variante des interdits",
        `<select data-misuse-variant>${variantOptions(s.misuseVariant)}</select>`,
      ) +
      `<div class="bg-checks">${Object.entries(MISUSES)
        .filter(([key]) => key !== "correct")
        .map(
          ([key, label]) =>
            `<label><input data-setup-misuse="${key}" type="checkbox" ${s.misuses.includes(key) ? "checked" : ""} ${["proportions", "spacing"].includes(key) && (isReadyVariant(p, s.misuseVariant) || ["icon", "wordmark"].includes(s.misuseVariant)) ? "disabled" : ""}>${t(label)}</label>`,
        )
        .join(
          "",
        )}</div><details><summary>${t("Pages de marque facultatives")}</summary>${EDITORIAL_TYPES.map((type) => `<label class="check"><input data-setup-content="${type}" type="checkbox" ${s.content.includes(type) ? "checked" : ""}>${t(PAGE_TYPES[type])}</label>`).join("")}</details>`;
  host.setAttribute("data-no-i18n", "");
  host.innerHTML = `<section class="bg-wizard"><header><span>05 / BRAND GUIDELINE</span><h1>${t(STEPS[step])}</h1></header><nav aria-label="${t("Préparation du guide")}">${STEPS.map((label, i) => `<button type="button" data-setup-step="${i}" aria-current="${i === step ? "step" : "false"}"><span>${i + 1}</span>${t(label)}</button>`).join("")}</nav><div class="bg-wizard-content">${content}</div><footer><button type="button" data-setup-prev ${step === 0 ? "disabled" : ""}>${t("Précédent")}</button>${g.pages.length ? `<button type="button" data-setup-return>${t("Retour au document")}</button>` : ""}<button type="button" class="primary" data-setup-next>${t(step === 6 ? "Générer le Brand Guideline" : "Continuer")}</button></footer></section>`;
  host
    .querySelectorAll("[data-setup-step]")
    .forEach(
      (el) =>
        (el.onclick = () => update(() => (s.step = +el.dataset.setupStep))),
    );
  host.querySelector("[data-setup-prev]").onclick = () =>
    update(() => s.step--);
  host
    .querySelector("[data-setup-return]")
    ?.addEventListener("click", () => update(() => (s.complete = true)));
  host.querySelector("[data-setup-next]").onclick = () => {
    if (!finalPalette(p).length)
      return notice(t("Ajoutez au moins une couleur."));
    if (step === 4 && s.cover.mode === "image" && !s.cover.media?.resource)
      return notice(t("Importez une image de couverture."));
    if (step === 6 && s.mockups.some((m) => !m.media?.resource))
      return notice(
        t("Importez les mockups ou retirez les emplacements vides."),
      );
    update(() => {
      if (step === 3) s.associationsReviewed = true;
      step === 6 ? generateGuide(p) : s.step++;
    });
  };
  host.querySelectorAll("[data-setup-pair]").forEach(el=>el.onchange=()=>update(()=>{
    g.pairs[el.dataset.setupPair]={allowed:el.checked,hidden:false,manual:true,source:"manual"};
    s.associationsReviewed=true;
  }));
  host.querySelector('[data-add-color-role]')?.addEventListener('click',()=>{
    const name=prompt(t('Nom du rôle personnalisé'))?.trim().slice(0,100);
    if(name)update(()=>{g.customColorRoles=[...new Set([...(g.customColorRoles||[]),name])];});
  });
  host.querySelectorAll('[data-palette-role]').forEach(el=>el.onchange=()=>update(()=>{
    const name=el.value.trim(), role=Object.entries(colorRoles(g)).find(([,label])=>t(label)===name)?.[0] || name;
    if(role && !Object.hasOwn(colorRoles(g),role))g.customColorRoles=[...new Set([...(g.customColorRoles||[]),role])];
    g.palette.find(c=>c.id===el.dataset.paletteRole).role=role;
  }));
  for (const key of ["hex", "name", "spot"])
    host
      .querySelectorAll(`[data-palette-${key}]`)
      .forEach(
        (el) =>
          (el.onchange = () =>
            update(
              () =>
                (g.palette.find(
                  (c) => c.id === el.getAttribute(`data-palette-${key}`),
                )[key] = el.value),
            )),
      );
  host
    .querySelectorAll("[data-palette-remove]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          update(
            () =>
              (g.palette = g.palette.filter(
                (c) => c.id !== el.dataset.paletteRemove,
              )),
          )),
    );
  host.querySelectorAll("[data-palette-up]").forEach(
    (el) =>
      (el.onclick = () =>
        update(() => {
          const i = g.palette.findIndex((c) => c.id === el.dataset.paletteUp);
          [g.palette[i - 1], g.palette[i]] = [g.palette[i], g.palette[i - 1]];
        })),
  );
  host
    .querySelector("[data-palette-add]")
    ?.addEventListener("click", () =>
      update(() =>
        g.palette.push({
          id: uid(),
          name: t("Nouvelle couleur"),
          hex: "#171717",
          role: "",
        }),
      ),
    );
  host
    .querySelectorAll("[data-cover-mode]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          update(() => (s.cover.mode = el.dataset.coverMode))),
    );
  host
    .querySelector("[data-cover-variant]")
    ?.addEventListener("change", (e) =>
      update(() => (s.cover.variant = e.target.value)),
    );
  host
    .querySelector("[data-mockup-add]")
    ?.addEventListener("click", () =>
      update(() =>
        s.mockups.push({
          id: uid(),
          media: {},
          title: "",
          caption: "",
          layout: "hero",
        }),
      ),
    );
  host
    .querySelectorAll("[data-mockup-remove]")
    .forEach(
      (el) =>
        (el.onclick = () =>
          update(
            () =>
              (s.mockups = s.mockups.filter(
                (m) => m.id !== el.dataset.mockupRemove,
              )),
          )),
    );
  for (const key of ["title", "caption"])
    host
      .querySelectorAll(`[data-mockup-${key}]`)
      .forEach(
        (el) =>
          (el.onchange = () =>
            update(
              () =>
                (s.mockups.find(
                  (m) => m.id === el.getAttribute(`data-mockup-${key}`),
                )[key] = el.value),
            )),
      );
  host.querySelector("[data-misuse-variant]")?.addEventListener("change", (e) =>
    update(() => {
      s.misuseVariant = e.target.value;
      if (
        isReadyVariant(p, s.misuseVariant) ||
        ["icon", "wordmark"].includes(s.misuseVariant)
      )
        s.misuses = s.misuses.filter(
          (v) => !["proportions", "spacing"].includes(v),
        );
    }),
  );
  for (const [attr, key] of [
    ["misuse", "misuses"],
    ["content", "content"],
  ])
    host.querySelectorAll(`[data-setup-${attr}]`).forEach(
      (el) =>
        (el.onchange = () =>
          update(() => {
            const v = el.getAttribute(`data-setup-${attr}`);
            s[key] = el.checked
              ? [...new Set([...s[key], v])]
              : s[key].filter((x) => x !== v);
          })),
    );
  bindFonts(host, g, update, notice, assignFontRoles);
  bindMedia(
    host,
    g,
    (key) =>
      key === "cover"
        ? (s.cover.media ||= {})
        : (s.mockups.find((m) => m.id === key).media ||= {}),
    update,
    notice,
  );
}
