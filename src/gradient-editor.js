import { shade } from "./paints.js";
import { layout } from "./model.js";
import { compositionSVG, assetMarkup } from "./svg.js";
import { gradientSettings, updateGradient } from "./gradient.js";
import { rolesFor } from "./catalog.js";
import { t } from "./i18n.js";
import { esc } from "./ui.js";

export function editGradient(p, item, edit) {
  const original =
    p.gradients.find((g) => g.id === item.color.gradient.id) ||
    item.color.gradient;
  const g = structuredClone({ ...original, ...gradientSettings(original) });
  const dialog = document.createElement("dialog");
  dialog.className = "gradient-editor";
  dialog.setAttribute("aria-label", t("Modifier le dégradé"));
  let selected = 0;
  const preview = (patch = {}) =>
    compositionSVG(p, item.variant, {
      ...item.color,
      gradient: { ...g, ...patch },
    });
  const update = () => {
    const sorted = [...g.stops].sort((a, b) => a.offset - b.offset);
    g.from = sorted[0].color;
    g.to = sorted.at(-1).color;
    dialog.querySelector(".gradient-live").innerHTML = preview();
    dialog.querySelector(".gradient-track").style.background =
      `linear-gradient(90deg,${sorted.map((s) => `${s.color} ${s.offset * 100}%`).join(",")})`;
    dialog.querySelectorAll("[data-stop]").forEach((el) => {
      const stop = g.stops[+el.dataset.stop];
      el.style.left = stop.offset * 100 + "%";
      el.style.background = stop.color;
      el.setAttribute("aria-pressed", String(+el.dataset.stop === selected));
    });
    dialog.querySelectorAll(".stop-row").forEach((row, i) => {
      row.classList.toggle("active", i === selected);
    });
    dialog
      .querySelectorAll("[data-mode-preview]")
      .forEach(
        (el) => (el.innerHTML = preview({ mode: el.dataset.modePreview })),
      );
    dialog
      .querySelectorAll("[data-angle-preview]")
      .forEach(
        (el) => (el.innerHTML = preview({ angle: +el.dataset.anglePreview })),
      );
  };
  const render = () => {
    const activeStop = g.stops[selected];
    g.stops.sort((a, b) => a.offset - b.offset);
    selected = Math.max(0, g.stops.indexOf(activeStop));
    dialog.innerHTML = `<form method="dialog"><div class="section-title"><h2>${t("Modifier le dégradé")}</h2><button value="cancel" formnovalidate aria-label="${t("Annuler")}">×</button></div>
      <label class="field">${t("Nom du dégradé")}<input name="gradient-name" required maxlength="100" value="${esc(g.name || "")}"></label><div class="gradient-live checker"></div>
      <div class="visual-options">${[
        ["auto", "Automatique"],
        ["global", "Dégradé global"],
        ["shape", "Dégradé par forme"],
      ]
        .map(
          ([mode, label]) =>
            `<button type="button" data-gradient-mode="${mode}" aria-pressed="${g.mode === mode}"><div data-mode-preview="${mode}"></div>${t(label)}</button>`,
        )
        .join("")}</div>
      <div class="gradient-track" aria-label="${t("Stops du dégradé")}">${g.stops.map((s, i) => `<button type="button" data-stop="${i}" style="left:${s.offset * 100}%;background:${s.color}" aria-label="${t("Couleur")} ${i + 1}" aria-pressed="${i === selected}"></button>`).join("")}</div>
      <div class="gradient-palette">${p.colors
        .flatMap((c) => [c.hex, shade(c.hex, 0.16), shade(c.hex, -0.16)])
        .map(
          (hex) =>
            `<button type="button" data-palette-stop="${hex}" style="background:${hex}" aria-label="${hex}" title="${hex}"></button>`,
        )
        .join("")}</div>
      <div class="stop-controls">${g.stops.map((s, i) => `<div class="stop-row"><input type="color" name="${i === 0 ? "from" : i === g.stops.length - 1 ? "to" : "stop-" + i}" data-stop-color="${i}" value="${s.color}" aria-label="${t("Couleur")} ${i + 1}"><input type="range" min="0" max="100" value="${s.offset * 100}" data-stop-position="${i}" aria-label="${t("Position")} ${i + 1}"><output>${Math.round(s.offset * 100)}%</output><button type="button" data-remove-stop="${i}" ${g.stops.length <= 2 ? "disabled" : ""} aria-label="${t("Supprimer")} ${i + 1}">×</button></div>`).join("")}</div>
      <button type="button" data-add-stop >+ ${t("Ajouter une couleur")}</button>
      <div class="visual-options angles">${[0, 90, 45, -45].map((angle, i) => `<button type="button" data-gradient-angle="${angle}" aria-pressed="${g.angle === angle}"><div data-angle-preview="${angle}"></div>${t(["Horizontal", "Vertical", "45°", "−45°"][i])}</button>`).join("")}</div>
      <label class="field">${t("Angle du dégradé")}<input name="angle" type="number" min="-360" max="360" value="${g.angle || 0}"></label>
      <details open><summary>${t("Application du dégradé")}</summary><label class="field">${t("Appliquer à")}<select data-gradient-paint>${[
        ["both", "Remplissage et tracé"],
        ["fill", "Remplissage"],
        ["stroke", "Tracé"],
      ]
        .map(
          ([value, label]) =>
            `<option value="${value}" ${g.paint === value ? "selected" : ""}>${t(label)}</option>`,
        )
        .join(
          "",
        )}</select></label><label class="field">${t("Opacité du tracé")}<input type="range" data-stroke-opacity min="0" max="100" value="${g.strokeOpacity * 100}"></label>${layout(
        p,
        item.variant,
      )
        .parts.map((part) => {
          const key = part.key === "ready" ? item.variant : part.key;
          return `<h3>${esc(t(part.key === "icon" ? "Icône" : part.key === "wordmark" ? "Logotype" : "Formes"))}</h3>${(
            part.asset.roles || []
          )
            .flatMap((r) =>
              r.targets
                .filter((target) => target.prop !== "stop-color")
                .map((target) => {
                  const id = key + ":" + target.index + ":" + target.prop;
                  return `<label class="check"><input type="checkbox" data-gradient-target="${id}" ${g.excludedTargets.includes(id) || r.locked ? "" : "checked"} ${r.locked ? "disabled" : ""}>${t("Forme")} ${target.index} · ${t(target.prop === "fill" ? "Remplissage" : "Tracé")} <i class="paint-dot" style="background:${r.paint}"></i></label>`;
                }),
            )
            .join("")}`;
        })
        .join("")}</details>
      <details open><summary>${t("Formes participant au dégradé")}</summary><p>${t("Décochez une couleur pour conserver ses formes originales.")}</p>${rolesFor(
        p,
        item.variant,
      )
        .map(
          (r, i) =>
            `<label class="check"><input type="checkbox" data-participate="${esc(r.id)}" ${g.excludedRoles.includes(r.id) || r.locked ? "" : "checked"} ${r.locked ? "disabled" : ""}><i class="paint-dot" style="background:${r.paint}"></i>${t("Couleur")} ${i + 1}${r.locked ? " · " + t("Verrouiller") : ""}</label>`,
        )
        .join("")}</details>
      <div class="dialog-actions"><button value="cancel" formnovalidate>${t("Annuler")}</button><button class="primary" value="apply">${t("Appliquer")}</button></div></form>`;
    dialog.querySelector('[name="gradient-name"]').oninput = e => { g.name = e.target.value; e.target.setCustomValidity(e.target.value.trim() ? "" : t("Nom obligatoire")); };
    update();
    dialog.querySelectorAll("[data-palette-stop]").forEach(
      (el) =>
        (el.onclick = () => {
          g.stops[selected].color = el.dataset.paletteStop;
          render();
        }),
    );
    dialog.querySelector("[data-gradient-paint]").onchange = (e) => {
      g.paint = e.target.value;
      update();
    };
    dialog.querySelector("[data-stroke-opacity]").oninput = (e) => {
      g.strokeOpacity = +e.target.value / 100;
      update();
    };
    dialog.querySelectorAll("[data-gradient-target]").forEach(
      (el) =>
        (el.onchange = () => {
          g.excludedTargets = el.checked
            ? g.excludedTargets.filter((id) => id !== el.dataset.gradientTarget)
            : [...g.excludedTargets, el.dataset.gradientTarget];
          update();
        }),
    );
    dialog.querySelectorAll("[data-gradient-target]").forEach((el) => {
      const show = () => {
        const [key, index] = el.dataset.gradientTarget.split(":");
        const part = layout(p, item.variant).parts.find(
          (q) => (q.key === "ready" ? item.variant : q.key) === key,
        );
        if (part)
          dialog.querySelector(".gradient-live").innerHTML = assetMarkup(
            part.asset,
            { highlightTarget: +index },
            "gradient-inspection",
          );
      };
      el.parentElement.onpointerenter = show;
      el.parentElement.onpointerleave = update;
      el.onfocus = show;
      el.onblur = update;
    });
    dialog.querySelectorAll("[data-gradient-mode]").forEach((el) => {
      el.onclick = () => {
        g.mode = el.dataset.gradientMode;
        render();
      };
      el.onpointerenter = () =>
        (dialog.querySelector(".gradient-live").innerHTML = preview({
          mode: el.dataset.gradientMode,
        }));
      el.onpointerleave = update;
    });
    dialog.querySelectorAll("[data-gradient-angle]").forEach(
      (el) =>
        (el.onclick = () => {
          g.angle = +el.dataset.gradientAngle;
          render();
        }),
    );
    dialog.querySelector('[name="angle"]').oninput = (e) => {
      if (e.target.validity.valid) {
        g.angle = +e.target.value;
        update();
      }
    };
    dialog.querySelectorAll("[data-stop-color]").forEach(
      (el) =>
        (el.oninput = () => {
          selected = +el.dataset.stopColor;
          g.stops[selected].color = el.value;
          update();
        }),
    );
    dialog.querySelectorAll("[data-stop-position]").forEach((el) => {
      const stop = g.stops[+el.dataset.stopPosition];
      el.oninput = () => {
        stop.offset = +el.value / 100;
        el.nextElementSibling.value = el.value + "%";
        update();
      };
      el.onchange = render;
    });
    dialog.querySelectorAll("[data-remove-stop]").forEach(
      (el) =>
        (el.onclick = () => {
          g.stops.splice(+el.dataset.removeStop, 1);
          selected = 0;
          render();
        }),
    );
    dialog.querySelector("[data-add-stop]").onclick = () => {
      g.stops.push({ offset: 0.5, color: g.stops[selected]?.color || g.from });
      selected = g.stops.length - 1;
      render();
    };
    dialog.querySelectorAll("[data-participate]").forEach(
      (el) =>
        (el.onchange = () => {
          g.excludedRoles = el.checked
            ? g.excludedRoles.filter((id) => id !== el.dataset.participate)
            : [...g.excludedRoles, el.dataset.participate];
          update();
        }),
    );
    dialog.querySelectorAll("[data-stop]").forEach((el) => {
      const stop = g.stops[+el.dataset.stop];
      el.onclick = () => {
        selected = g.stops.indexOf(stop);
        update();
        dialog
          .querySelectorAll("[data-stop]")
          .forEach((b) => b.setAttribute("aria-pressed", b === el));
        dialog.querySelectorAll("[data-stop-color]")[selected]?.focus();
      };
      el.onpointerdown = (e) => {
        selected = g.stops.indexOf(stop);
        update();
        el.setPointerCapture(e.pointerId);
        const box = dialog
          .querySelector(".gradient-track")
          .getBoundingClientRect();
        el.onpointermove = (e) => {
          stop.offset = Math.max(
            0,
            Math.min(1, (e.clientX - box.left) / box.width),
          );
          el.style.left = stop.offset * 100 + "%";
          update();
        };
        el.onpointerup = () => {
          el.onpointermove = null;
          render();
        };
        el.onpointercancel = () => {
          el.onpointermove = null;
          render();
        };
      };
    });
  };
  render();
  document.body.append(dialog);
  dialog.showModal();
  dialog.onclose = () => {
    if (dialog.returnValue === "apply") {
      // Read fields as well, including keyboard edits committed by submitting the form.
      dialog
        .querySelectorAll("[data-stop-color]")
        .forEach((el) => (g.stops[+el.dataset.stopColor].color = el.value));
      g.angle = +dialog.querySelector('[name="angle"]').value;
      update();
      g.name = dialog.querySelector('[name="gradient-name"]').value.trim();
      if (g.name) edit(() => updateGradient(p, g));
    }
    dialog.remove();
  };
}
