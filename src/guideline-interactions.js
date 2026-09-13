import { t } from "./i18n.js";
import { dimensions } from "./guideline-theme.js";
import { limit } from "./guideline-model.js";
// Screen-space controls overlay the SVG; they are never part of exported artwork.
export function selectionControls(canvas, p, page, element, commit, redraw) {
  if (!element) return;
  const { width: W, height: H } = dimensions(p.brandGuideline);
  const patch = (changes) => {
    const custom = page.elements.find((e) => e.id === element.id);
    if (custom) Object.assign(custom, changes);
    else
      page.styles[element.id] = {
        x: element.x / W,
        y: element.y / H,
        w: element.w / W,
        h: element.h / H,
        size: element.size || 12,
        ...page.styles[element.id],
        ...changes,
      };
  };
  const overlay = document.createElement("div");
  overlay.className = "bg-selection";
  Object.assign(overlay.style, {
    left: (element.x / W) * 100 + "%",
    top: (element.y / H) * 100 + "%",
    width: (element.w / W) * 100 + "%",
    height: (element.h / H) * 100 + "%",
  });
  canvas.append(overlay);
  const handle = document.createElement("button");
  handle.className = "bg-resize";
  handle.setAttribute("aria-label", t("Redimensionner"));
  if(!element.physicalSize) overlay.append(handle);
  handle.onpointerdown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = canvas.getBoundingClientRect(),
      startX = event.clientX,
      startY = event.clientY;
    let w = element.w / W,
      h = element.h / H;
    const move = (e) => {
      w = limit(
        element.w / W + (e.clientX - startX) / rect.width,
        0.02,
        1 - element.x / W,
      );
      h = limit(
        element.h / H + (e.clientY - startY) / rect.height,
        0.02,
        1 - element.y / H,
      );
      overlay.style.width = w * 100 + "%";
      overlay.style.height = h * 100 + "%";
    };
    const end = () => {
      document.removeEventListener("pointermove", move);
      commit(() => patch({ w, h }));
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", end, { once: true });
  };
  if (element.type === "text") {
    canvas.querySelector(`[data-guide-element="${element.id}"]`).ondblclick =
      () => {
        const editor = document.createElement("textarea");
        editor.className = "bg-inline-text";
        editor.value = element.text;
        Object.assign(editor.style, {
          left: (element.x / W) * 100 + "%",
          top: (element.y / H) * 100 + "%",
          width: (element.w / W) * 100 + "%",
          height: (element.h / H) * 100 + "%",
          fontSize:
            (element.size * canvas.getBoundingClientRect().width) / W + "px",
          fontFamily: element.font
            ? "bg-" + element.font
            : "bg-binksy-instrument-sans",
        });
        canvas.append(editor);
        editor.focus();
        editor.select();
        let canceled = false;
        editor.onkeydown = (e) => {
          e.stopPropagation();
          if (e.key === "Escape") {
            canceled = true;
            editor.remove();
            redraw();
          }
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") editor.blur();
        };
        editor.onblur = () => {
          if (canceled) return;
          const value = editor.value.slice(0, 6000);
          editor.remove();
          commit(() => patch({ text: value }));
        };
      };
  }
}
