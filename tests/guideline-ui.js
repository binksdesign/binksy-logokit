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
    await wait(() => q(".bg-wizard"));
    assert(d().querySelectorAll('[data-setup-step]').length === 7);
    click('[data-setup-return]');
    await wait(() => q(".bg-canvas"));
    assert(d().querySelectorAll("nav [data-view]").length === 5);
    assert(d().querySelectorAll("[data-bg-page]").length === 12);
    const pdfButton = q('[data-bg="pdf"]');
    assert(pdfButton?.disabled, "Brand Guideline PDF export must be disabled");
    assert(pdfButton?.getAttribute("aria-disabled") === "true", "Disabled PDF export must expose its state");
    assert(pdfButton?.parentElement?.dataset.tooltip === "Bientôt disponible, exportez en svg", "Disabled PDF export tooltip");
    pdfButton.click();
    assert(q(".bg-canvas"), "Disabled PDF export must not leave the guide");
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
    assert(q(".bg-toolbar"));
    click("[data-ai-assistant]");
    assert(q(".ai-chat"));
    assert(q('[data-prompt]') && !q('[data-provider]'));
    click('[data-settings]');
    assert(d().querySelectorAll("[data-provider] option").length === 18);
    assert(q(".ai-chat").textContent.includes("OpenCode Go"));
    click("[data-close]");
    click('[data-language="fr"]');
    click('[data-view="delivery"]');
    assert(q(".workspace").dataset.step === "delivery");
    click('[data-view="guideline"]');
    await wait(() => q("#save-state").textContent.includes("Enregistré"));
  });
  await test("Application: durable save and reload retain guide content", async () => {
    const saved = (await readProjects()).findLast(
      (p) => p.brand === project.brand,
    );
    assert(saved.brandGuideline.enabled);
    assert(JSON.stringify(saved).includes("Texte du canvas"));
    await new Promise(resolve => { frame.onload=resolve; frame.src = "/"; });
    await wait(() => q('[data-mode="compose"]'));
    await upload("#project-file", [
      new File([JSON.stringify(saved)], "reloaded.binksy", {
        type: "application/json",
      }),
    ]);
    await wait(() => q('[data-view="guideline"]'));
    click('[data-view="guideline"]');
    await wait(()=>q('.bg-canvas'));
    assert(d().querySelectorAll("[data-bg-page]").length === 12);
  });
  await test("Application: preparation generation and page/global controls", async () => {
    click('[data-bg="setup"]');
    await wait(()=>q('.bg-wizard'));
    const previousWidth=frame.style.width, previousHeight=frame.style.height;
    for (const [width,height] of [[1440,900],[1024,640],[390,700]]) {
      frame.style.width=width+'px';frame.style.height=height+'px';
      await new Promise(resolve=>setTimeout(resolve,80));
      const content=q('.bg-wizard-content').getBoundingClientRect(), footer=q('.bg-wizard > footer').getBoundingClientRect();
      assert(content.height>100,'Wizard content has usable scroll area at '+width);
      assert(q('.bg-wizard > nav').getBoundingClientRect().height<120,'Wizard navigation must not inherit full height');
      assert(footer.bottom<=frame.contentWindow.innerHeight+1,'Wizard actions stay inside viewport at '+width);
    }
    frame.style.width=previousWidth;frame.style.height=previousHeight;
    for(let step=0;step<7;step++) {
      assert(q('[data-setup-step="'+step+'"]').getAttribute('aria-current')==='step');
      if(step===3) {
        assert(d().querySelectorAll('[data-setup-pair]').length===project.colors.length*(project.colors.length-1));
        const pair=q('[data-setup-pair]'), before=q('.bg-wizard-content').scrollTop;
        pair.click();await new Promise(resolve=>requestAnimationFrame(resolve));
        assert(Math.abs(q('.bg-wizard-content').scrollTop-before)<=1,'Pair choice keeps scroll position');
      }
      click('[data-setup-next]');
    }
    await wait(()=>q('.bg-canvas'));
    click('[data-inspector-tab="global"]');
    for(const format of ['portrait','landscape','16:9']) {
      change('[data-bg-format]',format);
      const box=q('.bg-canvas svg').getAttribute('viewBox').split(' ').map(Number);
      assert(format==='portrait'?box[3]>box[2]:box[2]>box[3]);
    }
    change('[data-bg-theme="background"]','#171717');
    click('[data-inspector-tab="page"]');
    if(q('[data-bg="deselect"]')) click('[data-bg="deselect"]');
    change('[data-bg-background]','#eee6d8');
    assert(q('.bg-canvas svg').innerHTML.includes('#eee6d8'));
    assert([...d().querySelectorAll('[data-bg-background] option')].every(o=>project.colors.some(c=>c.hex===o.value)));
    await wait(()=>q('#save-state').textContent.includes('Enregistré'));
    const saved=(await readProjects()).findLast(p=>p.brand===project.brand);
    assert(saved.brandGuideline.setup.complete);
    assert(saved.brandGuideline.pages.filter(a=>a.type==='clearspace').every(a=>a.variants.length===1));
    assert(saved.brandGuideline.format==='16:9');
  });
  await test("Application: chat proposals refine without mutation, apply and Undo (simulated provider)", async () => {
    const originalFetch=frame.contentWindow.fetch;
    let revision=0, toolResults=0;
    frame.contentWindow.fetch=async (url,init)=>{
      if(String(url)!=='https://openrouter.ai/api/v1/chat/completions') return originalFetch(url,init);
      const body=JSON.parse(init.body);
      if(body.messages.at(-1).role==='tool') {
        toolResults++;
        return new frame.contentWindow.Response(JSON.stringify({choices:[{message:{content:'Validated'}}]}));
      }
      revision++;
      const content=body.messages.at(-1).content;
      const context=JSON.parse(typeof content==='string'?content:content.find(c=>c.type==='text').text).context;
      return new frame.contentWindow.Response(JSON.stringify({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'qa-'+revision,type:'function',function:{name:'propose_changes',arguments:JSON.stringify({message:'Proposition QA',actions:[{type:'updatePageSettings',pageId:context.pageId,values:{title:'Titre QA '+revision}}]})}}]}}]}));
    };
    try {
      click('[data-ai-assistant]');click('[data-settings]');
      change('[data-provider]','openrouter');
      q('[data-key]').value='synthetic-test-key';
      click('[data-save]');
      const request=async text=>{
        q('[data-prompt]').value=text;
        q('.ai-composer').dispatchEvent(new frame.contentWindow.Event('submit',{bubbles:true,cancelable:true}));
        await wait(()=>q('[data-apply]')&&!q('[data-apply]').disabled);
      };
      await request('Propose un nouveau nom');
      assert(!q('.bg-canvas').textContent.includes('Titre QA 1'));
      await request('Affine le nom');
      assert(d().querySelectorAll('.ai-proposal').length===1);
      assert(!q('.bg-canvas').textContent.includes('Titre QA 2'));
      click('[data-apply]');
      assert(q('.bg-canvas').textContent.includes('Titre QA 2'));
      assert(q('.bg-document-title').textContent.includes(project.brand));
      assert(!q('[data-apply]'));
      click('[data-close]');click('[data-action="undo"]');
      assert(q('.bg-document-title').textContent.includes(project.brand));
      assert(toolResults===2);
    } finally {frame.contentWindow.fetch=originalFetch;}
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
