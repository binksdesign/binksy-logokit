import { pairCapacity } from "./guideline-minimum.js";
import { pairState } from "./guideline-pairs.js";
import { minimumRows } from "./guideline-minimum.js";
import {
  dimensions,
  typeStyle,
  pageTheme,
  contrast,
  colorValues,
} from "./guideline-theme.js";
import {
  finalPalette,
  COLOR_ROLES, colorRoles,
  EDITORIAL_TYPES,
} from "./guideline-config.js";
import { variantName, layout, clearMeasure } from "./model.js";
import { PAGE_TYPES, MISUSES, ROLES } from "./guideline-model.js";
import { t } from "./i18n.js";

export function editorialPage(p, a, index) {
  const g = p.brandGuideline,
    T = pageTheme(p, a),
    { width: W, height: H } = dimensions(g);
  const portrait = H > W,
    m = T.margin,
    cw = W - 2 * m,
    top = m + 92,
    bottom = H - m - 24,
    ch = bottom - top;
  const palette = finalPalette(p),
    variants = (a.variants.length ? a.variants : p.enabled).filter(
      (v) => layout(p, v).parts.length,
    );
  const ink = (bg) =>
    [...palette].sort((x, y) => contrast(y.hex, bg) - contrast(x.hex, bg))[0]
      ?.hex || T.text;
  const items = [],
    add = (type, id, x, y, w, h, extra = {}) =>
      items.push({ type, id, x, y, w, h, ...extra });
  const text = (id, value, x, y, w, h, role = "body", extra = {}) =>
    add("text", id, x, y, w, h, {
      ...typeStyle(g, role),
      role,
      text: value,
      fill: T.text,
      ...extra,
    });
  const rect = (id, x, y, w, h, fill = T.text) =>
    add("rect", id, x, y, w, h, { fill });
  const rule = (id, x, y, w, fill = T.rule) => rect(id, x, y, w, 0.5, fill);
  const caption = (id, value, x, y, w, fill = T.muted) =>
    text(id, value, x, y, w, 18, "caption", { fill });
  const logo = (id, v, x, y, w, h, extra = {}) =>
    add("logo", id, x, y, w, h, { variant: v, ...extra });
  const image = (id, media, x, y, w, h) => {
    if (media?.resource) add("image", id, x, y, w, h, media);
  };
  const title =
    a.title ||
    (a.type === "minimum"
      ? t(
          a.group === "parts"
            ? "Tailles minimales — Éléments"
            : "Tailles minimales — Logos complets",
        )
      : a.type === "clearspace"
        ? t("Zone de sécurité") + " — " + variantName(p, variants[0])
        : t(PAGE_TYPES[a.type]));
  if (!["cover", "end", "blank"].includes(a.type)) {
    if (g.theme.headers !== false) {
      caption(
        "section",
        String(index + 1).padStart(2, "0") +
          " / " +
          t(
            EDITORIAL_TYPES.includes(a.type)
              ? "LA MARQUE"
              : "IDENTITÉ VISUELLE",
          ),
        m,
        m,
        cw * 0.6,
      );
      if (g.theme.brandName !== false)
        caption("header-brand", p.brand, m + cw * 0.76, m, cw * 0.24);
    }
    text("title", title, m, m + 27, cw, 60, "title");
  }
  if (a.type === "cover") {
    const leftW = portrait ? W : W / 2,
      contentW = leftW - 2 * m;
    rect("cover-field", 0, 0, leftW, H, T.accent);
    const foreground = ink(T.accent);
    caption("cover-label", "BRAND GUIDELINES", m, H * 0.24 - 30, contentW, foreground);
    text(
      "cover-brand",
      a.title || p.brand,
      m,
      H * 0.24,
      contentW,
      portrait ? 90 : 120,
      "title",
      { size: typeStyle(g, "title").size * 1.35, fill: foreground },
    );
    text(
      "cover-baseline",
      a.body || g.brief.tagline || "",
      m,
      H * 0.53,
      contentW,
      70,
      "subtitle",
      { fill: foreground },
    );
    caption(
      "cover-note",
      t("Identité visuelle"),
      m,
      H - m - 20,
      contentW,
      foreground,
    );
    const box = portrait
      ? { x: m, y: H * 0.68, w: cw, h: H * 0.21 }
      : { x: W / 2, y: 0, w: W / 2, h: H };
    if (a.media?.resource)
      image("page-media", a.media, box.x, box.y, box.w, box.h);
    else if (variants[0]) {
      rect("cover-logo-field", box.x, box.y, box.w, box.h, T.background);
      logo(
        "cover-logo",
        variants[0],
        box.x + box.w * 0.1,
        box.y + box.h * 0.12,
        box.w * 0.8,
        box.h * 0.76,
        { fill: ink(T.background) },
      );
    }
  } else if (a.type === "end") {
    const fill = ink(T.background);
    text("end-title", a.title || p.brand, m, H * 0.23, cw, H * 0.22, "title", {
      size: typeStyle(g, "title").size * 1.5,
      fill,
    });
    text(
      "body",
      a.body || g.brief.tagline || "",
      m,
      H * 0.5,
      cw * 0.65,
      90,
      "subtitle",
      { fill },
    );
    if (variants[0])
      logo("end-logo", variants[0], m, H * 0.76, cw * 0.45, H * 0.13, { fill });
  } else if (EDITORIAL_TYPES.includes(a.type)) {
    const key = {
      introduction: "description",
      mission: "goal",
      goals: "goal",
      values: "values",
      audience: "audience",
      personality: "tone",
      tagline: "tagline",
    }[a.type];
    const body = a.body || g.brief[key] || "";
    const blocks = body.split(/\n\s*\n/).filter(Boolean);
    const style =
      a.layout !== "minimal"
        ? a.layout
        : {
            mission: "statement",
            tagline: "statement",
            values: "columns",
            goals: "columns",
            history: "editorial",
            positioning: "manifesto",
            personality: "manifesto",
          }[a.type] || (index % 2 ? "editorial" : "manifesto");
    if (style === "statement") {
      rect("statement-field", m, top, cw, ch, T.accent);
      text(
        "body",
        body,
        m + 28,
        top + ch * 0.15,
        cw - 56,
        ch * 0.65,
        "subtitle",
        { size: typeStyle(g, "subtitle").size * 1.2, fill: ink(T.accent) },
      );
    } else if (style === "columns" && blocks.length > 1) {
      const count = Math.min(blocks.length, 3),
        gap = 24,
        colW = portrait ? cw : (cw - gap * (count - 1)) / count,
        rh = portrait ? (ch - gap * (count - 1)) / count : ch;
      for (let i = 0; i < count; i++) {
        const x = portrait ? m : m + i * (colW + gap),
          y = portrait ? top + i * (rh + gap) : top;
        const [head, ...rest] = (
          i === count - 1 ? blocks.slice(i).join("\n\n") : blocks[i]
        ).split("\n");
        caption(
          "pillar-index-" + i,
          String(i + 1).padStart(2, "0"),
          x,
          y,
          colW,
        );
        rule("pillar-rule-" + i, x, y + 23, colW);
        text(
          "pillar-title-" + i,
          head,
          x,
          y + 40,
          colW,
          portrait ? 42 : 90,
          "heading",
        );
        text(
          "pillar-body-" + i,
          rest.join("\n"),
          x,
          y + (portrait ? 88 : 145),
          colW,
          Math.max(20, rh - (portrait ? 88 : 145)),
          "body",
        );
      }
    } else if (style === "manifesto") {
      rect("manifesto-stripe", m, top, portrait ? 12 : 24, ch, T.accent);
      text(
        "body",
        body,
        m + (portrait ? 35 : 60),
        top + 20,
        cw - (portrait ? 45 : 80),
        ch - 40,
        body.length < 200 ? "subtitle" : "body",
      );
    } else {
      const lead = blocks[0] || "",
        rest = blocks.slice(1).join("\n\n");
      text(
        "body",
        lead,
        m,
        top,
        portrait ? cw : cw * 0.7,
        rest ? ch * 0.42 : ch * 0.72,
        "subtitle",
      );
      if (rest)
        text(
          "continuation",
          rest,
          portrait ? m : m + cw * 0.38,
          top + ch * 0.47,
          portrait ? cw : cw * 0.62,
          ch * 0.53,
          "body",
        );
      rule(
        "editorial-bottom",
        m,
        bottom - 2,
        portrait ? cw * 0.25 : cw * 0.3,
        T.accent,
      );
    }
  } else if (a.type === "logos" || a.type === "construction") {
    const cols = portrait ? 1 : 2,
      rows = Math.ceil(variants.length / cols),
      gap = 20,
      w = (cw - gap * (cols - 1)) / cols,
      h = (ch - gap * (rows - 1)) / rows;
    variants.forEach((v, i) => {
      const x = m + (i % cols) * (w + gap),
        y = top + Math.floor(i / cols) * (h + gap);
      if (a.type === "construction") rect("logo-bg-" + v, x, y, w, h - 24, T.background);
      logo("logo-" + v, v, x + 20, y + 15, w - 40, h - 60);
      caption("logo-label-" + v, variantName(p, v), x, y + h - 19, w);
    });
  } else if (a.type === "clearspace") {
    const v=variants[0];
    if(v) {
      const measure=clearMeasure(p,v);
      logo("clear-logo",v,m+24,top,cw-48,ch-90,{clearspace:a.settings?.guides!==false});
      if(a.settings?.explanation!==false) {
        text("clear-value",`${measure.multiplier} × ${measure.label}`,m,bottom-55,cw*.7,32,"heading");
        caption("clear-description",t("Conserver cet espace libre autour du logo."),m,bottom-21,cw);
      }
    }
  } else if (a.type === "minimum") {
    let y=top;
    const {rows}=minimumRows(p,a);
    rows.forEach(({variant:v,print,digital,ph,dh,stacked,height:rowHeight}) => {
      const c=p.compositions[v];
      caption("minimum-variant-"+v,variantName(p,v),m,y,cw*.24);
      const samples=stacked
        ? [["print",`${c.minPrint} mm`,print,ph,m,y+24],["digital",`${c.minDigital} px`,digital,dh,m,y+60+ph]]
        : [["print",`${c.minPrint} mm`,print,ph,m+cw*.27,y],["digital",`${c.minDigital} px`,digital,dh,m+cw*.27+Math.max(cw*.34,print+24),y]];
      for (const [mode,value,width,height,x,sy] of samples) {
        caption("minimum-"+mode+"-"+v,mode.toUpperCase()+" · "+value,x,sy,Math.max(100,width));
        logo("minimum-"+mode+"-logo-"+v,v,x,sy+26,width,height,{physicalSize:true});
        rule("minimum-"+mode+"-measure-"+v,x,sy+28+height,width);
      }
      y+=rowHeight;
    });
  } else if (a.type === "misuse") {
    const rules = a.misuses.slice(0, 6),
      cols = portrait ? 2 : 3,
      rows = Math.ceil(rules.length / cols),
      gap = 20,
      w = (cw - gap * (cols - 1)) / cols,
      h = (ch - gap * (rows - 1)) / Math.max(1, rows);
    rules.forEach((v, i) => {
      const x = m + (i % cols) * (w + gap),
        y = top + Math.floor(i / cols) * (h + gap);

      caption(
        "misuse-index-" + v,
        String((a.ruleOffset || 0) + i + 1).padStart(2, "0"),
        x + 10,
        y + 8,
        w - 20,
      );
      logo("misuse-" + v, variants[0], x + 10, y + 24, w - 20, h - 65, {
        effect: v,
      });
      text("rule-" + v, t(MISUSES[v]), x, y + h - 28, w, 28, "caption");
    });
  } else if (a.type === "palette" || a.type === "distribution") {
    const cols = portrait
        ? Math.min(2, palette.length)
        : Math.min(5, palette.length),
      rows = Math.ceil(palette.length / Math.max(1, cols)),
      gap = 10,
      w = (cw - gap * (cols - 1)) / Math.max(1, cols),
      h = (ch - gap * (rows - 1)) / Math.max(1, rows);
    palette.forEach((c, i) => {
      const x = m + (i % cols) * (w + gap),
        y = top + Math.floor(i / cols) * (h + gap),
        fg = ink(c.hex),
        values = colorValues(c.hex);
      rect("swatch-" + c.id, x, y, w, h * 0.56, c.hex);
      text(
        "color-name-" + c.id,
        c.name,
        x + 12,
        y + 15,
        w - 24,
        48,
        "heading",
        { fill: fg },
      );
      if (a.settings?.roles !== false && colorRoles(g)[c.role])
        caption(
          "color-role-" + c.id,
          t(colorRoles(g)[c.role]),
          x + 12,
          y + h * 0.56 - 30,
          w - 24,
          fg,
        );
      const meta = [];
      if (a.settings?.hex !== false) meta.push(c.hex.toUpperCase());
      if (a.settings?.rgb !== false) meta.push("RGB " + values.rgb);
      if (a.settings?.cmyk !== false) meta.push("CMYK " + values.cmyk);
      if (a.settings?.pantone !== false && c.spot)
        meta.push("Pantone " + c.spot);
      if (c.percentage > 0) meta.push(c.percentage + " %");
      text(
        "color-data-" + c.id,
        meta.join("\n"),
        x,
        y + h * 0.56 + 14,
        w,
        h * 0.44 - 14,
        "caption",
      );
    });
  } else if (a.type === "pairs" || a.type === "accessibility") {
    const pairs=palette.flatMap(bg=>palette.map(fg=>({bg,fg,state:pairState(g,fg,bg)})));
    const capacity=pairCapacity(p), cols=Math.max(1,Math.floor(cw/175)), gap=16;
    const visible=pairs.slice(a.pairOffset || 0,(a.pairOffset || 0)+capacity);
    const w=(cw-gap*(cols-1))/cols, h=84;
    visible.forEach(({bg,fg,state},i)=>{
      const id=fg.id+'-'+bg.id, x=m+(i%cols)*(w+gap), y=top+Math.floor(i/cols)*100;
      rect('pair-field-'+id,x,y,w,h-24,bg.hex);
      text('pair-text-'+id,'Aa — '+p.brand,x+12,y+10,w-24,38,'heading',{fill:fg.hex});
      add('status','pair-mark-'+id,x,y+h-20,14,14,{state});
      caption('pair-status-'+id,t({recommended:'À FAIRE',allowed:'Autorisée',avoid:'À ÉVITER'}[state]),x+21,y+h-20,w-21);
    });
  } else if (a.type === "fonts") {
    const fonts = g.resources.filter((r) => r.type === "font"),
      families = [...new Set(fonts.map((r) => r.family))];
    if (!families.length) families.push("Instrument Sans");
    const gap = 20,
      count = families.length,
      cols = portrait ? 1 : Math.min(count, 3),
      rows = Math.ceil(count / cols),
      w = (cw - gap * (cols - 1)) / cols,
      h = (ch - gap * (rows - 1)) / rows;
    families.forEach((family, i) => {
      const f = fonts.find((r) => r.family === family),
        x = m + (i % cols) * (w + gap),
        y = top + Math.floor(i / cols) * (h + gap);
      caption("font-name-" + i, family, x, y, w);
      text("font-specimen-" + i, "Aa", x, y + 28, w, h * 0.44, "title", {
        font: f?.id || "",
        size: Math.min(80, h * 0.35),
        weight: f?.weight || 400,
      });
      text(
        "font-alphabet-" + i,
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789",
        x,
        y + h * 0.53,
        w,
        h * 0.28,
        "body",
        { font: f?.id || "", weight: f?.weight || 400 },
      );
      caption(
        "font-weights-" + i,
        [
          ...new Set(
            fonts.filter((f) => f.family === family).map((f) => f.weight),
          ),
        ].join(" · ") || "400",
        x,
        y + h - 22,
        w,
      );
    });
  } else if (a.type === "hierarchy") {
    const roles = [...ROLES,...(g.accentTypography?.enabled ? ["accent"] : [])];
    // Remove row spacing, then padding, before reducing the type specimens.
    const styles=roles.map(role=>typeStyle(g,role));
    const natural=styles.map(s=>s.size*Math.min(s.leading,1.2)*2);
    const total=natural.reduce((a,b)=>a+Math.max(32,b+8),0);
    const gap=Math.max(0,Math.min(12,(ch-total)/Math.max(1,roles.length-1)));
    const padding=total>ch ? 2 : 8;
    const available=ch-gap*(roles.length-1);
    const heightAt=scale=>natural.reduce((sum,h)=>sum+Math.max(32,h*scale+padding),0);
    let low=0,high=1;
    for(let i=0;i<24;i++){const mid=(low+high)/2;if(heightAt(mid)<=available)low=mid;else high=mid;}
    const scale=heightAt(1)<=available?1:low;
    let cursor=top;
    roles.forEach((role, i) => {
      const s=styles[i],rh=Math.max(32,natural[i]*scale+padding),y=cursor;
      cursor+=rh+gap;
      caption("type-role-" + role, t(role), m, y, cw * 0.26);
      text(
        "type-sample-" + role,
        t(
          {
            title: "Un titre qui pose le ton.",
            subtitle: "Une idée, en quelques mots.",
            heading: "Une lecture bien guidée.",
            body: "Un texte clair, précis et facile à parcourir.",
            small: "Les détails utiles, au bon endroit.",
            caption: "Une légende pour accompagner le visuel.",
            accent: "Une signature typographique.",
          }[role],
        ),
        m + cw * 0.28,
        y,
        cw * 0.43,
        rh - padding,
        role,
        { size: Math.max(8, s.size*scale), minSize:8, leading: Math.min(s.leading,1.2) },
      );
      text(
        "type-values-" + role,
        `${s.family}\n${+s.px.toFixed(1)} px / ${s.size} pt · ${s.weight}`,
        m + cw * 0.75,
        y,
        cw * 0.25,
        rh - 2,
        "caption",
      );
    });
  } else if (
    ["applications", "photography", "icons", "social"].includes(a.type)
  ) {
    if (a.media?.resource) {
      const r = g.resources.find((r) => r.id === a.media.resource),
        tall = (r?.height || 0) > (r?.width || 1) * 1.15;
      if (a.layout === "hero") image("page-media", a.media, m, top, cw, ch);
      else {
        const w = tall && !portrait ? cw * 0.65 : cw;
        image("page-media", a.media, m, top, w, ch - 60);
        text("body", a.body, m, bottom - 44, cw, 44, "caption");
      }
    }
  } else if (a.type === "contact") text("body", a.body, m, top, cw, ch, "body");
  if (!["cover", "end"].includes(a.type) && g.theme.footers !== false) {
    if (g.theme.brandName !== false)
      caption("footer-brand", p.brand, m, H - m, cw * 0.65);
    if (g.theme.numbers !== false)
      caption(
        "folio",
        String(index + 1).padStart(2, "0"),
        W - m - 30,
        H - m,
        30,
      );
  }
  return items;
}
