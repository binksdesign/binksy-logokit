import { PROVIDERS, listModels, complete, endpoint } from "./ai-providers.js";
import {
  stageContext,
  validateActions,
  applyActions,
  actionInstructions,
} from "./ai-context.js";
import { escape as esc } from "./guideline-svg.js";
import { t, language } from "./i18n.js";
const vault = new Map();
let providerId = "openai";
const prefix = "binksy-ai-provider:";
export function openAssistant(p, stage, edit) {
  const dialog = document.createElement("dialog");
  dialog.className = "ai-dialog";
  document.body.append(dialog);
  let proposal = null,
    current = PROVIDERS[providerId],
    saved = {},
    busy = false;
  const read = () => {
    try {
      saved = JSON.parse(localStorage.getItem(prefix + current.id) || "{}");
    } catch {
      saved = {};
    }
  };
  read();
  const draw = () => {
    dialog.innerHTML = `<h2>${t("Assistant IA")} · ${t({ import: "Importer", compose: "Assembler le logo", family: "Versions du logo", guideline: "Brand Guideline", delivery: "Exporter" }[stage] || stage)}</h2><p>${t("Les propositions restent limitées à cette étape.")}</p><label>${t("Fournisseur")}<select data-provider>${Object.values(
      PROVIDERS,
    )
      .map(
        (v) =>
          `<option value="${v.id}" ${v.id === current.id ? "selected" : ""}>${t(v.name)}</option>`,
      )
      .join(
        "",
      )}</select></label>${current.link ? `<a href="${current.link}" target="_blank" rel="noreferrer">${t("Créer une clé dans la console du fournisseur")}</a>` : ""}<label>${t("Adresse API")}<input data-base value="${esc(current.base || saved.base || "")}" ${current.id !== "custom" ? "readonly" : ""}></label><label>${t("Clé API")}<input data-key type="password" autocomplete="off" placeholder="${vault.has(current.id) || saved.key ? "••••••••" : ""}"></label><label><input data-remember type="checkbox" ${saved.key ? "checked" : ""}>${t("Mémoriser sur cet appareil")}</label><div class="ai-actions"><button data-store>${t("Enregistrer la clé")}</button><button data-delete>${t("Supprimer la clé")}</button><button data-refresh>${t("Tester la connexion / Actualiser")}</button></div><p data-cache></p><label>${t("Modèle — ID libre")}<input data-model list="ai-models" value="${esc(saved.model || "")}" maxlength="200"><datalist id="ai-models"></datalist></label><label>${t("Votre demande")}<textarea data-prompt></textarea></label><div class="ai-actions"><button data-send>${t("Proposer")}</button><button data-apply disabled>${t("Appliquer la proposition")}</button><button data-close>${t("Fermer")}</button></div><output aria-live="polite"></output>`;
    const q = (s) => dialog.querySelector(s),
      out = (message) => (q("output").textContent = t(message));
    let key = vault.get(current.id) || saved.key || "",
      base = current.base || saved.base || "";
    const cacheKey = () => prefix + current.id + ":models:" + base;
    const showCache = () => {
      try {
        const cache = JSON.parse(localStorage.getItem(cacheKey()) || "null");
        q("#ai-models").replaceChildren(
          ...(cache?.models || []).map((m) => {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.label = m.name;
            return opt;
          }),
        );
        q("[data-cache]").textContent = cache
          ? `${t("Mis à jour")} : ${new Date(cache.at).toLocaleString()}`
          : "";
        return cache;
      } catch {
        return null;
      }
    };
    const saveSettings = () => {
      key = q("[data-key]").value.trim() || key;
      base = q("[data-base]").value.trim();
      endpoint(current, base);
      vault.set(current.id, key);
      const remember = q("[data-remember]").checked;
      localStorage.setItem(
        prefix + current.id,
        JSON.stringify({
          base,
          model: q("[data-model]").value.trim(),
          ...(remember ? { key } : {}),
        }),
      );
      q("[data-key]").value = "";
      q("[data-key]").placeholder = key ? "••••••••" : "";
    };
    const refresh = async () => {
      try {
        saveSettings();
        if (!key) throw Error("Ajoutez une clé API.");
        q("[data-refresh]").disabled = true;
        out("Connexion…");
        const models = await listModels(current, key, base);
        localStorage.setItem(
          cacheKey(),
          JSON.stringify({ at: Date.now(), models }),
        );
        showCache();
        out("Catalogue actualisé. La saisie manuelle reste disponible.");
      } catch (e) {
        out(e.message);
      } finally {
        q("[data-refresh]").disabled = false;
      }
    };
    q("[data-base]").onchange = () => {
      key = "";
      vault.delete(current.id);
      q("[data-key]").value = "";
      q("[data-key]").placeholder = "";
    };
    q("[data-store]").onclick = () => {
      try {
        saveSettings();
        out("Clé enregistrée sur cet appareil.");
      } catch (e) {
        out(e.message);
      }
    };
    q("[data-delete]").onclick = () => {
      vault.delete(current.id);
      localStorage.removeItem(prefix + current.id);
      key = "";
      q("[data-key]").value = "";
      q("[data-key]").placeholder = "";
    };
    q("[data-refresh]").onclick = refresh;
    q("[data-provider]").onchange = () => {
      current = PROVIDERS[q("[data-provider]").value];
      providerId = current.id;
      proposal = null;
      read();
      draw();
    };
    q("[data-close]").onclick = () => dialog.close();
    q("[data-send]").onclick = async () => {
      try {
        saveSettings();
        if (!key) throw Error("Ajoutez une clé API.");
        const model = q("[data-model]").value.trim();
        if (!model) throw Error("Choisissez un modèle.");
        busy = true;
        q("[data-send]").disabled = true;
        q("[data-provider]").disabled = true;
        q("[data-apply]").disabled = true;
        out("Préparation de la proposition…");
        const answer = await complete(
          current,
          key,
          base,
          model,
          actionInstructions + " Reply in " + language(),
          JSON.stringify({
            context: stageContext(p, stage),
            request: q("[data-prompt]").value.slice(0, 6000),
          }),
        );
        proposal = validateActions(answer, stage, p);
        out(
          proposal.message + "\n\n" + JSON.stringify(proposal.actions, null, 2),
        );
        q("[data-apply]").disabled = !proposal.actions.length;
      } catch (e) {
        out(e.message);
      } finally {
        busy = false;
        q("[data-send]").disabled = false;
        q("[data-provider]").disabled = false;
      }
    };
    q("[data-apply]").onclick = () => {
      if (!proposal) return;
      try {
        edit(() => applyActions(p, stage, proposal));
        dialog.close();
      } catch (e) {
        out(e.message);
      }
    };
    const cache = showCache();
    if (key && (!cache || Date.now() - cache.at > 86400000)) refresh();
  };
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  draw();
  dialog.showModal();
}
