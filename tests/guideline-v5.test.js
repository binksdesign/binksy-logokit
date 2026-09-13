import test from "node:test";
import assert from "node:assert/strict";
import { project, History } from "../src/model.js";
import {
  prepareGuide,
  generateGuide,
  finalPalette,
  assignFontRoles,
} from "../src/guideline-config.js";
import { validateGuide } from "../src/guideline-model.js";
import { imageFrame } from "../src/guideline-media.js";
import { ProposalSession, proposalProject } from "../src/ai-agent.js";
import {
  PROVIDERS,
  chatCompletion,
  acknowledgeTool,
} from "../src/ai-providers.js";
const fixture = () => {
  const p = project();
  p.assets = {
    icon: { box: { x: 0, y: 0, width: 100, height: 100 } },
    wordmark: { box: { x: 0, y: 0, width: 300, height: 80 } },
  };
  p.colors = [
    { id: "ink", name: "Ink", hex: "#111111" },
    { id: "paper", name: "Paper", hex: "#ffffff" },
    { id: "tech", name: "Technical", hex: "#00ff00" },
  ];
  prepareGuide(p);
  return p;
};
test("V5 final palette references preserve live source colours and exclude technical colours independently", () => {
  const p = fixture(),
    g = p.brandGuideline;
  g.palette = g.palette.filter((c) => c.id !== "tech");
  assert.equal(p.colors.length, 3);
  p.colors[0].hex = "#222222";
  assert.equal(finalPalette(p)[0].hex, "#222222");
  g.palette[0].name = "Official";
  assert.equal(p.colors[0].name, "Ink");
  g.palette.push({
    id: "new",
    name: "Coral",
    hex: "#ff5500",
    role: "accent",
    spot: "PANTONE supplied",
  });
  const restored = validateGuide(g, p.mode);
  assert.deepEqual(
    restored.palette,
    g.palette.map((c) => ({
      ...c,
      sourceId: c.sourceId || "",
      role: c.role || "",
      spot: c.spot || "",
      percentage: 0,
    })),
  );
  assert.equal(finalPalette({ ...p, brandGuideline: restored }).length, 3);
});
test("Preparation creates a dedicated clearspace page for every variant and one page per mockup", () => {
  for (const count of [0, 1, 2, 3]) {
    const p = fixture(),
      g = p.brandGuideline;
    g.setup.mockups = Array.from({ length: count }, (_, i) => ({
      id: "m" + i,
      media: {
        resource: "image" + i,
        fit: "contain",
        zoom: 1.2,
        panX: 0.3,
        panY: 0.6,
      },
    }));
    g.setup.misuses = [
      "wide",
      "tall",
      "rotate",
      "skew",
      "blur",
      "shadow",
      "outline",
      "opacity",
      "colors",
      "crop",
      "proportions",
      "spacing",
    ];
    generateGuide(p);
    assert.equal(g.pages.filter((a) => a.type === "clearspace").length, 4);
    assert.ok(
      g.pages
        .filter((a) => a.type === "clearspace")
        .every((a) => a.variants.length === 1),
    );
    assert.equal(g.pages.filter((a) => a.type === "minimum").length, 2);
    assert.equal(
      g.pages.filter((a) => a.type === "applications").length,
      count,
    );
    assert.equal(
      g.pages.filter((a) => a.type === "misuse").flatMap((a) => a.misuses)
        .length,
      12,
    );
    assert.ok(!g.pages.some((a) => a.type === "mission"));
    const ids = g.pages.map((a) => a.id);
    generateGuide(p);
    assert.deepEqual(
      g.pages.map((a) => a.id),
      ids,
    );
  }
});
test("Font defaults use real available weights and retain px/pt equivalence", () => {
  const p = fixture(),
    g = p.brandGuideline;
  g.resources = [
    { id: "regular", type: "font", family: "Test", weight: 400 },
    { id: "bold", type: "font", family: "Test", weight: 700 },
  ];
  assignFontRoles(g);
  assert.equal(g.typography.title.font, "bold");
  assert.equal(g.typography.body.font, "regular");
  assert.equal(g.typography.title.px, (g.typography.title.pt * 4) / 3);
  g.typography.title.font = "regular";
  assignFontRoles(g);
  assert.equal(g.typography.title.font, "regular");
});
test("Shared image frame fits, fills, zooms and pans predictably for portrait/landscape/square images", () => {
  for (const [width, height] of [
    [1600, 900],
    [900, 1600],
    [900, 900],
  ]) {
    const box = { x: 10, y: 20, w: 400, h: 300 },
      r = { width, height };
    const contain = imageFrame({ fit: "contain" }, r, box);
    assert.ok(contain.w <= 400 + 0.01 && contain.h <= 300 + 0.01);
    const cover = imageFrame({ fit: "cover" }, r, box);
    assert.ok(cover.w >= 400 - 0.01 && cover.h >= 300 - 0.01);
    const zoom = imageFrame(
      { fit: "cover", zoom: 2, panX: 0, panY: 1 },
      r,
      box,
    );
    assert.equal(zoom.x, 10);
    assert.equal(zoom.y, 320 - zoom.h);
  }
});
test("Proposal refinement never mutates the real project or history; Apply is atomic and undoable", () => {
  let p = fixture();
  generateGuide(p);
  const session = new ProposalSession(),
    history = new History(),
    before = structuredClone(p),
    id = p.brandGuideline.pages[1].id;
  session.propose(p, {
    message: "Dark",
    actions: [
      {
        type: "pageColors",
        pageId: id,
        values: { background: "#111111", text: "#ffffff" },
      },
    ],
  });
  assert.deepEqual(p, before);
  assert.equal(history.past.length, 0);
  session.propose(p, {
    message: "Light",
    actions: [
      {
        type: "pageColors",
        pageId: id,
        values: { background: "#ffffff", text: "#111111" },
      },
    ],
  });
  assert.deepEqual(p, before);
  session.apply(p, (fn) => {
    history.push(p);
    fn();
  });
  assert.equal(history.past.length, 1);
  assert.equal(p.brandGuideline.pages[1].background, "#ffffff");
  assert.equal(session.active, null);
  p = history.undo(p);
  assert.deepEqual(p, before);
});
test("Invalid palette selections, unknown actions and stale proposals cannot alter a project", () => {
  const p = fixture();
  generateGuide(p);
  const before = structuredClone(p),
    id = p.brandGuideline.pages[0].id;
  assert.throws(() =>
    proposalProject(p, {
      message: "bad",
      actions: [
        { type: "brand", value: "Bad" },
        { type: "pageColors", pageId: id, values: { background: "#abcdef" } },
      ],
    }),
  );
  assert.deepEqual(p, before);
  const s = new ProposalSession();
  s.propose(p, {
    message: "rename",
    actions: [{ type: "brand", value: "New" }],
  });
  p.brand = "User edit";
  assert.throws(() => s.apply(p, (fn) => fn()), /changé/);
  assert.equal(p.brand, "User edit");
});
test("OpenRouter tool round trip includes authenticated chat, tool result and no applied mutation", async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return {
      ok: true,
      text: async () =>
        JSON.stringify(
          calls.length === 1
            ? {
                choices: [
                  {
                    message: {
                      role: "assistant",
                      content: null,
                      tool_calls: [
                        {
                          id: "call1",
                          type: "function",
                          function: {
                            name: "propose_changes",
                            arguments: JSON.stringify({
                              message: "ok",
                              actions: [],
                            }),
                          },
                        },
                      ],
                    },
                  },
                ],
              }
            : { choices: [{ message: { content: "Validated" } }] },
        ),
    };
  };
  const tool = {
    name: "propose_changes",
    description: "proposal",
    parameters: { type: "object", properties: {}, additionalProperties: true },
  };
  const result = await chatCompletion(
    PROVIDERS.openrouter,
    "fixture-only",
    "",
    "selected-model",
    "system",
    [{ role: "user", content: "hello" }],
    tool,
    fetcher,
  );
  assert.equal(result.proposal.message, "ok");
  await acknowledgeTool(result, "validated_pending_user_approval", fetcher);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(calls[0].init.headers.Authorization, "Bearer fixture-only");
  assert.equal(calls[1].body.messages.at(-1).tool_call_id, "call1");
  assert.equal(
    JSON.parse(calls[1].body.messages.at(-1).content).applied,
    false,
  );
  assert.ok(calls[1].body.tools.length);
});
