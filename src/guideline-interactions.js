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

        ...page.styles[element.id],
        ...changes,
      };
  };
  const layer = document.createElement("div");
  layer.className = "bg-interaction-layer";
  layer.style.aspectRatio = `${W} / ${H}`;
  canvas.append(layer);
  const overlay = document.createElement("div");
  overlay.className = "bg-selection";
  Object.assign(overlay.style, {
    transform: `rotate(${element.rotation || 0}deg)`,
    left: (element.x / W) * 100 + "%",
    top: (element.y / H) * 100 + "%",
    width: (element.w / W) * 100 + "%",
    height: (element.h / H) * 100 + "%",
  });
  layer.append(overlay);
  const handle = document.createElement("button");
  handle.className = "bg-resize";
  handle.setAttribute("aria-label", t("Redimensionner"));
  if(!element.physicalSize) overlay.append(handle);
  handle.onpointerdown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = canvas.querySelector("svg").getBoundingClientRect(),
      startX = event.clientX,
      startY = event.clientY;
    let w = element.w / W,
      h = element.h / H;
    const move = (e) => {
      const angle=(element.rotation || 0)*Math.PI/180;
      const dx=(e.clientX-startX)/rect.width*W, dy=(e.clientY-startY)/rect.height*H;
      w = limit(
        element.w / W + (dx*Math.cos(angle)+dy*Math.sin(angle))/W,
        0.02,
        element.type === "image" ? 100 : 1 - element.x / W,
      );
      h = limit(
        element.h / H + (-dx*Math.sin(angle)+dy*Math.cos(angle))/H,
        0.02,
        element.type === "image" ? 100 : 1 - element.y / H,
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
  if (element.type === 'image') {
    const rotate=document.createElement('button');
    rotate.className='bg-rotate';rotate.setAttribute('aria-label',t('Rotation'));overlay.append(rotate);
    rotate.onpointerdown=event=>{
      event.preventDefault();event.stopPropagation();
      const rect=overlay.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
      const initial=Math.atan2(event.clientY-cy,event.clientX-cx);let rotation=element.rotation || 0;
      const move=ev=>{rotation=(element.rotation || 0)+(Math.atan2(ev.clientY-cy,ev.clientX-cx)-initial)*180/Math.PI;if(ev.shiftKey)rotation=Math.round(rotation/15)*15;overlay.style.transform=`rotate(${rotation}deg)`;canvas.querySelector(`[data-guide-element="${element.id}"] > g`).setAttribute('transform',`rotate(${rotation} ${element.x+element.w/2} ${element.y+element.h/2})`);};
      const end=()=>{document.removeEventListener('pointermove',move);commit(()=>patch({rotation:((rotation+180)%360+360)%360-180}));};
      document.addEventListener('pointermove',move);document.addEventListener('pointerup',end,{once:true});
    };
  }
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
            (element.size * canvas.querySelector("svg").getBoundingClientRect().width) / W + "px",
          fontFamily: element.font
            ? "bg-" + element.font
            : "bg-binksy-instrument-sans",
        });
        layer.append(editor);
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
