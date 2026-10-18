import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createViewModel,validDate,classifyResult,renderDashboard as renderExplicitDashboard} from '../src/index.mjs';
const renderDashboard=(records=[])=>renderExplicitDashboard({profile:'synthetic_demo',records});
const row=(overrides={})=>({metric:'Exame sintético',date:'2026-01-01',result:5,unit:'u',reference:'R1',source:'DEMO',...overrides});
test('exact, comparator, textual, missing and invalid are distinct',()=>{
 for (const value of ['<5','>5','≤5','>=5','<0,50']) {assert.equal(classifyResult(value).kind,'comparator');assert.equal(classifyResult(value).value,null);}
 for (const value of [null,undefined,'',' ']) assert.equal(classifyResult(value).kind,'missing');
 for (const value of [Infinity,NaN,{},false]) assert.equal(classifyResult(value).kind,'invalid');
 assert.equal(classifyResult('Negativo').kind,'text');assert.equal(classifyResult('5,2').kind,'text');assert.equal(classifyResult(0).value,0);
});
test('calendar validity, UNKNOWN and ambiguous dates',()=>{
 for (const date of ['UNKNOWN','2026-02-29','2026-02-30','2026-13-01','01/02/2026','2026-1-1',null]) assert.equal(validDate(date),null);
 assert.notEqual(validDate('2024-02-29'),null);
});
test('chronological exact records connect; inputs remain unchanged',()=>{
 const rows=[row({date:'2026-02-01',result:7}),row()];const before=JSON.stringify(rows);const g=createViewModel(rows).groups[0];
 assert.equal(g.segments.length,1);assert.equal(g.delta,2);assert.equal(g.points[0].date,'2026-01-01');assert.equal(JSON.stringify(rows),before);
});
test('invalid date never plotted; unknown chronology suppresses lines and delta',()=>{
 const g=createViewModel([row(),row({date:'UNKNOWN'}),row({date:'2026-03-01'})]).groups[0];assert.equal(g.points.length,2);assert.equal(g.segments.length,0);assert.equal(g.delta,null);
});
test('same-day duplicates shown without artificial sequencing',()=>{
 const g=createViewModel([row(),row({result:9}),row({date:'2026-03-01'})]).groups[0];assert.equal(g.points.length,3);assert.equal(g.segments.length,0);assert.equal(g.delta,null);assert.equal(g.duplicateDates.length,1);
});
test('comparators and missing break lines; do not silently connect across gaps',()=>{
 for (const value of ['<5',null,'Negativo']) {
 const g=createViewModel([row(),row({date:'2026-02-01',result:value}),row({date:'2026-03-01'})]).groups[0];assert.equal(g.points.length,2);assert.equal(g.segments.length,0);assert.equal(g.delta,null);
 }
});
test('units separate; missing unit cannot yield chart',()=>{
 const m=createViewModel([row(),row({unit:'v'}),row({unit:''})]);assert.equal(m.groups.length,3);assert.equal(m.groups[2].points.length,0);
});
test('references stay per-record and table retains missing and unknown',()=>{
 const html=renderDashboard([row(),row({date:'UNKNOWN',result:null,reference:'R2'})]);assert.match(html,/R1/);assert.match(html,/R2/);assert.match(html,/Não informado/);assert.match(html,/UNKNOWN/);
});
test('all user-originated display strings escaped',()=>{
 const payload='<img src=x onerror="alert(1)">';const html=renderDashboard([row({metric:payload,unit:payload,date:payload,result:payload,source:payload,reference:payload})]);assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);assert.ok(!html.includes('undefined'));
});
test('alternate fixtures render multiple independent groups',()=>{
 const html=renderDashboard([row({metric:'Alternativo A',result:12.5}),row({metric:'Alternativo B',result:'<5'})]);assert.match(html,/Alternativo A/);assert.match(html,/Alternativo B/);assert.match(html,/&lt;5/);assert.equal((html.match(/<circle /g)||[]).length,1);
});
test('very large finite values do not generate NaN/Infinity geometry',()=>{
 const html=renderDashboard([row({result:-1e308}),row({result:1e308,date:'2026-02-01'})]);assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));assert.ok(!html.includes('Diferença aritmética'));
});
test('empty input explicit and pure source has no runtime capabilities',async()=>{
 assert.match(renderDashboard(),/Nenhum registro/);const source=await readFile(new URL('../src/index.mjs',import.meta.url),'utf8');assert.doesNotMatch(source,/\b(?:import|fetch|XMLHttpRequest|localStorage|sessionStorage|document|window|process)\b/);
});
test('generated demonstration renders chart and table without scripts',async()=>{
 const html=await readFile(new URL('../examples/VergHealth-demo.html',import.meta.url),'utf8');assert.match(html,/<svg/);assert.match(html,/<table/);assert.doesNotMatch(html,/<script|https?:\/\/(?!www\.w3\.org)/);assert.match(html,/DADOS FICTÍCIOS/);
});
test('strict records reject foreign fields, accessors and non-plain inputs',()=>{
 for (const record of [null,1,[],new Date(),{...row(),patient:'not allowed'},{...row(),unit:4},{...row(),result:{value:5}}]) assert.throws(()=>createViewModel([record]),TypeError);
 const input=row();Object.defineProperty(input,'source',{get(){throw new Error('Getter executed');}});assert.throws(()=>createViewModel([input]),/accessors/);
 assert.doesNotThrow(()=>createViewModel([{}]));
});
test('ambiguous numeric strings never become exact points',()=>{
 for(const value of ['1.240','06-12','1,240.5','5','5,2']) {assert.equal(classifyResult(value).value,null);assert.equal(createViewModel([row({result:value})]).groups[0].points.length,0);}
});
test('input bounds reject oversized arrays and display fields',()=>{
 assert.throws(()=>createViewModel(Array(10001).fill(row())),RangeError);assert.throws(()=>createViewModel([row({source:'x'.repeat(2049)})]),RangeError);
});

test('generated CSS uses exact CSP hash and no style attributes',async()=>{
 const html=await readFile(new URL('../examples/VergHealth-demo.html',import.meta.url),'utf8');
 const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];const hash=createHash('sha256').update(css).digest('base64');
 assert.ok(html.includes(`style-src 'sha256-${hash}'`));assert.doesNotMatch(html,/unsafe-inline| style=/);
});

test('render entrypoint requires explicit strict synthetic-demo envelope',()=>{
 for(const input of [undefined,[],{}, {records:[]},{profile:'private',records:[]},{profile:'synthetic_demo'}, {profile:'synthetic_demo',records:[],extra:true}]) assert.throws(()=>renderExplicitDashboard(input),TypeError);
 const input={records:[]};Object.defineProperty(input,'profile',{get(){throw new Error('Getter executed');}});assert.throws(()=>renderExplicitDashboard(input),/accessors/);
 assert.match(renderExplicitDashboard({profile:'synthetic_demo',records:[]}),/Nenhum registro/);
});

test('record arrays reject holes, subclasses, own methods and getters',()=>{
 const sparse=Array(2);const method=[];method.map=()=>{throw new Error('Called map');};const symbol=[];symbol[Symbol('extra')]=true;
 class CustomArray extends Array {}
 for(const records of [sparse,method,symbol,new CustomArray()]) assert.throws(()=>createViewModel(records),TypeError);
 const getter=[row()];Object.defineProperty(getter,'0',{get(){throw new Error('Index getter executed');}});assert.throws(()=>createViewModel(getter),/accessors/);
});
