import { t } from "./i18n.js";
import { esc } from "./ui.js";

// Geometry uses SVG units, independently of zoom and screen size.
export function measureSquare(start, point, edges = [], threshold = 0) {
  const dx = point.x - start.x,
    dy = point.y - start.y;
  let size = Math.max(Math.abs(dx), Math.abs(dy));
  const sx = dx < 0 ? -1 : 1,
    sy = dy < 0 ? -1 : 1;
  const candidates = edges
    .flatMap(({ x, y }) => [
      x == null ? null : (x - start.x) * sx,
      y == null ? null : (y - start.y) * sy,
    ])
    .filter((n) => n > 0 && Math.abs(n - size) <= threshold);
  if (candidates.length)
    size = candidates.sort(
      (a, b) => Math.abs(a - size) - Math.abs(b - size),
    )[0];
  size = Math.min(1000000, size);
  return {
    x: start.x + (sx < 0 ? -size : 0),
    y: start.y + (sy < 0 ? -size : 0),
    size,
  };
}

export function startVisualMeasure({
  canvas,
  parts,
  snap,
  previous,
  commit,
  finish,
}) {
  if (!canvas) return;
  const controller = new AbortController(),
    { signal } = controller;
  const stage = canvas.parentElement;
  stage.classList.add("measuring");
  const hint = document.createElement("div");
  hint.className = "measurement-hint";
  hint.innerHTML = `<span>${t("Tracez un carré sur le logo")}</span><button>${t("Annuler")}</button>`;
  stage.append(hint);
  let overlay,
    drag = null;
  const clean = () => {
    controller.abort();
    overlay?.remove();
    hint.remove();
    stage.classList.remove("measuring");
    finish();
  };
  hint.querySelector("button").onclick = clean;
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        clean();
      }
    },
    { signal },
  );
  const edges = parts.flatMap((q) => [
    { x: q.x, y: q.y },
    { x: q.x + q.w, y: q.y + q.h },
  ]);
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const matrix = canvas.getScreenCTM().inverse();
      let start = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix);
      const threshold = 7 * Math.hypot(matrix.a, matrix.b);
      if (snap && !e.altKey) {
        for (const axis of ["x", "y"]) {
          const near = edges
            .map((q) => q[axis])
            .filter((n) => Math.abs(n - start[axis]) <= threshold)
            .sort(
              (a, b) => Math.abs(a - start[axis]) - Math.abs(b - start[axis]),
            );
          if (near.length) start[axis] = near[0];
        }
      }
      drag = { start, matrix, threshold, pointer: e.pointerId, square: null };
      if (e.isTrusted) canvas.setPointerCapture(e.pointerId);
      overlay?.remove();
      overlay = document.createElementNS("http://www.w3.org/2000/svg", "g");
      overlay.setAttribute("data-measure-overlay", "");
      overlay.setAttribute("pointer-events", "none");
      canvas.append(overlay);
    },
    { capture: true, signal },
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        drag.matrix,
      );
      const square = measureSquare(
        drag.start,
        point,
        snap && !e.altKey ? edges : [],
        drag.threshold,
      );
      drag.square = square;
      const { x, y, size } = square,
        fs = 12 * Math.hypot(drag.matrix.a, drag.matrix.b);
      overlay.innerHTML = `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#ff5500" fill-opacity=".16" stroke="#ff5500" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${x}" y="${y - fs * 0.6}" font-size="${fs}" fill="#b33b00" stroke="white" stroke-width="${fs * 0.15}" paint-order="stroke">${size.toFixed(2)} ${t("unités")}</text>`;
    },
    { signal },
  );
  canvas.addEventListener(
    "pointerup",
    (e) => {
      if (!drag || e.pointerId !== drag.pointer) return;
      const square = drag.square;
      clean();
      if (!square || square.size < 0.01) return;
      const dialog = document.createElement("dialog");
      dialog.className = "measurement-dialog";
      dialog.setAttribute("aria-label", t("Nommer la mesure"));
      dialog.innerHTML = `<form method="dialog"><h2>${t("Nommer la mesure")}</h2><p>${square.size.toFixed(2)} ${t("unités SVG")}</p><label>${t("Cette mesure correspond à :")}<input name="reference" maxlength="160" placeholder="${t("Hauteur du M")}" value="${esc(previous || "")}" autofocus></label><div class="dialog-actions"><button value="cancel">${t("Annuler")}</button><button class="primary" value="apply">${t("Utiliser cette mesure")}</button></div></form>`;
      document.querySelector("#app").append(dialog);
      dialog.addEventListener(
        "close",
        () => {
          if (dialog.returnValue === "apply")
            commit({
              value: square.size,
              label: dialog.querySelector("input").value.trim(),
            });
          dialog.remove();
        },
        { once: true },
      );
      dialog.showModal();
    },
    { signal },
  );
  canvas.addEventListener("pointercancel", clean, { signal });
  return clean;
}

export function copyClearRule(source, target) {
  for (const key of [
    "clearMethod",
    "clearRef",
    "clearMultiplier",
    "references",
    "visualMeasure",
  ])
    if (source[key] !== undefined) target[key] = structuredClone(source[key]);
    else delete target[key];
}
