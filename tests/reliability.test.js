import test from 'node:test';import assert from 'node:assert/strict';
import opentype from 'opentype.js';import {glyphPathData} from '../src/glyph-path.js';
import {chatCompletion,parseCompletion,acknowledgeTool,PROVIDERS} from '../src/ai-providers.js';
import {project} from '../src/model.js';import {page,validateGuide} from '../src/guideline-model.js';
import {pageElements} from '../src/guideline-layout.js';import {prepareGuide} from '../src/guideline-config.js';
import {pageTheme} from '../src/guideline-theme.js';import {proposalProject} from '../src/ai-agent.js';
const tool={name:'propose_changes',parameters:{type:'object'}};
const reply=x=>({ok:true,text:async()=>JSON.stringify(x)});
test('AI retries empty and truncated transactions once, parses text parts and never exposes partial actions',async()=>{
 let calls=0;const r=await chatCompletion(PROVIDERS.openai,'test','','model','system',[],null,async()=>reply(++calls===1?{choices:[{message:{content:''}}]}:{choices:[{message:{content:[{type:'text',text:'Réponse complète'}]},finish_reason:'stop'}]}));
 assert.equal(calls,2);assert.equal(r.text,'Réponse complète');
 calls=0;await assert.rejects(chatCompletion(PROVIDERS.openai,'test','','model','system',[],tool,async()=>{calls++;return reply({choices:[{finish_reason:'length',message:{tool_calls:[{function:{name:tool.name,arguments:'{"actions":['}}]}}]});}),/limite de sortie/);assert.equal(calls,2);
 await assert.rejects(chatCompletion(PROVIDERS.anthropic,'test','','model','system',[],null,async()=>reply({content:[]})),/aucune réponse exploitable/);
 assert.throws(()=>parseCompletion({candidates:[{finishReason:'SAFETY'}]},'gemini'),/interrompu/);
 assert.equal(parseCompletion({content:[{type:'text',text:'Long '.repeat(3000)}],stop_reason:'end_turn'},'anthropic').text.length,15000);
});
test('tool-only result is acknowledged and final readable answer returned',async()=>{
 const r=await chatCompletion(PROVIDERS.openai,'test','','model','',[],tool,async()=>reply({choices:[{message:{content:null,tool_calls:[{id:'call',function:{name:tool.name,arguments:JSON.stringify({message:'',actions:[]})}}]},finish_reason:'tool_calls'}]}));
 const final=await acknowledgeTool(r,'pending',async(url,init)=>{const body=JSON.parse(init.body);assert.equal(body.messages.at(-1).role,'tool');return reply({choices:[{message:{content:'Proposition disponible.'}}]});});assert.equal(final.text,'Proposition disponible.');
});
const fixture=()=>{const p=project();p.assets.icon={box:{x:0,y:0,width:50,height:50},roles:[{id:'paint',paint:'#181818',locked:false}],paints:['#181818']};p.enabled=['icon'];p.colors=[{id:'dark',name:'Encre',hex:'#181818'},{id:'light',name:'Craie',hex:'#efeee8'}];prepareGuide(p);p.brandGuideline.pages=[page('clearspace')];return p;};
test('palette contrast follows background, manual choices and Auto survive round trip',()=>{
 const p=fixture(),g=p.brandGuideline,a=g.pages[0];a.background='#181818';
 assert.equal(pageTheme(p,a).text,'#efeee8');assert.equal(pageTheme(p,a).muted,'#efeee8');
 const light=pageElements(p,a).find(e=>e.type==='logo');assert.equal(light.guideColor,'#efeee8');
 a.styles[light.id]={colorId:'original'};a.settings={text:'#181818'};assert.equal(pageElements(p,a).find(e=>e.type==='logo').colorId,'original');assert.equal(pageTheme(p,a).text,'#181818');
 a.styles[light.id].colorId='auto';a.settings.text='auto';g.customColorRoles=['Support éditorial'];g.palette[0].role='Support éditorial';g.accentTypography={enabled:true};g.typography.accent={font:'',size:9};
 p.brandGuideline=validateGuide(JSON.parse(JSON.stringify(g)));const restored=p.brandGuideline;
 assert.equal(restored.pages[0].styles[light.id].colorId,'auto');assert.equal(restored.pages[0].settings.text,'auto');assert.equal(restored.accentTypography.enabled,true);assert.deepEqual(restored.customColorRoles,['Support éditorial']);
 restored.pages[0].background='#efeee8';assert.equal(pageTheme(p,restored.pages[0]).text,'#181818');
});
test('new guide properties are atomic AI proposals and current-page scope blocks document fields',()=>{
 const p=fixture(), actions=[{type:'addColorRole',name:'Editorial'},{type:'updatePaletteRole',id:'dark',role:'Editorial'},{type:'updateAccentTypography',values:{enabled:true,font:''}},{type:'updatePageSettings',pageId:p.brandGuideline.pages[0].id,values:{text:'auto'}}];
 const next=proposalProject(p,{message:'Proposition',actions},{scope:'document'});assert.equal(next.brandGuideline.accentTypography.enabled,true);assert.equal(p.brandGuideline.accentTypography.enabled,false);assert.equal(next.brandGuideline.palette[0].role,'Editorial');
 assert.throws(()=>proposalProject(p,{message:'',actions},{scope:'currentPage',pageId:p.brandGuideline.pages[0].id}),/portée/);
});
test('complex glyph serialization avoids call-stack overflow without dropping contours',()=>{
 const path=new opentype.Path();for(let i=0;i<130000;i++){path.moveTo(i,0);path.lineTo(i+1,1);path.close();}
 assert.throws(()=>path.toPathData(3),RangeError);
 const data=glyphPathData(path);assert.equal((data.match(/M/g)||[]).length,130000);assert.equal((data.match(/Z/g)||[]).length,130000);
});
