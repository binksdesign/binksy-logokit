import { fontFamily } from "./guideline-fonts.js";
import { editorialPage } from './guideline-editorial.js';
import { PAGE_TYPES, MISUSES, ROLES } from "./guideline-model.js";
import {
  theme,
  pageTheme,
  typeStyle,
  dimensions,
  contrast,
  colorValues,
  mixColor,
  inkOn,
} from "./guideline-theme.js";
import {
  variantIds,
  variantName,
  clearMeasure,
  isReadyVariant,
} from "./model.js";
import { editorialContent } from "./guideline-content.js";
import { t } from "./i18n.js";
export const pageHeading = (page) =>
  page.title ||
  t(
    page.type === "cover"
      ? "Guide de marque"
      : page.type === "end"
        ? "Une identité. Un même langage."
        : PAGE_TYPES[page.type],
  );
// Editorial page grid in points. All furniture, artwork and copy share this display list.
export function legacyPageElements(p, page, index = 0) {
  const g = p.brandGuideline,
    T = pageTheme(p, page),
    base = theme(p),
    { width: W, height: H } = dimensions(g),
    portrait = W < H,
    m = T.margin,
    cw = W - 2 * m,
    gap = T.spacing,
    top = m + 94,
    bottom = H - m - 27,
    ch = bottom - top;
  const items = [],
    add = (type, id, x, y, w, h, extra = {}) => {
      items.push({ type, id, x, y, w, h, ...extra });
    };
  const text = (id, value, x, y, w, h, role = "body", extra = {}) =>
    add("text", id, x, y, w, h, {
      text: value,
      role,
      ...typeStyle(g, role),
      fill: T.text,
      ...extra,
    });
  const rect = (id, x, y, w, h, fill, extra = {}) =>
    add("rect", id, x, y, w, h, { fill, ...extra });
  const line = (id, x, y, w, color = T.rule) => rect(id, x, y, w, 0.45, color);
  const label = (id, value, x, y, w, fill = T.muted) =>
    text(id, value, x, y, w, 14, "caption", {
      size: 7.5,
      tracking: 1.15,
      fill,
    });
  const logo = (id, v, x, y, w, h, extra = {}) =>
    add("logo", id, x, y, w, h, { variant: v, ...extra });
  const variants = (page.variants.length ? page.variants : p.enabled).filter(
    (v) => variantIds(p).includes(v),
  );
  const section = [
    "cover",
    "introduction",
    "history",
    "mission",
    "goals",
    "values",
    "positioning",
    "personality",
    "audience",
    "tagline",
  ].includes(page.type)
    ? "LA MARQUE"
    : ["logos", "construction", "clearspace", "minimum", "misuse"].includes(
          page.type,
        )
      ? "LE LOGO"
      : ["palette", "pairs", "distribution", "accessibility"].includes(
            page.type,
          )
        ? "LES COULEURS"
        : ["fonts", "hierarchy"].includes(page.type)
          ? "TYPOGRAPHIE"
          : "EN APPLICATION";
  const descriptions = {
    logos: "Les compositions qui signent la marque.",
    construction: "Une construction cohérente, dans chaque format.",
    clearspace:
      "Préserver un espace libre autour du logo, sur tous les supports.",
    minimum: "Les seuils de lisibilité à respecter en impression et à l’écran.",
    misuse: "Préserver le dessin, les proportions et la lisibilité du logo.",
    palette: "Une palette commune, des références précises.",
    pairs: "Des associations lisibles, pour chaque prise de parole.",
    fonts: "Les voix typographiques de la marque.",
    hierarchy: "Chaque niveau a sa place. Chaque texte a son rythme.",
    applications: "Une même identité, au fil des supports.",
    distribution: "Un équilibre visuel au service de la reconnaissance.",
  };
  const grid = (
    entries,
    draw,
    {
      x = m,
      y = top,
      w = cw,
      h = ch,
      cols = portrait ? 2 : 3,
      space = gap,
    } = {},
  ) => {
    cols = Math.min(cols, Math.max(entries.length, 1));
    const rows = Math.max(1, Math.ceil(entries.length / cols)),
      cellW = (w - space * (cols - 1)) / cols,
      cellH = (h - space * (rows - 1)) / rows;
    entries.forEach((entry, i) =>
      draw(
        entry,
        x + (i % cols) * (cellW + space),
        y + Math.floor(i / cols) * (cellH + space),
        cellW,
        cellH,
        i,
      ),
    );
  };
  const footer = () => {
    if (!T.numbers) return;
    line("footer-rule", m, H - m - 10, cw);
    label("folio-brand", p.brand.toUpperCase(), m, H - m + 3, cw * 0.52);
    label("folio-type", "BRAND GUIDELINES", m + cw * 0.61, H - m + 3, cw * 0.3);
    label(
      "folio",
      String(index + 1).padStart(2, "0"),
      W - m - 16,
      H - m + 3,
      16,
      T.text,
    );
  };
  if (!["cover", "end", "blank"].includes(page.type)) {
    label(
      "section",
      `${String(index).padStart(2, "0")}  /  ${t(section)}`,
      m,
      m,
      cw * 0.65,
    );
    label(
      "header-brand",
      p.brand.toUpperCase(),
      W - m - cw * 0.27,
      m,
      cw * 0.27,
    );
    line("header-rule", m, m + 23, cw);
    text(
      "title",
      pageHeading(page),
      m,
      m + 38,
      portrait ? cw : cw * 0.61,
      44,
      "title",
      { leading: 1.06, tracking: -0.35 },
    );
    if (!portrait && descriptions[page.type])
      text(
        "page-intro",
        t(descriptions[page.type]),
        m + cw * 0.69,
        m + 42,
        cw * 0.31,
        42,
        "small",
        { size: 10, fill: T.muted, leading: 1.45 },
      );
  }
  if (page.type === "cover") {
    label("cover-kicker", "BRAND GUIDELINES", m, m, cw * 0.5, T.text);
    label(
      "cover-edition",
      t("IDENTITÉ VISUELLE"),
      m + cw * 0.7,
      m,
      cw * 0.3,
      T.text,
    );
    const imageLayout = page.layout === "image",
      typographic = page.layout === "typographic",
      dominant = page.layout === "dominant";
    if (typographic) {
      text("cover-brand-hero", p.brand, m, H * 0.24, cw, 100, "title", {
        size: typeStyle(g, "title").size * 1.4,
        leading: 1.05,
      });
      if (variants[0]) {
        rect("cover-paper", m, H * 0.47, cw * 0.46, H * 0.19, base.background);
        logo(
          "cover-logo",
          variants[0],
          m + 20,
          H * 0.49,
          cw * 0.46 - 40,
          H * 0.15,
        );
      }
    } else {
      const panelY = H * 0.16,
        panelH = dominant ? H * 0.54 : H * 0.48,
        panelW = imageLayout && !portrait ? cw * 0.48 : cw;
      rect("cover-paper", m, panelY, panelW, panelH, base.background);
      if (variants[0])
        logo(
          "cover-logo",
          variants[0],
          m + panelW * 0.13,
          panelY + panelH * 0.17,
          panelW * 0.74,
          panelH * 0.66,
        );
    }
    const titleY = H * 0.73;
    text(
      "title",
      page.title || t("Guide de marque"),
      m,
      titleY,
      portrait ? cw : cw * 0.6,
      62,
      "title",
      { size: typeStyle(g, "title").size, leading: 1.08 },
    );
    text("brand", p.brand, m, H - m - 35, cw * 0.56, 23, "body", { size: 11 });
    text(
      "body",
      page.body || g.brief.tagline || t("Les repères de notre identité."),
      portrait ? m : m + cw * 0.7,
      portrait ? titleY + 64 : titleY + 5,
      portrait ? cw : cw * 0.3,
      44,
      "small",
      { size: 10, fill: T.text },
    );
    const swatchW = Math.min(32, cw * 0.055);
    p.colors
      .slice(0, 6)
      .forEach((c, i) =>
        rect(
          "cover-color-" + c.id,
          W - m - (Math.min(p.colors.length, 6) - i) * swatchW,
          H - m - 25,
          swatchW,
          12,
          c.hex,
        ),
      );
  } else if (page.type === "end") {
    label("closing-kicker", t("L’IDENTITÉ EN COMMUN"), m, m, cw, T.text);
    line("closing-rule", m, m + 23, cw);
    rect(
      "closing-paper",
      m,
      H * 0.18,
      portrait ? cw : cw * 0.38,
      H * 0.26,
      base.background,
    );
    if (variants[0])
      logo(
        "cover-logo",
        variants[0],
        m + 24,
        H * 0.21,
        (portrait ? cw : cw * 0.38) - 48,
        H * 0.2,
      );
    text(
      "title",
      page.title || t("Une identité.\nUn même langage."),
      m,
      H * 0.54,
      cw * 0.95,
      85,
      "title",
      { leading: 1.12 },
    );
    text(
      "body",
      page.body ||
        g.brief.tagline ||
        t("Des repères clairs pour une expression cohérente."),
      m,
      H * 0.76,
      portrait ? cw : cw * 0.6,
      42,
      "body",
      { fill: T.text },
    );
    label("brand", p.brand.toUpperCase(), m, H - m - 12, cw, T.text);
  } else if (["logos", "construction"].includes(page.type)) {
    const card = (v, x, y, w, h, i) => {
      const imageH = h - 56;
      rect("logo-panel-" + v, x, y, w, imageH, T.surface);
      label(
        "logo-index-" + v,
        String(i + 1).padStart(2, "0"),
        x + 16,
        y + 14,
        w - 32,
      );
      logo("logo-" + v, v, x + w * 0.1, y + 35, w * 0.8, imageH - 62);
      text(
        "label-" + v,
        variantName(p, v),
        x,
        y + imageH + 12,
        w,
        19,
        "heading",
        { size: 12 },
      );
      text(
        "description-" + v,
        t("Conserver les proportions et les couleurs."),
        x,
        y + imageH + 34,
        w,
        20,
        "caption",
        { size: 8.5, fill: T.muted },
      );
    };
    if (variants.length === 2 && !portrait) {
      const left = (cw - gap) * 0.62;
      card(variants[0], m, top, left, ch, 0);
      card(variants[1], m + left + gap, top, cw - left - gap, ch, 1);
    } else grid(variants, card, { cols: portrait ? 1 : 2 });
  } else if (page.type === "clearspace") {
    grid(
      variants,
      (v, x, y, w, h, i) => {
        const measure = clearMeasure(p, v),
          artH = h - 60;
        rect("clear-panel-" + v, x, y, w, artH, T.surface);
        logo("logo-" + v, v, x + 12, y + 12, w - 24, artH - 24, {
          clearspace: true,
        });
        text(
          "label-" + v,
          variantName(p, v),
          x,
          y + artH + 13,
          w * 0.65,
          19,
          "heading",
          { size: 12 },
        );
        text(
          "description-" + v,
          `${measure.multiplier} X`,
          x + w * 0.72,
          y + artH + 10,
          w * 0.28,
          24,
          "heading",
          { size: 18 },
        );
        text(
          "reference-" + v,
          `X = ${measure.label}`,
          x,
          y + artH + 38,
          w,
          20,
          "caption",
          { fill: T.muted },
        );
      },
      { cols: portrait ? 1 : 2 },
    );
  } else if (page.type === "minimum") {
    label("min-version", t("VERSION"), m, top, cw * 0.22);
    label("min-print", "PRINT", m + cw * 0.3, top, cw * 0.27);
    label("min-digital", "DIGITAL", m + cw * 0.67, top, cw * 0.3);
    const rowH = (ch - 26) / Math.max(variants.length, 1);
    variants.forEach((v, i) => {
      const y = top + 26 + i * rowH,
        c = p.compositions[v];
      line("min-line-" + v, m, y, cw);
      text(
        "label-" + v,
        variantName(p, v),
        m,
        y + 22,
        cw * 0.24,
        rowH - 28,
        "heading",
        { size: 12 },
      );
      for (const [mode, fraction, actual, value] of [
        ["print", 0.3, (c.minPrint * 72) / 25.4, `${c.minPrint} mm`],
        ["digital", 0.67, c.minDigital * 0.75, `${c.minDigital} px`],
      ]) {
        const x = m + cw * fraction,
          boxW = cw * 0.26;
        logo(
          mode + "-" + v,
          v,
          x,
          y + 20,
          Math.min(actual, boxW),
          Math.max(24, rowH - 68),
        );
        text(mode + "-label-" + v, value, x, y + rowH - 32, boxW, 24, "body", {
          size: 12,
        });
      }
    });
  } else if (page.type === "misuse") {
    const rules = page.misuses.filter(
      (rule) =>
        !(
          ["proportions", "spacing"].includes(rule) &&
          (isReadyVariant(p, variants[0] || p.active) || p.mode !== "compose")
        ),
    );
    grid(
      rules,
      (rule, x, y, w, h, i) => {
        const good = rule === "correct",
          artH = h - 36;
        rect(
          "misuse-panel-" + rule,
          x,
          y,
          w,
          artH,
          good ? mixColor(base.accent, base.background, 0.9) : T.surface,
        );
        label(
          "misuse-index-" + rule,
          String(i + 1).padStart(2, "0"),
          x + 12,
          y + 10,
          w - 24,
        );
        text(
          "misuse-mark-" + rule,
          good ? "+" : "×",
          x + w - 25,
          y + 7,
          16,
          18,
          "body",
          { size: 15, fill: good ? base.accent : T.muted },
        );
        logo(
          "misuse-" + rule,
          variants[0] || p.active,
          x + 12,
          y + 22,
          w - 24,
          artH - 30,
          { effect: rule },
        );
        text(
          "rule-" + rule,
          t(MISUSES[rule]),
          x,
          y + artH + 9,
          w,
          27,
          "caption",
          { size: 8.5, fill: T.text, leading: 1.25 },
        );
      },
      { space: gap + 3 },
    );
  } else if (page.type === "palette") {
    const colors = [...p.colors].sort(
      (a, b) =>
        (g.colorRoles[a.id]?.order || 0) - (g.colorRoles[b.id]?.order || 0),
    );
    const swatch = (c, x, y, w, h) => {
      const values = colorValues(c.hex),
        ink = inkOn(c.hex),
        artH = portrait ? h * 0.63 : h * 0.67;
      rect("swatch-" + c.id, x, y, w, artH, c.hex, {
        stroke: mixColor(c.hex, base.text, 0.15),
      });
      label(
        "swatch-role-" + c.id,
        t(g.colorRoles[c.id]?.role || "COULEUR"),
        x + 16,
        y + 15,
        w - 32,
        ink,
      );
      text(
        "color-" + c.id,
        c.name,
        x + 16,
        y + artH - 47,
        w - 32,
        28,
        "heading",
        { size: 17, fill: ink },
      );
      text(
        "color-hex-" + c.id,
        c.hex.toUpperCase(),
        x + 16,
        y + artH - 22,
        w - 32,
        17,
        "caption",
        { fill: ink, size: 8.5 },
      );
      text(
        "values-" + c.id,
        `RGB  ${values.rgb}\nCMYK ≈ ${values.cmyk}${g.colorRoles[c.id]?.spot ? "\n" + g.colorRoles[c.id].spot : ""}`,
        x,
        y + artH + 13,
        w,
        Math.max(35, h - artH - 13),
        "caption",
        { size: 9, fill: T.muted, leading: 1.6 },
      );
    };
    if (colors.length === 3 && !portrait) {
      const first = (cw - 2 * gap) * 0.43,
        rest = (cw - first - 2 * gap) / 2;
      swatch(colors[0], m, top, first, ch);
      colors
        .slice(1)
        .forEach((c, i) =>
          swatch(c, m + first + gap + i * (rest + gap), top, rest, ch),
        );
    } else
      grid(colors, swatch, { cols: portrait ? 1 : Math.min(4, colors.length) });
  } else if (["pairs", "accessibility"].includes(page.type)) {
    const pairs = p.colors
      .flatMap((a) =>
        p.colors
          .filter((b) => b.id !== a.id)
          .map((b) => {
            const decision = g.pairs[a.id + ":" + b.id],
              ratio = contrast(a.hex, b.hex);
            return {
              a,
              b,
              ratio,
              decision,
              allowed:
                decision?.manual || decision?.source === "ai"
                  ? decision.allowed
                  : ratio >= 4.5,
            };
          }),
      )
      .slice(0, 12);
    [true, false].forEach((allowed, column) => {
      const x = m + (column * (cw + gap)) / 2,
        w = (cw - gap) / 2,
        entries = pairs.filter((pair) => pair.allowed === allowed);
      text(
        "pair-group-" + column,
        t(allowed ? "À faire" : "À éviter"),
        x,
        top,
        w,
        22,
        "heading",
        { size: 13 },
      );
      line("pair-line-" + column, x, top + 29, w);
      const rowH = (ch - 40) / Math.max(entries.length, 1);
      entries.forEach(({ a, b, ratio, decision }, i) => {
        const y = top + 40 + i * rowH,
          artW = portrait ? w : w * 0.45,
          artH = portrait ? rowH * 0.52 : rowH - 12;
        rect("pair-bg-" + a.id + b.id, x, y, artW, artH, b.hex, {
          stroke: T.rule,
        });
        text(
          "pair-text-" + a.id + b.id,
          "Aa",
          x + 12,
          y + Math.max(8, (artH - 30) / 2),
          artW - 24,
          35,
          "body",
          { size: 26, fill: a.hex, leading: 1 },
        );
        const tx = portrait ? x : x + artW + 14,
          ty = portrait ? y + artH + 5 : y + 9,
          tw = portrait ? w : w - artW - 14;
        text(
          "pair-note-" + a.id + b.id,
          `${ratio.toFixed(2)}:1\n${t(decision?.manual ? "Manuel" : decision?.source === "ai" ? "Suggestion IA" : "Automatique")}`,
          tx,
          ty,
          tw,
          Math.max(28, rowH - artH - 7),
          "caption",
          { size: 8.5, fill: T.muted, leading: 1.5 },
        );
      });
    });
  } else if (page.type === "fonts") {
    const roles = [...new Set([...ROLES, ...Object.keys(g.typography)])],
      entries = [
        ...new Map(
          roles.map((role) => [
            typeStyle(g, role).font || "Instrument Sans",
            role,
          ]),
        ).values(),
      ];
    grid(
      entries,
      (role, x, y, w, h) => {
        const s = typeStyle(g, role),
          font = g.resources.find((r) => r.id === s.font),
          family = font ? fontFamily(font) : "Instrument Sans";
        line("font-rule-" + role, x, y, w);
        label("font-role-" + role, t(role).toUpperCase(), x, y + 14, w);
        text("font-label-" + role, family, x, y + 39, w, 30, "heading", {
          size: 18,
        });
        text(
          "font-hero-" + role,
          "Aa",
          x,
          y + 83,
          w,
          Math.min(98, h * 0.34),
          role,
          { size: Math.min(78, h * 0.25), leading: 1, tracking: -1 },
        );
        text(
          "font-" + role,
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789",
          x,
          y + h * 0.64,
          w,
          Math.max(46, h * 0.25),
          role,
          { size: portrait ? 12 : 14, leading: 1.65, tracking: 0 },
        );
        label(
          "font-weight-" + role,
          `${t("Graisse")} ${s.weight}`,
          x,
          y + h - 13,
          w,
        );
      },
      { cols: portrait ? 1 : 2, space: gap * 2 },
    );
  } else if (page.type === "hierarchy") {
    const roles = [...new Set([...ROLES, ...Object.keys(g.typography)])],
      rowH = ch / roles.length,
      samples = {
        title: "Un titre qui pose le ton.",
        subtitle: "Une idée, en quelques mots.",
        heading: "Une lecture bien guidée.",
        body: "Un texte clair, précis et facile à parcourir.",
        small: "Les détails utiles, au bon endroit.",
        caption: "Une légende pour accompagner le visuel.",
      };
    roles.forEach((role, i) => {
      const y = top + i * rowH,
        s = typeStyle(g, role);
      line("type-rule-" + role, m, y, cw);
      label("font-label-" + role, t(role).toUpperCase(), m, y + 14, cw * 0.23);
      text(
        "font-" + role,
        t(samples[role] || samples.body),
        m + cw * 0.27,
        y + 12,
        cw * 0.49,
        rowH - 17,
        role,
        { leading: 1.12 },
      );
      text(
        "font-metrics-" + role,
        `${s.size} pt / ${s.weight}\n${t("Interlignage")} ${s.leading}`,
        m + cw * 0.8,
        y + 12,
        cw * 0.2,
        rowH - 14,
        "caption",
        { size: 8, fill: T.muted },
      );
    });
  } else if (page.type === "distribution") {
    const sum = p.colors.reduce((s, c) => s + (g.distribution[c.id] || 0), 0);
    let start = m;
    p.colors.forEach((c) => {
      const share = sum ? g.distribution[c.id] || 0 : 100 / p.colors.length,
        w = (cw * share) / 100;
      if (w) rect("share-" + c.id, start, top, w, ch * 0.53, c.hex);
      start += w;
    });
    const rowH = (ch * 0.4) / Math.max(1, p.colors.length);
    p.colors.forEach((c, i) => {
      const y = top + ch * 0.6 + i * rowH;
      rect("share-swatch-" + c.id, m, y + 2, 8, 8, c.hex);
      text("share-label-" + c.id, c.name, m + 20, y, cw * 0.65, rowH, "body", {
        size: 11,
      });
      text(
        "share-number-" + c.id,
        `${Math.round(sum ? g.distribution[c.id] || 0 : 100 / p.colors.length)} %`,
        m + cw * 0.83,
        y,
        cw * 0.17,
        rowH,
        "body",
        { size: 11 },
      );
    });
  } else if (
    ["applications", "photography", "social", "icons"].includes(page.type)
  ) {
    if (!page.elements.some((e) => e.type === "image"))
      grid(
        Array.from({ length: page.layout === "full" ? 1 : 2 }, (_, i) => i),
        (i, x, y, w, h) => {
          add("placeholder", "image-slot-" + i, x, y, w, h, {
            fill: T.surface,
          });
          label(
            "image-slot-label-" + i,
            t("VOTRE IMAGE"),
            x + 18,
            y + 18,
            w - 36,
          );
          text(
            "image-slot-help-" + i,
            t("Importez une mise en situation de votre marque."),
            x + 18,
            y + h - 55,
            w - 36,
            40,
            "small",
            { size: 10, fill: T.muted },
          );
        },
        { cols: portrait ? 1 : 2 },
      );
  } else if (page.type === "contact") {
    text(
      "body",
      page.body ||
        t(
          "Ajoutez vos coordonnées et les informations de contact de la marque.",
        ),
      m,
      top,
      cw * 0.65,
      ch * 0.6,
      "body",
    );
  } else {
    const content = editorialContent(g, page);
    if (content) {
      const leftW = portrait ? cw : cw * 0.42,
        rightX = portrait ? m : m + cw * 0.54,
        rightW = portrait ? cw : cw * 0.46;
      label(
        "editorial-state",
        t(
          content.example
            ? "TEXTE D’EXEMPLE · À PERSONNALISER"
            : "NOTRE MARQUE",
        ),
        m,
        top,
        leftW,
      );
      text(
        "editorial-headline",
        content.headline,
        m,
        top + 29,
        leftW,
        portrait ? 80 : 105,
        "subtitle",
        { size: portrait ? 20 : 23, leading: 1.18, tracking: -0.2 },
      );
      const bodyY = portrait ? top + 135 : top + 115;
      text(
        "body",
        content.body,
        m,
        bodyY,
        leftW,
        portrait ? ch - 135 - 124 : ch - 115,
        "body",
        { size: typeStyle(g, "body").size, leading: 1.55 },
      );
      if (portrait) {
        rect("editorial-panel", m, bottom - 106, cw, 106, T.surface);
        label(
          "editorial-signature",
          p.brand.toUpperCase(),
          m + 18,
          bottom - 87,
          cw * 0.4,
        );
        if (variants[0])
          logo(
            "editorial-logo",
            variants[0],
            m + cw * 0.5,
            bottom - 85,
            cw * 0.43,
            63,
          );
      }
      if (!portrait) {
        rect("editorial-panel", rightX, top, rightW, ch, T.surface);
        label(
          "editorial-signature",
          p.brand.toUpperCase(),
          rightX + 24,
          top + 22,
          rightW - 48,
          T.muted,
        );
        if (variants[0])
          logo(
            "editorial-logo",
            variants[0],
            rightX + rightW * 0.14,
            top + ch * 0.26,
            rightW * 0.72,
            ch * 0.36,
          );
        const stripH = 16,
          stripW = (rightW - 48) / Math.max(1, p.colors.length);
        p.colors.forEach((c, i) =>
          rect(
            "editorial-color-" + c.id,
            rightX + 24 + i * stripW,
            bottom - 40,
            stripW,
            stripH,
            c.hex,
          ),
        );
      }
    }
  }
  if (!["cover", "end"].includes(page.type)) footer();
  for (const e of page.elements)
    items.push({
      ...e,
      ...(e.type === "text" ? { ...typeStyle(g, e.role || "body"), ...e } : {}),
      x: e.x * W,
      y: e.y * H,
      w: e.w * W,
      h: e.h * H,
    });
  return items
    .map((e) => {
      const o = page.styles[e.id];
      return o
        ? {
            ...e,
            ...(o.role ? { ...typeStyle(g, o.role), role: o.role } : {}),
            variant: o.variant || e.variant,
            x: Number.isFinite(o.x) ? o.x * W : e.x,
            y: Number.isFinite(o.y) ? o.y * H : e.y,
            w: Number.isFinite(o.w) ? o.w * W : e.w,
            h: Number.isFinite(o.h) ? o.h * H : e.h,
            size: o.size || e.size,
            text: o.text ?? e.text,
            fill: o.fill || e.fill,
            hidden: o.hidden,
          }
        : e;
    })
    .filter((e) => !e.hidden);
}

export function pageElements(p, page, index = 0) {
  if (p.brandGuideline.schema !== 2) return legacyPageElements(p, page, index);
  const g=p.brandGuideline,{width:W,height:H}=dimensions(g);
  const items = editorialPage(p,page,index);
  for(const e of page.elements) items.push({...e,...(e.type==='text'?{...typeStyle(g,e.role||'body'),...e}:{}),x:e.x*W,y:e.y*H,w:e.w*W,h:e.h*H});
  return items.map(e=>{
    const o=page.styles[e.id]; if(!o)return e;
    return {...e,...(o.role?{...typeStyle(g,o.role),role:o.role}:{}),x:Number.isFinite(o.x)?o.x*W:e.x,y:Number.isFinite(o.y)?o.y*H:e.y,w:Number.isFinite(o.w)?o.w*W:e.w,h:Number.isFinite(o.h)?o.h*H:e.h,size:o.size||e.size,text:o.text??e.text,fill:o.fill||e.fill,variant:o.variant||e.variant,hidden:o.hidden};
  }).filter(e=>!e.hidden);
}
