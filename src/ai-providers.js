// Shared protocols, distinct origins and keys. No credentials in project data.
export const PROVIDERS = Object.fromEntries(
  [
    [
      "openai",
      "OpenAI",
      "https://api.openai.com/v1",
      "openai",
      "https://platform.openai.com/api-keys",
    ],
    [
      "anthropic",
      "Anthropic / Claude",
      "https://api.anthropic.com/v1",
      "anthropic",
      "https://platform.claude.com/settings/keys",
    ],
    [
      "gemini",
      "Google Gemini",
      "https://generativelanguage.googleapis.com/v1beta",
      "gemini",
      "https://aistudio.google.com/apikey",
    ],
    [
      "openrouter",
      "OpenRouter",
      "https://openrouter.ai/api/v1",
      "openai",
      "https://openrouter.ai/settings/keys",
    ],
    [
      "nvidia",
      "NVIDIA",
      "https://integrate.api.nvidia.com/v1",
      "openai",
      "https://build.nvidia.com",
    ],
    [
      "opencode",
      "OpenCode Zen",
      "https://opencode.ai/zen/v1",
      "openai",
      "https://opencode.ai/auth",
    ],
    [
      "mistral",
      "Mistral",
      "https://api.mistral.ai/v1",
      "openai",
      "https://console.mistral.ai/api-keys",
    ],
    [
      "groq",
      "Groq",
      "https://api.groq.com/openai/v1",
      "openai",
      "https://console.groq.com/keys",
    ],
    [
      "deepseek",
      "DeepSeek",
      "https://api.deepseek.com/v1",
      "openai",
      "https://platform.deepseek.com/api_keys",
    ],
    ["xai", "xAI", "https://api.x.ai/v1", "openai", "https://console.x.ai"],
    [
      "together",
      "Together AI",
      "https://api.together.xyz/v1",
      "openai",
      "https://api.together.xyz/settings/api-keys",
    ],
    [
      "fireworks",
      "Fireworks AI",
      "https://api.fireworks.ai/inference/v1",
      "openai",
      "https://fireworks.ai/account/api-keys",
    ],
    [
      "cerebras",
      "Cerebras",
      "https://api.cerebras.ai/v1",
      "openai",
      "https://cloud.cerebras.ai/platform",
    ],
    [
      "perplexity",
      "Perplexity",
      "https://api.perplexity.ai",
      "openai",
      "https://www.perplexity.ai/settings/api",
    ],
    [
      "qwen",
      "Qwen / DashScope",
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      "openai",
      "https://modelstudio.console.alibabacloud.com",
    ],
    [
      "moonshot",
      "Moonshot / Kimi",
      "https://api.moonshot.ai/v1",
      "openai",
      "https://platform.moonshot.ai/console/api-keys",
    ],
    ["custom", "OpenAI-compatible personnalisé", "", "openai", ""],
  ].map(([id, name, base, protocol, link]) => [
    id,
    { id, name, base, protocol, link },
  ]),
);
export function endpoint(provider, custom = "") {
  const url = new URL(provider.id === "custom" ? custom : provider.base);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
  )
    throw Error("Adresse API invalide.");
  return url.href.replace(/\/$/, "");
}
export async function providerRequest(
  provider,
  key,
  custom,
  path,
  body,
  fetcher = fetch,
) {
  const headers = { "Content-Type": "application/json" };
  if (provider.protocol === "anthropic")
    Object.assign(headers, {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    });
  else if (provider.protocol === "gemini") headers["x-goog-api-key"] = key;
  else headers.Authorization = "Bearer " + key;
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetcher(endpoint(provider, custom) + path, {
      method: body ? "POST" : "GET",
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      redirect: "error",
      credentials: "omit",
    });
    if (!response.ok)
      throw Error(
        {
          401: "Clé API refusée.",
          403: "Accès refusé par le fournisseur.",
          404: "Modèle ou catalogue indisponible.",
          429: "Quota dépassé. Réessayez plus tard.",
        }[response.status] || "Fournisseur indisponible.",
      );
    const text = await response.text();
    if (text.length > 2e6) throw Error("Réponse trop volumineuse.");
    return JSON.parse(text);
  } catch (e) {
    if (e.name === "AbortError")
      throw Error("Le fournisseur a mis trop de temps à répondre.");
    if (e instanceof TypeError)
      throw Error(
        "Connexion impossible : réseau ou CORS. Utilisez une API autorisant le navigateur.",
      );
    if (e instanceof SyntaxError) throw Error("Réponse JSON invalide.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
export async function listModels(provider, key, custom, fetcher) {
  let path = "/models",
    models = [],
    round = 0;
  while (path && round++ < 20) {
    const result = await providerRequest(
      provider,
      key,
      custom,
      path,
      null,
      fetcher,
    );
    models.push(
      ...(result.data || result.models || [])
        .filter(
          (m) =>
            provider.protocol !== "gemini" ||
            m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m) => ({
          id: String(m.id || m.name || "").replace(/^models\//, ""),
          name: String(m.display_name || m.displayName || m.id || m.name),
        })),
    );
    path =
      provider.protocol === "gemini" && result.nextPageToken
        ? "/models?pageToken=" + encodeURIComponent(result.nextPageToken)
        : provider.protocol === "anthropic" && result.has_more && result.last_id
          ? "/models?after_id=" + encodeURIComponent(result.last_id)
          : null;
  }
  return models.filter((m) => m.id).slice(0, 5000);
}
export async function complete(
  provider,
  key,
  custom,
  model,
  system,
  prompt,
  fetcher,
) {
  let body, path;
  if (provider.protocol === "anthropic") {
    path = "/messages";
    body = {
      model,
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: prompt }],
    };
  } else if (provider.protocol === "gemini") {
    path = "/models/" + encodeURIComponent(model) + ":generateContent";
    body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };
  } else {
    path = "/chat/completions";
    body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      stream: false,
    };
  }
  const result = await providerRequest(
    provider,
    key,
    custom,
    path,
    body,
    fetcher,
  );
  const answer =
    provider.protocol === "anthropic"
      ? result.content
          ?.filter((x) => x.type === "text")
          .map((x) => x.text)
          .join("")
      : provider.protocol === "gemini"
        ? result.candidates?.[0]?.content?.parts
            ?.map((x) => x.text || "")
            .join("")
        : result.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim())
    throw Error("Réponse vide ou interrompue.");
  return answer;
}
