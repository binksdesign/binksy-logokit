import { paginateMinimumPages } from "../src/guideline-minimum.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { project, History, layout } from '../src/model.js';
import { prepareGuide, generateGuide } from '../src/guideline-config.js';
import { validateGuide } from '../src/guideline-model.js';
import { editorialPage } from '../src/guideline-editorial.js';
import { ProposalSession, proposalProject } from '../src/ai-agent.js';
import { framing, rasterTargets } from '../src/export-formats.js';
import { chatCompletion, PROVIDERS, listModels } from '../src/ai-providers.js';
const fixture = () => {
 const p=project();
 const role={id:'paint-black',paint:'#000000',name:'Noir',targets:[{index:1,prop:'fill'}],locked:false};
 p.assets={icon:{box:{x:0,y:0,width:100,height:100},roles:[role]},wordmark:{box:{x:0,y:0,width:300,height:80},roles:[structuredClone(role)]}};
 p.colors=[{id:'black',name:'Noir',hex:'#000000'},{id:'white',name:'Blanc',hex:'#ffffff'},{id:'blue',name:'Bleu Acier',hex:'#464c67'}];
 prepareGuide(p);generateGuide(p);return p;
};
test('Use-case framing stays independent across variants, colours and dimensions',()=>{
 const e={width:3000,height:3000,rasterFormats:['web-3000','story','profile'],framing:{story:.8},variantFraming:{story:{horizontal:.65,icon:.2},profile:{horizontal:.9}}};
 assert.equal(framing(e,'story','horizontal'),.65);assert.equal(framing(e,'story','icon'),.2);assert.equal(framing(e,'story','vertical'),.8);assert.equal(framing(e,'profile','horizontal'),.9);
 assert.equal(rasterTargets(e,'horizontal').find(t=>t.id==='story').scale,.65);
 assert.equal(rasterTargets(e,'icon').find(t=>t.id==='story').scale,.2);
 assert.deepEqual(rasterTargets(e,'horizontal').filter(t=>t.kind==='web').map(t=>[t.width,t.height,t.scale]),[[3000,3000,.8],[3000,3000,.8]]);
});
test('Current-page scope rejects wrong IDs, document globals and source edits',()=>{
 const p=fixture(),[a,b]=p.brandGuideline.pages,scope={scope:'currentPage',pageId:a.id};
 for(const action of [{type:'updatePageSettings',pageId:b.id,values:{background:'#000000'}},{type:'globalColors',values:{background:'#000000'}},{type:'minimum',print:25,digital:120},{type:'brand',value:'wrong'},{type:'updateLogoOccurrences',occurrences:[{pageId:b.id,elementId:'cover-logo',colorId:'white'}]}]) assert.throws(()=>proposalProject(p,{message:'x',actions:[action]},scope));
 const next=proposalProject(p,{message:'x',actions:[{type:'updatePageSettings',pageId:a.id,values:{background:'#000000',title:'Nouveau'}}]},scope);
 assert.equal(next.brandGuideline.pages[0].background,'#000000');assert.deepEqual(next.brandGuideline.pages[1],b);assert.deepEqual(next.assets,p.assets);
 assert.throws(()=>proposalProject(p,{message:'x',actions:[{type:'updatePageSettings',pageId:a.id,values:{background:'#ff00ff'}}]},scope));
});
test('Multi-action proposals are temporary, pinned to their original scope and undo as one transaction',()=>{
 const p=fixture(),a=p.brandGuideline.pages[0],before=structuredClone(p),session=new ProposalSession(),history=new History();
 session.propose(p,{message:'Deux réglages',actions:[{type:'updatePageSettings',pageId:a.id,values:{background:'#000000'}},{type:'updatePageElement',pageId:a.id,elementId:'cover-brand',values:{text:'Titre',fill:'#ffffff'}}]},{scope:'currentPage',pageId:a.id});
 assert.deepEqual(p,before);session.apply(p,fn=>{history.push(p);fn();});assert.equal(p.brandGuideline.pages[0].background,'#000000');assert.deepEqual(history.undo(p),before);
 session.propose(p,{message:'x',actions:[]},{scope:'document'});p.brand='Changed';assert.throws(()=>session.apply(p,fn=>fn()),/changé/);
});
test('All logo occurrences use real colour descriptors; invented variants are rejected',()=>{
 const p=fixture(),a=p.brandGuideline.pages.find(a=>a.type==='logos'),els=editorialPage(p,a,0).filter(e=>e.type==='logo');
 const occurrences=els.map(e=>({pageId:a.id,elementId:e.id,variant:e.variant,colorId:'white'}));
 const next=proposalProject(p,{message:'Blanc',actions:[{type:'updateLogoOccurrences',occurrences}]},{scope:'document'});
 for(const e of els)assert.equal(next.brandGuideline.pages.find(q=>q.id===a.id).styles[e.id].colorId,'white');
 assert.throws(()=>proposalProject(p,{message:'x',actions:[{type:'updateLogoOccurrences',occurrences:[{...occurrences[0],colorId:'invented'}]}]},{scope:'document'}));
});
test('Minimum artwork uses exact print mm and digital px without normalization',()=>{
 const p=fixture();
 for(const [v,mm,px] of [['horizontal',25,120],['vertical',20,100],['icon',8,24],['wordmark',18,90]]) {
  Object.assign(p.compositions[v],{minPrint:mm,minDigital:px});
  const a={type:'minimum',variants:[v],title:'',settings:{},styles:{},elements:[]};
  const logos=editorialPage(p,a,0).filter(e=>e.type==='logo'),l=layout(p,v);
  assert.equal(logos[0].w,mm*72/25.4);assert.equal(logos[1].w,px*.75);
  for(const e of logos)assert.ok(Math.abs(e.h/e.w-l.height/l.width)<1e-8);
 }
});
test('Guide choices, hidden associations and page/element settings survive serialization',()=>{
 const p=fixture(),g=p.brandGuideline,a=g.pages[0];a.logoColors={horizontal:'white'};a.disabled=true;a.styles['cover-logo']={colorId:'white',hidden:true,panX:.2,zoom:2};g.pairs['black:white']={allowed:false,hidden:true,manual:true};
 const restored=validateGuide(JSON.parse(JSON.stringify(g)),p.mode);
 assert.deepEqual(restored.pages[0].logoColors,a.logoColors);assert.equal(restored.pages[0].disabled,true);assert.equal(restored.pages[0].styles['cover-logo'].colorId,'white');assert.equal(restored.pairs['black:white'].hidden,true);
});
test('OpenRouter transports image parts, authenticates, requests tools, and exposes model capabilities',async()=>{
 let request;
 const fetcher=async(url,o)=>{request={url,...o,body:JSON.parse(o.body||'null')};return {ok:true,text:async()=>JSON.stringify({choices:[{message:{content:'Proposition',tool_calls:[{id:'c',function:{name:'propose_changes',arguments:'{"message":"Prêt","actions":[]}'}}]}}]})};};
 const parts=[{type:'text',text:'Analyse'},{type:'image_url',image_url:{url:'data:image/png;base64,AAAA'}}];
 const result=await chatCompletion(PROVIDERS.openrouter,'synthetic-test-key','','test-model','System',[{role:'user',content:parts}],{name:'propose_changes',parameters:{type:'object'}},fetcher);
 assert.equal(request.url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(request.headers.Authorization,'Bearer synthetic-test-key');assert.deepEqual(request.body.messages[1].content,parts);assert.equal(request.body.stream,false);assert.equal(result.proposal.message,'Prêt');
 const models=await listModels(PROVIDERS.openrouter,'','',async()=>({ok:true,text:async()=>JSON.stringify({data:[{id:'vision',architecture:{input_modalities:['text','image']},supported_parameters:['tools']}]})}));
 assert.equal(models[0].vision,true);assert.equal(models[0].tools,true);
});

test('Minimum examples paginate without scaling when source dimensions need more room',()=>{
 const p=fixture(); p.brandGuideline.format='16:9';
 for(const v of p.enabled)Object.assign(p.compositions[v],{minPrint:40,minDigital:200});
 const page=p.brandGuideline.pages.find(a=>a.type==='minimum'); page.variants=[...p.enabled];
 p.brandGuideline.pages=[page];
 const pages=paginateMinimumPages(p); assert.ok(pages.length>1);
 assert.deepEqual(pages.flatMap(a=>a.variants),p.enabled);
 for(const a of pages)for(const e of editorialPage(p,a,0).filter(e=>e.type==='logo'))assert.equal(e.w,e.id.includes('print')?40*72/25.4:150);
});

test('Chat can add and remove guide elements and configure guide exports without source changes',()=>{
 const p=fixture(),pageId=p.brandGuideline.pages[0].id,scope={scope:'currentPage',pageId};
 const added=proposalProject(p,{message:'Texte',actions:[{type:'addPageElement',pageId,elementType:'text',values:{text:'Une identité',fill:'#ffffff'}}]},scope);
 const element=added.brandGuideline.pages[0].elements.at(-1);assert.equal(element.text,'Une identité');assert.deepEqual(added.assets,p.assets);
 const removed=proposalProject(added,{message:'Retirer',actions:[{type:'removePageElement',pageId,elementId:element.id}]},scope);assert.equal(removed.brandGuideline.pages[0].elements.length,p.brandGuideline.pages[0].elements.length);
 assert.throws(()=>proposalProject(p,{message:'x',actions:[{type:'updateGuideExports',values:{svg:false}}]},scope));
 const exported=proposalProject(p,{message:'x',actions:[{type:'updateGuideExports',values:{svg:false,text:'paths'}}]},{scope:'document'});assert.equal(exported.brandGuideline.exports.svg,false);assert.deepEqual(exported.exports,p.exports);
});
