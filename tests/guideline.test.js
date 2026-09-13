import { editorialContent, editorialTypes } from "../src/guideline-content.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyGuide,
  initializeGuide,
  page,
  movePage,
  duplicatePage,
  validateGuide,
  FORMATS,
  normalizeDistribution,
} from "../src/guideline-model.js";
import { project, History } from "../src/model.js";
import {
  stageContext,
  validateActions,
  applyActions,
} from "../src/ai-context.js";
import {
  PROVIDERS,
  listModels,
  complete,
  endpoint,
} from "../src/ai-providers.js";
import { contrast, typeStyle } from "../src/guideline-theme.js";
test("Guide is optional, has exactly three formats, and starts with twelve pages", () => {
  const p = project();
  assert.equal(p.version, 4);
  assert.equal(p.brandGuideline.enabled, false);
  initializeGuide(p);
  assert.equal(p.brandGuideline.pages.length, 12);
  assert.deepEqual(Object.keys(FORMATS), ["16:9", "landscape", "portrait"]);
  assert.equal(validateGuide(p.brandGuideline, "clearspace").enabled, false);
});
test("Page order, duplicate independence and history", () => {
  const p = project();
  initializeGuide(p);
  const g = p.brandGuideline,
    a = g.pages[0],
    b = g.pages[1],
    copy = duplicatePage(g, a.id);
  copy.body = "changed";
  assert.equal(a.body, "");
  movePage(g, copy.id, b.id);
  assert.equal(g.pages[1].id, copy.id);
  const history = new History();
  history.push(p);
  g.pages.splice(0, 1);
  assert.equal(history.undo(p).brandGuideline.pages.length, 13);
});
test("Guide round trip strips unknown fields and never keeps injected credentials", () => {
  const p = project();
  initializeGuide(p);
  p.brandGuideline.apiKey = "forbidden";
  p.brandGuideline.pages[0].apiKey = "forbidden";
  const g = validateGuide(
    JSON.parse(JSON.stringify(p.brandGuideline)),
    "compose",
  );
  assert(!JSON.stringify(g).includes("forbidden"));
  assert.deepEqual(
    g.pages.map((p) => p.type),
    p.brandGuideline.pages.map((p) => p.type),
  );
  assert.equal(validateGuide(null).enabled, false);
});
test("Resource and page limits reject malformed files", () => {
  assert.throws(() => validateGuide({ pages: Array(101).fill({}) }));
  assert.throws(() =>
    validateGuide({
      pages: [],
      resources: [{ id: "a", type: "image", data: "javascript:alert(1)" }],
    }),
  );
});
test("Theme defaults are smaller in A4; color distribution totals 100", () => {
  const p = project();
  const screen = typeStyle(p.brandGuideline, "title").size;
  p.brandGuideline.format = "portrait";
  assert(typeStyle(p.brandGuideline, "title").size < screen);
  p.colors = [{ id: "a" }, { id: "b" }, { id: "c" }];
  normalizeDistribution(p.brandGuideline, p.colors);
  assert.equal(
    Object.values(p.brandGuideline.distribution).reduce((a, b) => a + b),
    100,
  );
  assert.equal(contrast("#000000", "#ffffff"), 21);
});
test("AI context is minimal and actions cannot cross step boundaries", () => {
  const p = project();
  initializeGuide(p);
  assert(!("assets" in stageContext(p, "delivery")));
  assert(!("brief" in stageContext(p, "compose")));
  assert.throws(() =>
    validateActions(
      JSON.stringify({
        message: "x",
        actions: [{ type: "brand", value: "x" }],
      }),
      "delivery",
      p,
    ),
  );
  const before = JSON.stringify(p.compositions);
  applyActions(p, "guideline", {
    message: "x",
    actions: [
      {
        type: "pageText",
        id: p.brandGuideline.pages[0].id,
        title: "Title",
        body: "Body",
      },
    ],
  });
  assert.equal(JSON.stringify(p.compositions), before);
  assert.throws(() => validateActions("{bad", "guideline", p));
  assert.throws(() =>
    validateActions(
      JSON.stringify({
        message: "x",
        actions: [
          {
            type: "pageText",
            id: p.brandGuideline.pages[0].id,
            title: "x",
            body: "x",
            code: "bad",
          },
        ],
      }),
      "guideline",
      p,
    ),
  );
});
test("Manual color pair decisions override AI", () => {
  const p = project();
  p.colors = [{ id: "a" }, { id: "b" }];
  p.brandGuideline.pairs["a:b"] = { manual: true, allowed: false };
  applyActions(p, "guideline", {
    message: "",
    actions: [
      { type: "pair", foreground: "a", background: "b", allowed: true },
    ],
  });
  assert.equal(p.brandGuideline.pairs["a:b"].allowed, false);
});
test("Provider registry has three shared protocols and excludes OpenCode Go", () => {
  assert.equal(Object.keys(PROVIDERS).length, 17);
  assert(!Object.hasOwn(PROVIDERS, "opencode-go"));
  assert.equal(
    new Set(Object.values(PROVIDERS).map((p) => p.protocol)).size,
    3,
  );
  assert.throws(() =>
    endpoint(PROVIDERS.custom, "https://key:secret@example.com"),
  );
  assert.throws(() => endpoint(PROVIDERS.custom, "http://example.com"));
});
test("Dynamic models and manual IDs use selected provider only", async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      text: async () =>
        JSON.stringify(
          url.endsWith("/models")
            ? { data: [{ id: "future-model" }] }
            : {
                choices: [
                  { message: { content: '{"message":"ok","actions":[]}' } },
                ],
              },
        ),
    };
  };
  const models = await listModels(PROVIDERS.groq, "test-key", "", fetcher);
  assert.equal(models[0].id, "future-model");
  await complete(
    PROVIDERS.groq,
    "test-key",
    "",
    "manually-entered-future-model",
    "system",
    "prompt",
    fetcher,
  );
  assert.equal(
    JSON.parse(requests[1].options.body).model,
    "manually-entered-future-model",
  );
  assert(requests.every((r) => r.url.startsWith(PROVIDERS.groq.base)));
  assert(requests.every((r) => r.options.redirect === "error"));
});

test("AI can edit visible guide text while upstream artwork stays read-only", () => {
  const p = project();
  initializeGuide(p);
  const a = p.brandGuideline.pages.find((a) => a.type === "introduction");
  const context = stageContext(p, "guideline");
  assert(
    context.pages
      .find((page) => page.id === a.id)
      .texts.some((e) => e.id === "body"),
  );
  const before = JSON.stringify({
    assets: p.assets,
    compositions: p.compositions,
  });
  applyActions(p, "guideline", {
    message: "Suggested copy",
    actions: [
      { type: "elementText", pageId: a.id, id: "body", text: "Approved copy" },
    ],
  });
  assert.equal(
    p.brandGuideline.pages.find((page) => page.id === a.id).styles.body.text,
    "Approved copy",
  );
  assert.equal(
    JSON.stringify({ assets: p.assets, compositions: p.compositions }),
    before,
  );
  assert.throws(() =>
    validateActions(
      JSON.stringify({
        message: "",
        actions: [
          { type: "elementText", pageId: a.id, id: "nonexistent", text: "x" },
        ],
      }),
      "guideline",
      p,
    ),
  );
  assert.throws(() =>
    validateActions(
      JSON.stringify({ message: "", actions: [null] }),
      "guideline",
      p,
    ),
  );
});
test("Anthropic and Gemini adapters list models and extract structured responses", async () => {
  for (const provider of [PROVIDERS.anthropic, PROVIDERS.gemini]) {
    const calls = [];
    const fetcher = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        text: async () =>
          JSON.stringify(
            url.endsWith("/models")
              ? provider.protocol === "gemini"
                ? {
                    models: [
                      {
                        name: "models/current",
                        supportedGenerationMethods: ["generateContent"],
                      },
                    ],
                  }
                : { data: [{ id: "current" }] }
              : provider.protocol === "gemini"
                ? {
                    candidates: [
                      {
                        content: {
                          parts: [{ text: '{"message":"ok","actions":[]}' }],
                        },
                      },
                    ],
                  }
                : {
                    content: [
                      { type: "text", text: '{"message":"ok","actions":[]}' },
                    ],
                  },
          ),
      };
    };
    assert.equal(
      (await listModels(provider, "fixture-key", "", fetcher))[0].id,
      "current",
    );
    assert.match(
      await complete(
        provider,
        "fixture-key",
        "",
        "current",
        "system",
        "prompt",
        fetcher,
      ),
      /actions/,
    );
    assert(calls.every((c) => c.url.startsWith(provider.base)));
    assert(!calls.some((c) => c.url.includes("fixture-key")));
  }
});
test("Provider errors never disclose raw response text", async () => {
  for (const [status, message] of [
    [401, "Clé API refusée."],
    [429, "Quota dépassé. Réessayez plus tard."],
  ]) {
    await assert.rejects(
      () =>
        listModels(PROVIDERS.openai, "fixture-key", "", async () => ({
          ok: false,
          status,
          text: async () => "fixture-key",
        })),
      { message },
    );
  }
  await assert.rejects(
    () =>
      listModels(PROVIDERS.openai, "fixture-key", "", async () => ({
        ok: true,
        text: async () => "secret-echo not JSON",
      })),
    { message: "Réponse JSON invalide." },
  );
});

test("Editorial samples are marked fictional and never overwrite supplied copy", () => {
  const g = emptyGuide();
  for (const type of editorialTypes) {
    const sample = editorialContent(g, page(type));
    assert(sample.example);
    assert(sample.body.length > 150);
  }
  const a = page("mission");
  g.brief.goal = "Notre mission réelle";
  assert.equal(editorialContent(g, a).body, "Notre mission réelle");
  assert.equal(editorialContent(g, a).example, false);
  a.body = "Texte rédigé";
  assert.equal(editorialContent(g, a).body, "Texte rédigé");
  a.styles.body = { text: "Texte édité sur le canvas" };
  assert.equal(editorialContent(g, a).body, "Texte édité sur le canvas");
});
