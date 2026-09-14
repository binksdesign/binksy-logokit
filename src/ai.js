import { visualMessage, recommendationMessage, recommendationInstructions, recommendationProject } from "./ai-recommendations.js";
import {
  PROVIDERS,
  FALLBACK_MODELS,
  endpoint,
  listModels,
  chatCompletion,
  acknowledgeTool,
} from "./ai-providers.js";
import {
  ProposalSession,
  projectContext,
  scopedAgentInstructions,
  proposalTool,
  actionSummary,
  proposalProject,
} from "./ai-agent.js";
import { activeGuideContext } from "./guideline-editor.js";
import { guidelineSVG, escape as esc } from "./guideline-svg.js";
import { t, language } from "./i18n.js";
import "./ai.css";

const vault = new Map(),
  sessions = new Map(),
  prefix = "binksy-ai-provider:";
let activeDialog;
const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};
export function openAssistant(
  project,
  stage,
  edit,
  live = () => ({ p: project, stage }),
  options = {},
) {
  const recommendation = options.recommendation, recommendationVariant = project.active;
  if(stage !== "guideline" && !recommendation) return;
  if (activeDialog?.isConnected) {
    activeDialog.querySelector("[data-prompt]")?.focus();
    return;
  }
  const session = recommendation ? new ProposalSession() : sessions.get(project.id) || new ProposalSession();
  if (!recommendation) sessions.set(project.id, session);
  if (recommendation) {
    session.propose = (p,proposal) => { recommendationProject(p,proposal,recommendation,recommendationVariant);session.active=structuredClone(proposal);session.base=JSON.stringify(p);session.revision++; };
    session.apply = (p,edit) => { if(session.base !== JSON.stringify(p)) throw Error("Le projet a changé. Demandez une proposition actualisée.");const next=recommendationProject(p,session.active,recommendation,recommendationVariant);edit(()=>{Object.assign(p,next);});session.active=null; };
  }
  const dialog = document.createElement("dialog");
  dialog.className = "ai-chat";
  dialog.dataset.kind = recommendation ? "recommendation" : "chat";
  dialog.setAttribute("aria-label", t("Assistant IA"));
  document.body.append(dialog);
  activeDialog = dialog;
  let providerId = read("binksy-ai-selected") || "openrouter",
    scopeMode = "currentPage",
    pendingPrompt = "",
    settings = false,
    busy = false,
    status = "",
    preview = false;
  if (!PROVIDERS[providerId]) providerId = "openrouter";
  let config = {},
    models = [];
  const current = () => PROVIDERS[providerId];
  const load = () => {
    config = read(prefix + providerId) || {};
    models =
      read(
        prefix +
          providerId +
          ":models:" +
          (current().base || config.base || ""),
      )?.models || [];
    if (!models.length)
      models = (FALLBACK_MODELS[providerId] || []).map((id) => ({
        id,
        name: id,
        fallback: true,
      }));
    if (config.model && !models.some((m) => m.id === config.model))
      models.unshift({ id: config.model, name: config.model });
  };
  load();
  const q = (s) => dialog.querySelector(s),
    key = () => vault.get(providerId) || config.key || "";
  const save = () => {
    const entered = q("[data-key]")?.value.trim();
    if (entered) vault.set(providerId, entered);
    const base =
      q("[data-base]")?.value.trim() || current().base || config.base || "";
    endpoint(current(), base);
    config = {
      base,
      model: q("[data-model]")?.value || config.model || models[0]?.id || "",
      ...(q("[data-remember]")?.checked ? { key: key() } : {}),
    };
    localStorage.setItem(prefix + providerId, JSON.stringify(config));
    localStorage.setItem("binksy-ai-selected", JSON.stringify(providerId));
  };
  const refresh = async () => {
    try {
      save();
      busy = true;
      status = t("Chargement des modèles…");
      draw();
      models = await listModels(current(), key(), config.base);
      if (!models.length) throw Error("Aucun modèle disponible.");
      localStorage.setItem(
        prefix + providerId + ":models:" + (current().base || config.base),
        JSON.stringify({ at: Date.now(), models }),
      );
      if (!models.some((m) => m.id === config.model))
        config.model = models[0].id;
      localStorage.setItem(prefix + providerId, JSON.stringify(config));
      status = t("Catalogue actualisé.");
    } catch (e) {
      status = t(e.message);
    } finally {
      busy = false;
      draw();
    }
  };
  const test = async () => {
    try {
      save();
      if (!key()) throw Error("Ajoutez une clé API.");
      busy = true;
      status = t("Test du chat et des outils…");
      draw();
      const result = await chatCompletion(
        current(),
        key(),
        config.base,
        config.model,
        'Call propose_changes with message "Connection test" and an empty actions array. This is a test; do not change any project.',
        [{ role: "user", content: "Test connection and call the tool." }],
        proposalTool,
      );
      if (!result.call)
        throw Error("Le modèle n’a pas utilisé l’outil demandé.");
      proposalProject(live().p, result.proposal);
      await acknowledgeTool(result, "validated_test_only");
      status = t("Connexion vérifiée : réponse et appel d’outil reçus.");
    } catch (e) {
      status = t(e.message);
    } finally {
      busy = false;
      draw();
    }
  };
  const send = async () => {
    const prompt = (pendingPrompt || q("[data-prompt]")?.value || (recommendation ? "Recommandation de l’IA" : "")).trim();
    pendingPrompt = "";
    if (!prompt || busy) return;
    if(!recommendation && live().stage !== "guideline") {dialog.close();return;}
    if (!key()) {
      pendingPrompt = prompt;
      settings = true;
      status = t("Ajoutez une clé API.");
      draw();
      return;
    }
    const model = config.model || models[0]?.id;
    if (!model) {
      pendingPrompt = prompt;
      settings = true;
      status = t("Choisissez un modèle.");
      draw();
      return;
    }
    session.messages.push({ role: "user", content: prompt.slice(0, 6000) });
    busy = true;
    status = "";
    preview = false;
    draw();
    try {
      const currentState = live(),
        requestScope = {scope:scopeMode,...(scopeMode === "currentPage" ? {pageId:activeGuideContext().pageId} : {})},
        ctx = projectContext(
          currentState.p,
          currentState.stage,
          {...activeGuideContext(), ...requestScope},
        );
      if (requestScope.scope === "currentPage") ctx.pages = ctx.pages.filter(a=>a.id===requestScope.pageId);
      if(recommendation) ctx.pages = [];
      const messages = session.messages
        .slice(0, -1)
        .slice(-17)
        .map(({ role, content }) => ({ role, content }));
      const textContext = JSON.stringify({context:ctx,pendingProposal:session.active,request:prompt});
      const selectedModel = models.find(m=>m.id===model);
      const page = currentState.p.brandGuideline.pages.find(a=>a.id===activeGuideContext().pageId);
      const needsVisual = recommendation || /visuel|design|mise en page|layout|image|logo|couleur|color|fond|background/i.test(prompt);
      if(needsVisual && selectedModel?.vision === false) throw Error("Le modèle sélectionné ne prend pas en charge les images.");
      const content = recommendation
        ? await recommendationMessage({...currentState.p,active:recommendationVariant},recommendation)
        : needsVisual && page ? await visualMessage(textContext,guidelineSVG(currentState.p,page)) : textContext;
      messages.push({role:"user",content});
      const supportsTools = models.find((m) => m.id === model)?.tools !== false;
      const response = await chatCompletion(
        current(),
        key(),
        config.base,
        model,
        (recommendation ? recommendationInstructions : scopedAgentInstructions) + " Reply in " + language(),
        messages,
        supportsTools ? proposalTool : null,
      );
      let proposal = response.proposal;
      if (!proposal) {
        try {
          proposal = JSON.parse(
            response.text.replace(/^```(?:json)?\s*|\s*```$/g, ""),
          );
        } catch {
          proposal = { message: response.text, actions: [] };
        }
      }
      if(recommendation) recommendationProject(currentState.p,proposal,recommendation,recommendationVariant);
      else proposalProject(currentState.p, proposal, requestScope);
      if (response.call) {
        const final = await acknowledgeTool(response, "validated_pending_user_approval").catch(()=>{status=t("Proposition reçue ; confirmation fournisseur indisponible.");});
        if (!proposal.message?.trim() && final?.text?.trim()) proposal.message=final.text;
      }
      if (!proposal.message?.trim()) proposal.message = t(proposal.actions?.length ? "Proposition prête à appliquer." : "Aucune modification proposée.");
      session.propose(currentState.p, proposal, requestScope);
      session.messages.push({ role: "assistant", content: proposal.message });
    } catch (e) {
      status = t(e.message);
      session.messages.push({role:"assistant",content:status});
    } finally {
      busy = false;
      draw();
    }
  };
  const draw = () => {
    const selected = config.model || models[0]?.id || "",
      state = live();
    let content;
    if (settings)
      content = `<div class="ai-settings"><button data-back>← ${t("Retour au chat")}</button><label>${t("Fournisseur")}<select data-provider ${busy ? "disabled" : ""}>${Object.values(
        PROVIDERS,
      )
        .map(
          (p) =>
            `<option value="${p.id}" ${p.id === providerId ? "selected" : ""}>${esc(p.name)}</option>`,
        )
        .join(
          "",
        )}</select></label><label>${t("Clé API")}<input data-key type="password" autocomplete="off" placeholder="${key() ? "••••••••" : ""}"></label><label class="ai-remember"><input data-remember type="checkbox" ${config.key ? "checked" : ""}>${t("Mémoriser sur cet appareil")}</label><label>${t("Modèle")}<input data-search type="search" placeholder="${t("Rechercher un modèle")}"><select data-model ${busy ? "disabled" : ""}>${models.map((m) => `<option value="${esc(m.id)}" ${m.id === selected ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label><button data-refresh ${busy ? "disabled" : ""}>${t("Actualiser les modèles")}</button><details><summary>${t("Avancé")}</summary>${current().id === "custom" ? `<label>${t("Adresse API")}<input data-base value="${esc(config.base || "")}"></label>` : ""}<label>${t("ID modèle personnalisé")}<input data-custom-model></label><button data-custom-add>${t("Utiliser ce modèle")}</button><button data-forget>${t("Supprimer la clé")}</button></details><div class="ai-settings-actions"><button data-save>${t("Enregistrer")}</button><button data-test ${busy ? "disabled" : ""}>${t("Tester la connexion")}</button></div></div>`;
    else
      content = `<div class="ai-messages" aria-live="polite">${session.messages.length ? session.messages.map((m) => `<article class="ai-message ai-${m.role}"><span>${t(m.role === "user" ? "Vous" : "Assistant IA")}</span><p>${esc(m.content)}</p></article>`).join("") : `<div class="ai-empty"><span aria-hidden="true">✦</span><h3>${t("Que souhaitez-vous ajuster ?")}</h3><p>${t("Décrivez une modification. Vous pourrez l’affiner avant de l’appliquer.")}</p>${!key() ? `<button data-configure>${t("Configurer l’assistant")}</button>` : ""}</div>`}${session.active?.actions.length ? `<section class="ai-proposal"><span>${t("Proposition")} · ${session.revision}</span><ul>${session.active.actions.map((a) => `<li>${esc(actionSummary(a, state.p))}</li>`).join("")}</ul>${preview ? renderPreview(state.p, session.active, session.scope) : ""}<div><button class="primary" data-apply ${busy ? "disabled" : ""}>${t("Appliquer")}</button>${state.stage === "guideline" ? `<button data-preview>${t(preview ? "Masquer l’aperçu" : "Aperçu")}</button>` : ""}</div></section>` : ""}${busy ? `<p>${t("Préparation de la proposition…")}</p>` : ""}</div><form class="ai-composer"><label class="ai-scope">${t("Portée")}<select data-scope><option value="currentPage" ${scopeMode === "currentPage" ? "selected" : ""}>${t("Page actuelle")}</option><option value="document" ${scopeMode === "document" ? "selected" : ""}>${t("Tout le document")}</option></select></label><textarea data-prompt aria-label="${t("Votre demande")}" placeholder="${t("Votre demande")}" rows="2" maxlength="6000"></textarea><button type="submit" aria-label="${t("Envoyer")}" ${busy ? "disabled" : ""}>↑</button></form>`;
    dialog.innerHTML = `<header><strong>✦ ${t("Assistant IA")}</strong><div><button data-settings aria-label="${t("Réglages IA")}">⚙</button><button data-close aria-label="${t("Fermer")}">×</button></div></header>${content}<output role="status">${esc(status)}</output>`;
    if(recommendation && !settings) {
      q('.ai-composer')?.remove();
      q('.ai-empty')?.remove();
      const area=q('.ai-messages');
      area?.querySelectorAll('.ai-user').forEach(el=>el.remove());
      const retry=document.createElement('button');retry.textContent=t('Régénérer');retry.disabled=busy;retry.onclick=send;area?.append(retry);
    }
    q("[data-close]").onclick = () => dialog.close();
    q("[data-settings]").onclick = () => {
      settings = !settings;
      draw();
    };
    q("[data-back]")?.addEventListener("click", () => {
      try {
        save();
        settings = false;
        draw();
      } catch (e) {
        status = t(e.message);
        draw();
      }
    });
    q("[data-configure]")?.addEventListener("click", () => {
      settings = true;
      draw();
    });
    q("[data-provider]")?.addEventListener("change", (e) => {
      providerId = e.target.value;
      load();
      status = "";
      draw();
    });
    q("[data-base]")?.addEventListener("change", () => {
      vault.delete(providerId);
      delete config.key;
      q("[data-key]").value = "";
      q("[data-key]").placeholder = "";
    });
    q("[data-model]")?.addEventListener("change", () => {
      try {
        save();
      } catch (e) {
        status = t(e.message);
        draw();
      }
    });
    q("[data-search]")?.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      q("[data-model]")
        .querySelectorAll("option")
        .forEach(
          (o) => (o.hidden = !o.textContent.toLowerCase().includes(query)),
        );
    });
    q("[data-refresh]")?.addEventListener("click", refresh);
    q("[data-test]")?.addEventListener("click", test);
    q("[data-save]")?.addEventListener("click", () => {
      try {
        save();
        status = t("Configuration enregistrée.");
        settings = false;
        draw();
        if(pendingPrompt) send();
      } catch (e) {
        status = t(e.message);
        draw();
      }
    });
    q("[data-forget]")?.addEventListener("click", () => {
      vault.delete(providerId);
      delete config.key;
      localStorage.setItem(prefix + providerId, JSON.stringify(config));
      draw();
    });
    q("[data-custom-add]")?.addEventListener("click", () => {
      const id = q("[data-custom-model]").value.trim().slice(0, 200);
      if (id) {
        save();
        models.unshift({ id, name: id });
        config.model = id;
        localStorage.setItem(prefix + providerId, JSON.stringify(config));
        draw();
      }
    });
    q("[data-scope]")?.addEventListener("change",e=>{scopeMode=e.target.value;});
    q(".ai-composer")?.addEventListener("submit", (e) => {
      e.preventDefault();
      send();
    });
    q("[data-prompt]")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    q("[data-apply]")?.addEventListener("click", () => {
      try {
        session.apply(live().p, edit);
        session.messages.push({
          role: "assistant",
          content: t(
            "Proposition appliquée. Vous pouvez l’annuler avec Cmd/Ctrl+Z.",
          ),
        });
        status = "";
        draw();
      } catch (e) {
        status = t(e.message);
        draw();
      }
    });
    q("[data-preview]")?.addEventListener("click", () => {
      preview = !preview;
      draw();
    });
    const list = q(".ai-messages");
    if (list) list.scrollTop = list.scrollHeight;
  };
  draw();
  dialog.addEventListener(
    "close",
    () => {
      dialog.remove();
      activeDialog = null;
    },
    { once: true },
  );
  dialog.show();
  if(recommendation) send();
}
function renderPreview(p, proposal, scope) {
  try {
    const temp = proposalProject(p, proposal, scope),
      id = scope?.pageId || activeGuideContext().pageId,
      page = temp.brandGuideline.pages.find((a) => a.id === id);
    return page
      ? `<div class="ai-preview">${guidelineSVG(temp, page, temp.brandGuideline.pages.indexOf(page))}</div>`
      : "";
  } catch {
    return "";
  }
}
