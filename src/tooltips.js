// A top-layer popover escapes overflow, transforms and modal stacking contexts.
const tip = document.createElement('div');
tip.id = 'global-tooltip';
tip.className = 'global-tooltip';
tip.setAttribute('role', 'tooltip');
tip.setAttribute('popover', 'manual');
document.body.append(tip);
let owner;
function hide() {
  if (tip.matches(':popover-open')) tip.hidePopover();
  if(owner) {
    const ids=(owner.getAttribute('aria-describedby') || '').split(' ').filter(id=>id && id!==tip.id);
    if(ids.length)owner.setAttribute('aria-describedby',ids.join(' '));else owner.removeAttribute('aria-describedby');
  }
  owner=null;
}
function show(event) {
  const node=event.target.closest?.('[data-tooltip],[title]');
  if(!node || node===owner)return;
  hide();
  const text=node.dataset.tooltip || node.getAttribute('title');
  if(!text)return;
  if(node.hasAttribute('title')){node.dataset.tooltip=text;node.removeAttribute('title');}
  owner=node;
  tip.textContent=text;
  node.setAttribute('aria-describedby',`${node.getAttribute('aria-describedby') || ''} ${tip.id}`.trim());
  tip.showPopover();
  const r=node.getBoundingClientRect(), b=tip.getBoundingClientRect();
  tip.style.left=Math.max(8,Math.min(innerWidth-b.width-8,r.left+r.width/2-b.width/2))+'px';
  tip.style.top=Math.max(8,Math.min(innerHeight-b.height-8,r.top>b.height+12?r.top-b.height-8:r.bottom+8))+'px';
}
document.addEventListener('pointerover',show);
document.addEventListener('focusin',show);
document.addEventListener('pointerout',event=>{if(owner && !owner.contains(event.relatedTarget))hide();});
document.addEventListener('focusout',hide);
document.addEventListener('pointerdown',hide,true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
window.addEventListener('resize',hide);
document.addEventListener('scroll',hide,true);
new MutationObserver(()=>{if(owner && !owner.isConnected)hide();}).observe(document.body,{childList:true,subtree:true});
