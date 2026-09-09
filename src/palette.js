import { t } from "./i18n.js";
import { esc } from "./ui.js";
import { resetColorChoices } from "./workshop.js";

export function editColor(p, id, edit) {
  const existing = p.colors.find((c) => c.id === id);
  const color = existing || {
    hex: "#ff5500",
    name: t("Couleur") + " " + (p.colors.length + 1),
  };
  const dialog = document.createElement("dialog");
  dialog.className = "palette-editor";
  dialog.setAttribute("aria-label", t("Palette de couleurs"));
  dialog.innerHTML = `<form method="dialog"><div class="section-title"><h2>${t(existing ? "Modifier la couleur" : "Ajouter une couleur")}</h2><button value="cancel" formnovalidate aria-label="${t("Annuler")}">×</button></div><label class="palette-picker">${t("Couleur")}<input type="color" name="color" value="${color.hex}"></label><label class="field">HEX<input name="hex" value="${color.hex}" pattern="#[0-9a-fA-F]{6}" maxlength="7" required spellcheck="false" autocomplete="off"></label><label class="field">${t("Nom de couleur")}<input name="name" value="${esc(color.name)}" maxlength="100" required></label><div class="dialog-actions">${existing ? `<button value="delete" formnovalidate>${t("Supprimer")}</button>` : ""}<button value="cancel" formnovalidate>${t("Annuler")}</button><button class="primary" value="apply">${t("Appliquer")}</button></div></form>`;
  const picker = dialog.querySelector('[name="color"]');
  const hex = dialog.querySelector('[name="hex"]');
  picker.oninput = () => {
    hex.value = picker.value;
  };
  hex.oninput = () => {
    if (hex.validity.valid) picker.value = hex.value;
  };
  dialog.onclose = () => {
    if (dialog.returnValue === "delete" && existing) {
      edit(() => {
        p.colors = p.colors.filter((c) => c.id !== id);
        resetColorChoices(p);
      });
    } else if (
      dialog.returnValue === "apply" &&
      dialog.querySelector("form").checkValidity()
    ) {
      edit(() => {
        const next = {
          id: existing?.id || crypto.randomUUID(),
          hex: hex.value.toLowerCase(),
          name: dialog.querySelector('[name="name"]').value,
        };
        if (existing) Object.assign(existing, next);
        else p.colors.push(next);
        resetColorChoices(p);
      });
    }
    dialog.remove();
  };
  document.body.append(dialog);
  dialog.showModal();
}
