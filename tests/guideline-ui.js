import { readProjects, storeProjects } from "../src/project-storage.js";
// Exercises the actual application on the dedicated test origin, through its UI.
export async function guidelineUI(project, test) {
  const frame = document.createElement("iframe");
  frame.title = "Brand Guideline integration";
  frame.style.cssText = "width:1440px;height:900px;border:1px solid #aaa";
  document.body.append(frame);
  frame.src = "/";
  const d = () => frame.contentDocument,
    q = (s) => d()?.querySelector(s),
    assert = (v, message) => {
      if (!v) throw Error(message || "Assertion");
    };
  const wait = async (fn) => {
    for (let i = 0; i < 400; i++) {
      if (fn()) return;
      await new Promise((r) => setTimeout(r, 40));
    }
    throw Error("UI state timed out");
  };
  const click = (s) => {
    assert(q(s), "Missing " + s);
    q(s).click();
  };
  const change = (s, value) => {
    const el = q(s);
    assert(el, "Missing " + s);
    if (el.type === "checkbox") el.checked = value;
    else el.value = value;
    el.dispatchEvent(
      new frame.contentWindow.Event("change", { bubbles: true }),
    );
  };
  const upload = async (s, files) => {
    const dt = new frame.contentWindow.DataTransfer();
    files.forEach((file) => dt.items.add(file));
    q(s).files = dt.files;
    q(s).dispatchEvent(
      new frame.contentWindow.Event("change", { bubbles: true }),
    );
  };
  await wait(() => q("#project-file"));
  await test("Application: guide import, five steps and editable canvas", async () => {
    await upload("#project-file", [
      new File([JSON.stringify(project)], "guide.binksy", {
        type: "application/json",
      }),
    ]);
    await wait(() => q('[data-view="guideline"]'));
    click('[data-view="guideline"]');
    await wait(() => q(".bg-canvas"));
    assert(d().querySelectorAll("nav [data-view]").length === 5);
    assert(d().querySelectorAll("[data-bg-page]").length === 12);
  });
  await test("Application: text edits, Undo / Redo, page operations", async () => {
    change("[data-bg-title]", "Titre QA");
    assert(q(".bg-canvas").textContent.includes("Titre QA"));
    click('[data-action="undo"]');
    assert(!q(".bg-canvas").textContent.includes("Titre QA"));
    click('[data-action="redo"]');
    assert(q(".bg-canvas").textContent.includes("Titre QA"));
    click('[data-bg="duplicate-page"]');
    assert(d().querySelectorAll("[data-bg-page]").length === 13);
    click('[data-bg="up"]');
    click('[data-bg="delete-page"]');
    assert(d().querySelectorAll("[data-bg-page]").length === 12);
    click('[data-bg="text"]');
    change("[data-bg-text]", "Texte du canvas");
    assert(q(".bg-canvas").textContent.includes("Texte du canvas"));
  });
  await test("Application: multiple images stay separate and resources are shared", async () => {
    const resource = project.brandGuideline.resources.find(
        (r) => r.type === "image",
      ),
      bytes = await (await fetch(resource.data)).arrayBuffer();
    const before = d().querySelectorAll(".bg-canvas image").length;
    await upload("[data-bg-images]", [
      new File([bytes], "one.png", { type: "image/png" }),
      new File([bytes], "two.png", { type: "image/png" }),
    ]);
    await wait(
      () => d().querySelectorAll(".bg-canvas image").length === before + 2,
    );
    await wait(() => q("#save-state")?.textContent.includes("Enregistré"));
    const saved = (await readProjects()).findLast(
      (p) => p.brand === project.brand,
    );
    assert(
      saved.brandGuideline.resources.filter((r) => r.type === "image")
        .length === 1,
      "Shared image resource",
    );
  });
  await test("Application: responsive 1440, 1024 and 390", async () => {
    for (const width of [1440, 1024, 390]) {
      frame.style.width = width + "px";
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      assert(
        d().documentElement.scrollWidth <= width + 1,
        "Horizontal overflow at " + width,
      );
      assert(
        q(".bg-canvas").getBoundingClientRect().width > 100,
        "Canvas visible",
      );
    }
    frame.style.width = "1440px";
  });
  await test("Application: English, scoped assistant and optional guide", async () => {
    click('[data-language="en"]');
    assert(q(".bg-toolbar").textContent.includes("Skip Brand Guideline"));
    click("[data-ai-assistant]");
    assert(q(".ai-dialog"));
    assert(d().querySelectorAll("[data-provider] option").length === 17);
    assert(!q(".ai-dialog").textContent.includes("OpenCode Go"));
    click("[data-close]");
    click('[data-language="fr"]');
    click('[data-bg="skip"]');
    assert(q(".workspace").dataset.step === "delivery");
    assert(!q(".workspace").textContent.includes("Guide inclus dans le kit"));
    click('[data-view="guideline"]');
    change("[data-bg-enabled]", true);
    await wait(() => q("#save-state").textContent.includes("Enregistré"));
  });
  await test("Application: durable save and reload retain guide content", async () => {
    const saved = (await readProjects()).findLast(
      (p) => p.brand === project.brand,
    );
    assert(saved.brandGuideline.enabled);
    assert(JSON.stringify(saved).includes("Texte du canvas"));
    frame.src = "/";
    await wait(() => q('[data-mode="compose"]'));
    await upload("#project-file", [
      new File([JSON.stringify(saved)], "reloaded.binksy", {
        type: "application/json",
      }),
    ]);
    await wait(() => q('[data-view="guideline"]'));
    click('[data-view="guideline"]');
    assert(d().querySelectorAll("[data-bg-page]").length === 12);
  });
  await test("Storage: IndexedDB quota fallback and return to localStorage", async () => {
    const backup = await readProjects();
    try {
      const large = [{ id: "quota-fixture", payload: "x".repeat(7e6) }];
      await storeProjects(large);
      assert(
        JSON.parse(localStorage.getItem("binksy-logo-system")).storage ===
          "indexeddb",
      );
      assert((await readProjects())[0].payload.length === 7e6);
      await storeProjects([{ id: "small" }]);
      assert((await readProjects())[0].id === "small");
    } finally {
      await storeProjects(backup);
    }
  });
  frame.remove();
}
