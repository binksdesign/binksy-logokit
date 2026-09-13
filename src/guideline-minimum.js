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
  return p.brandGuideline.pages.flatMap(page=>{
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
