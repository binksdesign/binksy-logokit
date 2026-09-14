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
    timer = setTimeout(() => controller.abort(), 120000);
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
          pricing: m.pricing,
          context: Number(m.context_length || m.inputTokenLimit) || undefined,
        })),
    );
    path =
      provider.protocol === "gemini" && result.nextPageToken
        ? "/models?pageToken=" + encodeURIComponent(result.nextPageToken)
        : provider.protocol === "anthropic" && result.has_more && result.last_id
          ? "/models?after_id=" + encodeURIComponent(result.last_id)
          : null;
  }
  return compatibleModels(models.filter((m) => m.id)).slice(0, 5000);
}

// Maintained fallbacks are secondary to each provider's live catalogue.
export const FALLBACK_MODELS = {
  openai: [model('gpt-4.1-mini','low'),model('gpt-4.1','medium')],
  anthropic: [model('claude-haiku-4-5','low'),model('claude-sonnet-4-5','medium')],
  gemini:[model('gemini-2.5-flash','low'),model('gemini-2.5-pro','medium')],
  openrouter:[model('google/gemini-2.5-flash','low'),model('openai/gpt-4.1-mini','low')],
  mistral:[model('pixtral-large-latest','medium')],
  xai:[model('grok-4','high')],
  qwen:[model('qwen-vl-max','medium')],
  moonshot:[model('kimi-k2.5','medium')],
  nvidia:[],opencode:[],'opencode-go':[],groq:[],deepseek:[],together:[],fireworks:[],cerebras:[],perplexity:[],custom:[],
};
function model(id, priceTier) {
  return {id,name:id,vision:true,tools:true,priceTier,fallback:true};
}
const VISION_MODEL = /(gpt-(?:4o|4\.1|5)|claude-(?:3|4)|gemini|pixtral|mistral-(?:medium|large)-.*vision|grok-(?:2-vision|4)|qwen[^/]*(?:vl|omni)|kimi-k2\.5|llama[^/]*(?:vision|vl)|nemotron[^/]*vl)/i;
export function modelPriceTier(entry) {
  if (['free','low','medium','high'].includes(entry?.priceTier)) return entry.priceTier;
  const prompt = Number(entry?.pricing?.prompt), completion = Number(entry?.pricing?.completion);
  if (![prompt, completion].some(Number.isFinite)) return 'unknown';
  const perMillion = Math.max(Number.isFinite(prompt) ? prompt : 0, Number.isFinite(completion) ? completion : 0) * 1e6;
  if (perMillion === 0) return 'free';
  if (perMillion <= 2) return 'low';
  if (perMillion <= 10) return 'medium';
  return 'high';
}
export function compatibleModel(entry) {
  return !!entry?.id && entry.tools !== false && (entry.vision === true || VISION_MODEL.test(entry.id + ' ' + (entry.name || '')));
}
export function compatibleModels(entries) {
  return entries.filter(compatibleModel).map(entry=>({...entry,vision:true,tools:true,priceTier:modelPriceTier(entry)}));
}
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
  let parsed;
  for(let attempt=0;attempt<2;attempt++) {
    const result=await providerRequest(target,key,base,path,body,fetcher);
    try { parsed=parseCompletion(result,protocol,tool); break; }
    catch(error) {
      if(!attempt && ['empty','length'].includes(error.code)) {
        // Regenerate the complete transaction, never splice truncated tool arguments.
        if(error.code==='length') {
          if(protocol==='anthropic')body.max_tokens=10000;
          else if(protocol==='gemini')body.generationConfig={...body.generationConfig,maxOutputTokens:10000};
          else if(protocol==='responses')body.max_output_tokens=10000;
          else if(provider.id==='openai')body.max_completion_tokens=10000;
          else body.max_tokens=10000;
        }
        continue;
      }
      throw error;
    }
  }
  return {...parsed,request:{provider:target,key,base,path,body},protocol};
}
function responseError(message,code) {return Object.assign(Error(message),{code});}
export function parseCompletion(result,protocol,tool) {
  if(!result || result.error)throw Error('Erreur fournisseur : aucune réponse exploitable.');
  const reason=result.stop_reason || result.candidates?.[0]?.finishReason || result.choices?.[0]?.finish_reason || result.incomplete_details?.reason;
  if(['max_tokens','length','MAX_TOKENS','max_output_tokens'].includes(reason))throw responseError('La réponse a atteint la limite de sortie. Aucune proposition partielle ne peut être appliquée. Réessaie avec une demande plus courte.','length');
  if(result.status==='incomplete' || result.status==='failed' || ['content_filter','SAFETY','RECITATION','refusal'].includes(reason) || result.promptFeedback?.blockReason)throw Error('Le fournisseur a interrompu ou bloqué la réponse. Réessaie ou sélectionne un autre modèle.');
  const textContent=value=>typeof value==='string'?value:Array.isArray(value)?value.filter(c=>!c.thought && ['text','output_text',undefined].includes(c.type)).map(c=>typeof c.text==='string'?c.text:c.text?.value||'').join(''):'';
  let calls=[],answer='',message;
  if(protocol==='anthropic'){calls=(result.content||[]).filter(c=>c.type==='tool_use').map(c=>({name:c.name,input:c.input,raw:c,content:result.content}));answer=textContent(result.content);}
  else if(protocol==='gemini'){const parts=result.candidates?.[0]?.content?.parts||[];calls=parts.filter(c=>c.functionCall).map(c=>({name:c.functionCall.name,input:c.functionCall.args,raw:c.functionCall,part:c}));answer=textContent(parts);}
  else if(protocol==='responses'){calls=(result.output||[]).filter(c=>c.type==='function_call').map(c=>({name:c.name,input:c.arguments,raw:c,output:result.output}));answer=textContent((result.output||[]).flatMap(c=>c.content||[])) || textContent(result.output_text);}
  else {message=result.choices?.[0]?.message;calls=(message?.tool_calls||[]).map(c=>({name:c.function?.name,input:c.function?.arguments,raw:c,message}));answer=textContent(message?.content) || textContent(message?.refusal);}
  if(calls.length>1)throw Error('Le modèle a proposé plusieurs appels simultanés. Demandez une proposition unique.');
  const call=calls[0];
  if(call){
    if(call.name!==tool?.name)throw Error('Outil demandé non autorisé.');
    if(typeof call.input==='string'){try{call.input=JSON.parse(call.input);}catch{throw Error('Proposition IA incomplète ou invalide. Aucune modification appliquée.');}}
    if(!call.input || typeof call.input!=='object' || Array.isArray(call.input))throw Error('Proposition IA incomplète ou invalide. Aucune modification appliquée.');
  }
  if(!call && !answer.trim())throw responseError('Le modèle n’a renvoyé aucune réponse exploitable. Réessaie ou sélectionne un autre modèle.','empty');
  return {text:answer,proposal:call?.input,call};
}

export async function acknowledgeTool(result,status,fetcher=fetch){
  if(!result.call)return;
  const {provider,key,base,path,body}=result.request,call=result.call;
  const payload=JSON.stringify({status,applied:false});
  let next;
  if(result.protocol==='openai')next={...body,messages:[...body.messages,call.message,{role:'tool',tool_call_id:call.raw.id,content:payload}],tool_choice:'none'};
  else if(result.protocol==='anthropic')next={...body,messages:[...body.messages,{role:'assistant',content:call.content || [call.raw]},{role:'user',content:[{type:'tool_result',tool_use_id:call.raw.id,content:payload}]}],tool_choice:{type:'none'}};
  else if(result.protocol==='gemini')next={...body,contents:[...body.contents,{role:'model',parts:[call.part || {functionCall:call.raw}]},{role:'user',parts:[{functionResponse:{name:call.name,response:{status,applied:false}}}]}]};
  else next={...body,tool_choice:'none',input:[...body.input,...(call.output || [call.raw]),{type:'function_call_output',call_id:call.raw.call_id,output:payload}]};
  const response=await providerRequest(provider,key,base,path,next,fetcher);
  return parseCompletion(response,result.protocol,null);
}
export async function complete(provider,key,custom,model,system,prompt,fetcher) {
  return (await chatCompletion(provider,key,custom,model,system,[{role:'user',content:prompt}],null,fetcher)).text;
}
