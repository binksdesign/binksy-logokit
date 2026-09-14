// Test-only origin: create synthetic assets through the same upload controls as a user.
const frame=document.querySelector('iframe'),result=document.querySelector('#result');
const pause=()=>new Promise(r=>setTimeout(r,40));
const wait=async(fn)=>{for(let n=0;n<150;n++){if(fn())return;await pause()}throw Error('État absent')};
const doc=()=>frame.contentDocument,q=s=>doc().querySelector(s);
try{
 await wait(()=>q('[data-mode="compose"]'));q('[data-mode="compose"]').click();
 for(const part of ['icon','wordmark']){const file=await(await fetch('./fixtures/'+part+'.svg')).text(),data=new frame.contentWindow.DataTransfer();data.items.add(new frame.contentWindow.File([file],part+'.svg',{type:'image/svg+xml'}));const input=q('[data-upload="'+part+'"]');input.files=data.files;await input.onchange({target:input});}
 q('[data-view="family"]').click();
 for(const width of [1100,390]){
  frame.style.width=width+'px';await pause();
  const scroller=width===390?q('.guided-workspace'):q('main');
  scroller.scrollTop=350;const before=scroller.scrollTop;if(before<50)throw Error('Page pas assez longue');
  const key=q('[data-work-select]').dataset.workSelect;
  for(let i=0;i<2;i++){q('[data-work-select="'+key+'"]').closest('label').click();await pause();const current=(width===390?q('.guided-workspace'):q('main')).scrollTop;if(Math.abs(current-before)>1)throw Error('Scroll changé '+width+': '+before+' → '+current);}
  result.textContent+='\nPASS scroll stable '+width+'px';
 }
 q('[data-view="guideline"]').click();await wait(()=>q('[data-accent-enabled]'));
 q('[data-accent-enabled]').click();if(!q('[data-type-font="accent"]'))throw Error('Champ accent absent');
 result.textContent+='\nPASS formulaire réel accent';document.title='PASS scroll';
}catch(e){result.textContent+='\nFAIL '+e.stack;document.title='FAIL scroll'}
