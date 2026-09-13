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
    ["opencode-go", "OpenCode Go", "https://opencode.ai/zen/go/v1", "openai", "https://opencode.ai/auth"],
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
          402: "Crédit insuffisant chez le fournisseur.",
          400: "Requête refusée : vérifiez le modèle et sa prise en charge des outils.",
          403: "Accès refusé par le fournisseur.",
          404: "Modèle ou catalogue indisponible.",
          429: "Quota dépassé. Réessayez plus tard.",
          503: "Modèle temporairement indisponible.",
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
          vision: Array.isArray(m.architecture?.input_modalities) ? m.architecture.input_modalities.includes("image") : undefined,
          tools: Array.isArray(m.supported_parameters) ? m.supported_parameters.includes('tools') : undefined,
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

// Maintained fallbacks are secondary to each provider's live catalogue.
export const FALLBACK_MODELS = {
  openai: ['gpt-4.1-mini','gpt-4.1'], anthropic: ['claude-sonnet-4-5','claude-haiku-4-5'],
  gemini:['gemini-2.5-flash','gemini-2.5-pro'], openrouter:['openrouter/auto'],
  nvidia:['meta/llama-3.3-70b-instruct'], opencode:['kimi-k2.5'], 'opencode-go':['glm-5.1','kimi-k2.6'],
  mistral:['mistral-small-latest','mistral-large-latest'], groq:['llama-3.3-70b-versatile'], deepseek:['deepseek-chat','deepseek-reasoner'],
  xai:['grok-4'], together:['meta-llama/Llama-3.3-70B-Instruct-Turbo'], fireworks:['accounts/fireworks/models/llama-v3p3-70b-instruct'],
  cerebras:['llama-3.3-70b'], perplexity:['sonar','sonar-pro'], qwen:['qwen-plus','qwen-max'], moonshot:['kimi-k2.5'], custom:[],
};
export function modelProtocol(provider,model){
  if(provider.id==='opencode-go') {
    if(/^(minimax|qwen)/i.test(model))return {...provider,protocol:'anthropic'};
    if(/^(gpt-|grok-|muse-)/i.test(model))return {...provider,protocol:'responses'};
  }
  return provider;
}
export async function chatCompletion(provider,key,base,model,system,messages,tool,fetcher=fetch){
  const target=modelProtocol(provider,model), protocol=target.protocol;
  const parts = content => typeof content === 'string' ? [{type:'text',text:content}] : content;
  const anthropicContent = content => parts(content).map(c=>c.type==='image_url'?{type:'image',source:{type:'base64',media_type:c.image_url.url.split(';')[0].slice(5),data:c.image_url.url.split(',')[1]}}:c);
  const geminiContent = content => parts(content).map(c=>c.type==='image_url'?{inlineData:{mimeType:c.image_url.url.split(';')[0].slice(5),data:c.image_url.url.split(',')[1]}}:{text:c.text});
  let path,body;
  if(protocol==='anthropic') {
    path='/messages';body={model,max_tokens:5000,system,messages:messages.map(m=>({role:m.role,content:anthropicContent(m.content)})),tools:tool?[{name:tool.name,description:tool.description,input_schema:tool.parameters}]:undefined};
  } else if(protocol==='gemini') {
    path='/models/'+encodeURIComponent(model)+':generateContent';body={systemInstruction:{parts:[{text:system}]},contents:messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:geminiContent(m.content)})),...(tool?{tools:[{functionDeclarations:[tool]}]}:{})};
  } else if(protocol==='responses') {
    path='/responses';body={model,instructions:system,input:messages.map(message => ({...message, content:Array.isArray(message.content) ? message.content.map(part => part.type === 'image_url' ? {type:'input_image',image_url:part.image_url.url} : part.type === 'text' ? {type:message.role === 'assistant' ? 'output_text' : 'input_text',text:part.text} : part) : message.content})),tools:tool?[{type:'function',...tool,strict:false}]:undefined};
  } else {
    path='/chat/completions';body={model,messages:[{role:'system',content:system},...messages],stream:false,...(tool?{tools:[{type:'function',function:tool}],tool_choice:'auto'}:{})};
    if(provider.id==='openrouter'&&tool)body.provider={require_parameters:true};
  }
  const result=await providerRequest(target,key,base,path,body,fetcher);
  if(result.error)throw Error('Erreur fournisseur : aucune réponse exploitable.');
  let call,answer;
  if(protocol==='anthropic'){call=result.content?.find(c=>c.type==='tool_use');answer=result.content?.filter(c=>c.type==='text').map(c=>c.text).join('');if(call)call={name:call.name,input:call.input,raw:call};}
  else if(protocol==='gemini'){const parts=result.candidates?.[0]?.content?.parts||[];call=parts.find(c=>c.functionCall)?.functionCall;answer=parts.map(c=>c.text||'').join('');if(call)call={name:call.name,input:call.args,raw:call};}
  else if(protocol==='responses'){call=result.output?.find(c=>c.type==='function_call');answer=result.output?.flatMap(c=>c.content||[]).map(c=>c.text||'').join('');if(call)call={name:call.name,input:JSON.parse(call.arguments),raw:call};}
  else {const msg=result.choices?.[0]?.message;call=msg?.tool_calls?.[0];answer=msg?.content;if(call)call={name:call.function.name,input:JSON.parse(call.function.arguments),raw:call,message:msg};}
  if(call&&call.name!==tool?.name)throw Error('Outil demandé non autorisé.');
  if(!call && !(typeof answer==='string'&&answer.trim()))throw Error('Réponse vide ou interrompue.');
  return {text:answer||'',proposal:call?.input,call,request:{provider:target,key,base,path,body},protocol};
}
export async function acknowledgeTool(result,status,fetcher=fetch){
  if(!result.call)return;
  const {provider,key,base,path,body}=result.request,call=result.call;
  const payload=JSON.stringify({status,applied:false});
  let next;
  if(result.protocol==='openai')next={...body,messages:[...body.messages,call.message,{role:'tool',tool_call_id:call.raw.id,content:payload}],tool_choice:'none'};
  else if(result.protocol==='anthropic')next={...body,messages:[...body.messages,{role:'assistant',content:[call.raw]},{role:'user',content:[{type:'tool_result',tool_use_id:call.raw.id,content:payload}]}],tool_choice:{type:'none'}};
  else if(result.protocol==='gemini')next={...body,contents:[...body.contents,{role:'model',parts:[{functionCall:call.raw}]},{role:'user',parts:[{functionResponse:{name:call.name,response:{status,applied:false}}}]}]};
  else next={...body,input:[...body.input,call.raw,{type:'function_call_output',call_id:call.raw.call_id,output:payload}]};
  const response=await providerRequest(provider,key,base,path,next,fetcher);
  if(response.error)throw Error('Erreur fournisseur : résultat de l’outil refusé.');
  return response;
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
