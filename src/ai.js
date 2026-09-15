import { visualMessage, recommendationMessage, recommendationInstructions, recommendationProject } from "./ai-recommendations.js";
import {
  PROVIDERS,
  endpoint,
  listModels,
  compatibleModels,
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
  prefix = "binksy-ai-provider:",
  modelCacheTtl = 6 * 60 * 60 * 1000;
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
  const sessionKey = project.id + (recommendation ? ":" + recommendation + ":" + recommendationVariant : "");
  if (activeDialog?.isConnected) {
    if (activeDialog.dataset.context === sessionKey) {
      activeDialog.querySelector("[data-prompt]")?.focus();
      return;
    }
    activeDialog.close();
  }
  const session = sessions.get(sessionKey) || new ProposalSession();
  sessions.set(sessionKey, session);
  if (recommendation) {
    session.propose = (p,proposal) => { recommendationProject(p,proposal,recommendation,recommendationVariant);if(proposal.actions.length){session.active=structuredClone(proposal);session.base=JSON.stringify(p);session.revision++;} };
    session.apply = (p,edit) => { if(session.base !== JSON.stringify(p)) throw Error("Le projet a changé. Demandez une proposition actualisée.");const next=recommendationProject(p,session.active,recommendation,recommendationVariant);edit(()=>{Object.assign(p,next);});session.active=null; };
  }
  const dialog = document.createElement("dialog");
  dialog.className = "ai-chat";
  dialog.dataset.context = sessionKey;
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
    preview = false,
    modelSearch = "",
    priceFilter = "all",
    catalogState = "no-key",
    catalogAt = 0,
    catalogStale = false,
    catalogError = "",
    catalogLoading = false,
    catalogRevision = 0;
  if (!PROVIDERS[providerId]) providerId = "openrouter";
  let config = {},
    models = [];
  const current = () => PROVIDERS[providerId];
  const q = (s) => dialog.querySelector(s),
    key = () => vault.get(providerId) || config.key || "";
  const modelCacheKey = () =>
    prefix + providerId + ":models:" + (current().base || config.base || "");
  const readModelCache = () => {
    const cached = read(modelCacheKey());
    return {
      at: Number(cached?.at) || 0,
      models: compatibleModels(
        Array.isArray(cached?.models) ? cached.models : [],
      ),
    };
  };
  const storedCustomModels = () =>
    (Array.isArray(config.customModels) ? config.customModels : [])
      .map((id) => String(id || "").trim().slice(0, 200))
      .filter(Boolean)
      .map((id) => ({
        id,
        name: id,
        vision: true,
        tools: true,
        priceTier: "unknown",
        custom: true,
      }));
  const mergeModels = (entries) => {
    const custom = storedCustomModels(),
      customIds = new Set(custom.map((model) => model.id));
    return [
      ...custom,
      ...entries.filter((model) => !customIds.has(model.id)),
    ];
  };
  const cacheIsFresh = (at) =>
    Boolean(at) && Date.now() - at < modelCacheTtl;
  const load = ({ refreshIfNeeded = true } = {}) => {
    catalogRevision += 1;
    config = read(prefix + providerId) || {};
    catalogError = "";
    catalogLoading = false;
    const hasKey = Boolean(key());
    const cached = hasKey ? readModelCache() : { at: 0, models: [] };
    models = mergeModels(cached.models);
    catalogAt = cached.at;
    catalogStale = Boolean(models.length && !cacheIsFresh(catalogAt));
    if (!hasKey) {
      models = [];
      catalogAt = 0;
      catalogStale = false;
      catalogState = "no-key";
      return;
    }
    catalogState = models.length ? "ready" : "loading";
    if (models.length && !models.some((m) => m.id === config.model))
      config.model = models[0].id;
    const needsRefresh = !models.length || !cacheIsFresh(catalogAt);
    if (refreshIfNeeded && needsRefresh) {
      const revision = catalogRevision;
      queueMicrotask(() => {
        if (revision === catalogRevision) refresh({ silent: true });
      });
    }
  };
  const save = () => {
    const entered = q("[data-key]")?.value.trim();
    if (entered) vault.set(providerId, entered);
    const base =
      q("[data-base]")?.value.trim() || current().base || config.base || "";
    endpoint(current(), base);
    const selectedModel =
      q("[data-model]:checked")?.value || q("[data-chat-model]")?.value || "";
    config = {
      base,
      model: selectedModel || config.model || models[0]?.id || "",
      ...(Array.isArray(config.customModels) && config.customModels.length
        ? { customModels: config.customModels }
        : {}),
      ...(q("[data-remember]")?.checked ? { key: key() } : {}),
    };
    localStorage.setItem(prefix + providerId, JSON.stringify(config));
    localStorage.setItem("binksy-ai-selected", JSON.stringify(providerId));
  };
  const refreshes = new Map();
  const refresh = ({ silent = false } = {}) => {
    const requestedProvider = providerId,
      requestedCacheKey = modelCacheKey(),
      existing = refreshes.get(requestedCacheKey);
    if (existing) return existing;
    const revision = ++catalogRevision,
      provider = current(),
      promise = (async () => {
        const apiKey = key();
        if (!apiKey) {
          if (revision === catalogRevision && providerId === requestedProvider) {
            models = [];
            catalogAt = 0;
            catalogStale = false;
            catalogState = "no-key";
            catalogError = "";
            catalogLoading = false;
            draw();
          }
          return;
        }
        if (revision === catalogRevision && providerId === requestedProvider) {
          catalogLoading = true;
          if (!models.length) catalogState = "loading";
          catalogError = "";
          if (!silent) status = t("Chargement des modèles…");
          draw();
        }
        try {
          const next = await listModels(provider, apiKey, config.base);
          if (revision !== catalogRevision || providerId !== requestedProvider)
            return;
          if (!next.length) throw Error("Aucun modèle disponible.");
          models = mergeModels(compatibleModels(next));
          catalogAt = Date.now();
          catalogStale = false;
          catalogState = "ready";
          catalogError = "";
          if (!models.some((m) => m.id === config.model))
            config.model = models[0].id;
          localStorage.setItem(
            requestedCacheKey,
            JSON.stringify({ at: catalogAt, models }),
          );
          localStorage.setItem(prefix + providerId, JSON.stringify(config));
          if (!silent) status = t("Catalogue actualisé.");
        } catch (error) {
          if (revision !== catalogRevision || providerId !== requestedProvider)
            return;
          catalogState = "error";
          catalogError = error.message || "Fournisseur indisponible.";
          if (!silent) status = t(catalogError);
        } finally {
          if (revision === catalogRevision && providerId === requestedProvider) {
            catalogLoading = false;
            draw();
          }
        }
      })();
    refreshes.set(requestedCacheKey, promise);
    const clearRefresh = () => {
      if (refreshes.get(requestedCacheKey) === promise)
        refreshes.delete(requestedCacheKey);
    };
    promise.then(clearRefresh, clearRefresh);
    return promise;
  };
  load();
  const test = async () => {
    try {
      save();
      if (!key()) throw Error("Ajoutez une clé API.");
      if (!models.some((model) => model.id === config.model))
        throw Error("Choisissez un modèle.");
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
    const model = models.find((entry) => entry.id === config.model)?.id;
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
        ? await recommendationMessage({...currentState.p,active:recommendationVariant},recommendation, prompt, session.active)
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
    const state = live(),
      priceLabels = {
        free: "GRATUITS",
        low: "PEU CHER",
        medium: "MOYENNEMENT CHER",
        high: "CHER",
      },
      hasKey = Boolean(key()),
      selected = models.some((m) => m.id === config.model)
        ? config.model
        : "",
      visibleModels = models.filter(
        (m) =>
          (priceFilter === "all" || m.priceTier === priceFilter) &&
          (!modelSearch ||
            (m.name + " " + m.id).toLowerCase().includes(modelSearch)),
      );
    const catalogAge = catalogAt
      ? (() => {
          const hours = Math.floor((Date.now() - catalogAt) / 3600000);
          return hours < 1
            ? t("Mis à jour à l’instant")
            : t("Mis à jour il y a {hours} h", { hours });
        })()
      : "";
    const modelRows = visibleModels
      .map(
        (m) =>
          "<label class='ai-model-option'><input data-model type='radio' name='ai-model' value='" +
          esc(m.id) +
          "'" +
          (m.id === selected ? " checked" : "") +
          "><span><strong>" +
          esc(m.name) +
          "</strong><small>" +
          esc(m.id) +
          "</small></span><em>" +
          t(priceLabels[m.priceTier] || "TARIF NON COMMUNIQUÉ") +
          "</em></label>",
      )
      .join("");
    let modelContent;
    if (!hasKey) {
      modelContent =
        "<div class='ai-model-state' data-model-state='no-key'>" +
        t("Ajoutez votre clé API pour charger les modèles disponibles.") +
        "</div>";
    } else if (!models.length && catalogLoading) {
      modelContent =
        "<div class='ai-model-state' data-model-state='loading'>" +
        t("Chargement des modèles…") +
        "</div>";
    } else if (!models.length && catalogError) {
      const errorLabel = /cors|réseau|connexion impossible/i.test(catalogError)
        ? t("Le fournisseur ne permet pas de charger son catalogue depuis le navigateur.")
        : t("Impossible de récupérer les modèles. Vérifiez votre clé API.");
      modelContent =
        "<div class='ai-model-state is-error' data-model-state='error'><strong>" +
        errorLabel +
        "</strong><span>" +
        esc(t(catalogError)) +
        "</span></div>";
    } else if (!models.length) {
      modelContent =
        "<div class='ai-model-state' data-model-state='empty'>" +
        t("Aucun modèle compatible disponible.") +
        "</div>";
    } else {
      const staleStatus = catalogLoading
        ? "<span class='ai-catalog-refreshing'>" +
          t("Actualisation en cours…") +
          "</span>"
        : catalogError
          ? "<span class='ai-catalog-error'>" +
            esc(t(catalogError)) +
            "</span>"
          : "";
      modelContent =
        "<div class='ai-model-tools'><input data-search type='search' value='" +
        esc(modelSearch) +
        "' placeholder='" +
        esc(t("Rechercher un modèle…")) +
        "' aria-label='" +
        esc(t("Rechercher un modèle")) +
        "'><div class='ai-price-filters' role='group' aria-label='" +
        esc(t("Filtrer par prix")) +
        "'>" +
        [["all", "TOUS"], ...Object.entries(priceLabels)]
          .map(
            ([id, label]) =>
              "<button type='button' data-price-filter='" +
              id +
              "' aria-pressed='" +
              (priceFilter === id) +
              "'>" +
              t(label) +
              "</button>",
          )
          .join("") +
        "</div></div><p class='ai-model-count' role='status'><strong>" +
        models.length +
        " " +
        t("modèles disponibles") +
        "</strong>" +
        (catalogAge ? "<span> · " + catalogAge + "</span>" : "") +
        staleStatus +
        "</p><div class='ai-model-list'>" +
        (modelRows ||
          "<div class='ai-model-empty'><strong>" +
            t("Aucun modèle compatible trouvé") +
            "</strong><span>" +
            t("Essayez un autre terme ou filtre, puis actualisez le catalogue.") +
            "</span></div>") +
        "</div>";
    }
    const refreshButton = hasKey
      ? "<button type='button' class='ai-refresh' data-refresh" +
        (catalogLoading ? " disabled" : "") +
        ">" +
        t("Actualiser") +
        "</button>"
      : "";
    const providerOptions = Object.values(PROVIDERS)
      .map(
        (p) =>
          "<option value='" +
          p.id +
          "'" +
          (p.id === providerId ? " selected" : "") +
          ">" +
          esc(p.name) +
          "</option>",
      )
      .join("");
    let content;
    if (settings) {
      const providerLink = current().link
        ? "<a class='ai-provider-link' href='" +
          esc(current().link) +
          "' target='_blank' rel='noopener noreferrer'>" +
          t("Obtenir une clé API") +
          " ↗</a>"
        : "";
      content =
        "<div class='ai-settings'><button type='button' class='ai-back' data-back>← " +
        t("Retour au chat") +
        "</button><section class='ai-settings-section' aria-labelledby='ai-provider-title'><h3 id='ai-provider-title'>" +
        t("Fournisseur IA") +
        "</h3><label class='ai-field'><span>" +
        t("Fournisseur") +
        "</span><select data-provider " +
        (busy ? "disabled" : "") +
        ">" +
        providerOptions +
        "</select></label>" +
        providerLink +
        "</section><section class='ai-settings-section' aria-labelledby='ai-key-title'><h3 id='ai-key-title'>" +
        t("Clé API") +
        "</h3><label class='ai-field'><span>" +
        t("Clé API") +
        "</span><input data-key type='password' autocomplete='new-password' placeholder='" +
        (hasKey ? "••••••••" : "") +
        "' aria-describedby='ai-key-note'></label><label class='ai-remember'><input data-remember type='checkbox' " +
        (config.key ? "checked" : "") +
        "><span>" +
        t("Mémoriser sur cet appareil") +
        "</span></label><p class='ai-key-note' id='ai-key-note'>" +
        t(
          "La clé reste sur cet appareil et n’est jamais enregistrée dans le projet " +
            String.fromCharCode(96) +
            ".binksy" +
            String.fromCharCode(96) +
            ".",
        ) +
        "</p></section><section class='ai-settings-section ai-model-picker' aria-labelledby='ai-model-title'><div class='ai-section-heading'><h3 id='ai-model-title'>" +
        t("Modèle") +
        "</h3>" +
        (hasKey && models.length
          ? "<span>" + t("Images et outils requis") + "</span>"
          : "") +
        "</div>" +
        modelContent +
        refreshButton +
        "</section><section class='ai-settings-section ai-connection' aria-labelledby='ai-connection-title'><h3 id='ai-connection-title'>" +
        t("Vérifier la configuration") +
        "</h3><button type='button' class='ai-secondary' data-test" +
        (busy || !hasKey || !selected ? " disabled" : "") +
        ">" +
        t("Tester la connexion") +
        "</button><output class='ai-inline-status' role='status'>" +
        esc(status) +
        "</output></section><div class='ai-settings-actions'><button type='button' class='primary' data-save>" +
        t("Enregistrer") +
        "</button></div><details class='ai-advanced'><summary>" +
        t("Avancé") +
        "</summary>" +
        (current().id === "custom"
          ? "<label class='ai-field'><span>" +
            t("Adresse API") +
            "</span><input data-base value='" +
            esc(config.base || "") +
            "'></label>"
          : "") +
        "<label class='ai-field'><span>" +
        t("ID modèle personnalisé") +
        "</span><input data-custom-model></label><p>" +
        t("Un ID personnalisé n’est pas vérifié par le catalogue.") +
        "</p><button type='button' class='ai-secondary' data-custom-add>" +
        t("Utiliser ce modèle") +
        "</button><button type='button' class='ai-danger' data-forget>" +
        t("Supprimer la clé") +
        "</button></details></div>";
    } else {
      const chatOptions = models
        .map(
          (m) =>
            "<option value='" +
            esc(m.id) +
            "'" +
            (m.id === selected ? " selected" : "") +
            ">" +
            esc(m.name) +
            "</option>",
        )
        .join("");
      content =
        "<div class='ai-messages' aria-live='polite'>" +
        (session.messages.length
          ? session.messages
              .map(
                (m) =>
                  "<article class='ai-message ai-" +
                  m.role +
                  "'><span>" +
                  t(m.role === "user" ? "Vous" : "Assistant IA") +
                  "</span><p>" +
                  esc(m.content) +
                  "</p></article>",
              )
              .join("")
          : "<div class='ai-empty'><span aria-hidden='true'>✦</span><h3>" +
            t("Que souhaitez-vous ajuster ?") +
            "</h3><p>" +
            t(
              "Décrivez une modification. Vous pourrez l’affiner avant de l’appliquer.",
            ) +
            "</p>" +
            (!key()
              ? "<button type='button' data-configure>" +
                t("Configurer l’assistant") +
                "</button>"
              : "") +
            "</div>") +
        (session.active?.actions.length
          ? "<section class='ai-proposal'><span>" +
            t("Proposition") +
            " · " +
            session.revision +
            "</span><ul>" +
            session.active.actions
              .map((a) => "<li>" + esc(actionSummary(a, state.p)) + "</li>")
              .join("") +
            "</ul>" +
            (preview ? renderPreview(state.p, session.active, session.scope) : "") +
            "<div><button class='primary' data-apply" +
            (busy ? " disabled" : "") +
            ">" +
            t("Appliquer") +
            "</button>" +
            (state.stage === "guideline"
              ? "<button type='button' data-preview>" +
                t(preview ? "Masquer l’aperçu" : "Aperçu") +
                "</button>"
              : "") +
            "</div></section>"
          : "") +
        (busy
          ? "<p>" + t("Préparation de la proposition…") + "</p>"
          : "") +
        "</div><form class='ai-composer'><label class='ai-chat-model'><span>" +
        t("Modèle actif") +
        "</span><select data-chat-model" +
        (busy || !models.length ? " disabled" : "") +
        ">" +
        (chatOptions ||
          "<option value=''>" +
            t("Configuration nécessaire") +
            "</option>") +
        "</select></label><label class='ai-scope'><span>" +
        t("Portée") +
        "</span><select data-scope><option value='currentPage' " +
        (scopeMode === "currentPage" ? "selected" : "") +
        ">" +
        t("Page actuelle") +
        "</option><option value='document' " +
        (scopeMode === "document" ? "selected" : "") +
        ">" +
        t("Tout le document") +
        "</option></select></label><textarea data-prompt aria-label='" +
        esc(t("Votre demande")) +
        "' placeholder='" +
        esc(t("Votre demande")) +
        "' rows='2' maxlength='6000'></textarea><button class='ai-action' type='submit' aria-label='" +
        esc(t("Envoyer")) +
        "'" +
        (busy ? " disabled" : "") +
        ">↑</button></form>";
    }
    dialog.innerHTML =
      "<header><strong>✦ " +
      t("Assistant IA") +
      "</strong><div><button type='button' data-settings aria-label='" +
      esc(t("Réglages IA")) +
      "'>⚙</button><button type='button' data-close aria-label='" +
      esc(t("Fermer")) +
      "'>×</button></div></header>" +
      content +
      "<output class='ai-status' role='status'>" +
      (settings ? "" : esc(status)) +
      "</output>";
    if (recommendation && !settings) q(".ai-scope")?.remove();
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
      modelSearch = "";
      priceFilter = "all";
      load();
      status = "";
      draw();
    });
    q("[data-base]")?.addEventListener("change", (e) => {
      vault.delete(providerId);
      delete config.key;
      config.base = e.target.value.trim();
      models = [];
      catalogAt = 0;
      catalogStale = false;
      catalogError = "";
      catalogState = "no-key";
      catalogLoading = false;
      catalogRevision += 1;
      q("[data-key]").value = "";
      q("[data-key]").placeholder = "";
      draw();
    });
    const commitKey = () => {
      try {
        save();
        load();
        draw();
      } catch (e) {
        status = t(e.message);
        draw();
      }
    };
    q("[data-key]")?.addEventListener("blur", commitKey);
    q("[data-key]")?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      commitKey();
    });
    dialog
      .querySelectorAll("[data-model]")
      .forEach((el) =>
        el.addEventListener("change", () => {
          if (!el.checked) return;
          try {
            save();
          } catch (e) {
            status = t(e.message);
            draw();
          }
        }),
      );
    q("[data-search]")?.addEventListener("input", (e) => {
      modelSearch = e.target.value.trim().toLowerCase();
      draw();
      const search = q("[data-search]");
      search?.focus();
      search?.setSelectionRange(search.value.length, search.value.length);
    });
    q("[data-chat-model]")?.addEventListener("change", (e) => {
      config.model = e.target.value;
      localStorage.setItem(prefix + providerId, JSON.stringify(config));
    });
    dialog
      .querySelectorAll("[data-price-filter]")
      .forEach(
        (el) =>
          (el.onclick = () => {
            priceFilter = el.dataset.priceFilter;
            draw();
          }),
      );
    q("[data-refresh]")?.addEventListener("click", () => {
      try {
        save();
        refresh({ silent: false });
      } catch (e) {
        status = t(e.message);
        draw();
      }
    });
    q("[data-test]")?.addEventListener("click", test);
    q("[data-save]")?.addEventListener("click", () => {
      try {
        save();
        load();
        status = t("Configuration enregistrée.");
        settings = false;
        draw();
        if (pendingPrompt) send();
      } catch (e) {
        status = t(e.message);
        draw();
      }
    });
    q("[data-forget]")?.addEventListener("click", () => {
      if (
        typeof window.confirm === "function" &&
        !window.confirm(t("Supprimer la clé de cet appareil ?"))
      )
        return;
      vault.delete(providerId);
      delete config.key;
      localStorage.setItem(prefix + providerId, JSON.stringify(config));
      load({ refreshIfNeeded: false });
      draw();
    });
    q("[data-custom-add]")?.addEventListener("click", () => {
      const id = q("[data-custom-model]").value.trim().slice(0, 200);
      if (!id) return;
      if (!key()) {
        status = t("Ajoutez une clé API.");
        draw();
        return;
      }
      try {
        save();
        config.customModels = [
          ...new Set([...(config.customModels || []), id]),
        ].slice(0, 50);
        models = mergeModels(models);
        config.model = id;
        catalogState = "ready";
        localStorage.setItem(prefix + providerId, JSON.stringify(config));
        draw();
      } catch (e) {
        status = t(e.message);
        draw();
      }
    });
    q("[data-scope]")?.addEventListener("change", (e) => {
      scopeMode = e.target.value;
    });
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
      if (activeDialog === dialog) activeDialog = null;
    },
    { once: true },
  );
  dialog.show();
  if(recommendation && !session.messages.length) send();
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
