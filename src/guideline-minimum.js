import { finalPalette } from "./guideline-config.js";
import { layout } from './model.js';
import { dimensions, pageTheme } from './guideline-theme.js';

// Physical widths are immutable. Only the space between examples and page breaks change.
export function minimumRows(p, page) {
  const {width,height}=dimensions(p.brandGuideline), margin=pageTheme(p,page).margin;
  const contentWidth=width-2*margin;
  const rows=(page.variants.length?page.variants:p.enabled).filter(v=>layout(p,v).parts.length).map(variant=>{
    const box=layout(p,variant), c=p.compositions[variant];
    const print=c.minPrint*72/25.4, digital=c.minDigital*.75;
    const ph=print*box.height/box.width, dh=digital*box.height/box.width;
    const stacked=print+digital+24>contentWidth*.73;
    return {variant, print, digital, ph, dh, stacked,
      height:stacked ? 94+ph+dh : 64+Math.max(ph,dh)};
  });
  return {rows,margin,contentWidth,top:margin+92,available:height-2*margin-116};
}
export function minimumGroups(p,page) {
  const {rows,available}=minimumRows(p,page), groups=[];
  let used=0, group=[];
  for(const row of rows) {
    if(group.length && used+row.height>available){groups.push(group);group=[];used=0;}
    group.push(row.variant);used+=row.height;
  }
  if(group.length)groups.push(group);
  return groups;
}
export function paginateMinimumPages(p) {
  const ids=new Set(p.brandGuideline.pages.map(page=>page.id));
  return paginateContentPages(p).flatMap(page=>{
    if(page.type!=='minimum')return [page];
    const groups=minimumGroups(p,page);
    if(groups.length<2)return [page];
    return groups.map((variants,i)=>{
      let id=page.id;
      if(i){let suffix=i+1;do{id=`${page.id}-part-${suffix++}`;}while(ids.has(id));ids.add(id);}
      return {...structuredClone(page),id,variants,
      generatedKey:page.generatedKey ? page.generatedKey+(i?`-part-${i+1}`:'') : '',
      elements:i?[]:page.elements};});
  });
}

export function pairCapacity(p) {
  const {width,height}=dimensions(p.brandGuideline), m=pageTheme(p,{}).margin;
  return Math.max(1, Math.floor((width-2*m)/175)) * Math.max(1,Math.floor((height-2*m-116)/100));
}
export function hierarchyGroups(p) {
  return [['title','subtitle','heading','body','small','caption',...(p.brandGuideline.accentTypography?.enabled?['accent']:[])]];
}
function paginateContentPages(p) {
  const pages=p.brandGuideline.pages, result=[];
  for(const page of pages) {
    if(page.paginationRoot && pages.some(root=>root.id===page.paginationRoot)) continue;
    if(!['pairs','accessibility','hierarchy'].includes(page.type)){result.push(page);continue;}
    const groups=page.type==='hierarchy'?hierarchyGroups(p):Array.from({length:Math.max(1,Math.ceil(finalPalette(p).length**2/pairCapacity(p)))},(_,i)=>i);
    const siblings=pages.filter(a=>a.id===page.id || a.paginationRoot===page.id);
    const sharedStyles=Object.assign({},...siblings.map(a=>a.styles));
    if(page.type==='hierarchy'){
      result.push({...structuredClone(page),hierarchyRoles:groups[0],styles:structuredClone(sharedStyles),elements:siblings.flatMap(a=>structuredClone(a.elements))});
      continue;
    }
    const lastCustom=siblings.reduce((last,a,i)=>a.elements.length?Math.max(last,i):last,0);
    while(groups.length<=lastCustom)groups.push(page.type==='hierarchy'?[]:groups.length);
    groups.forEach((group,i)=>{
      const id=i?`${page.id}-content-${i+1}`:page.id;
      const previous=pages.find(a=>a.id===id);
      result.push({...structuredClone(previous || page),id,paginationRoot:i?page.id:undefined,
        styles:structuredClone(sharedStyles),
        pairOffset:page.type==='hierarchy'?0:i*pairCapacity(p),
        hierarchyRoles:page.type==='hierarchy'?group:undefined,
        generatedKey:i?`${page.generatedKey || page.id}-content-${i+1}`:page.generatedKey,
        elements:previous?.elements || (i?[]:page.elements)});
    });
  }
  return result;
}
