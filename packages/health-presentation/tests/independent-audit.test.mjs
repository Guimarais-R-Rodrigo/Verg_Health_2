import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createViewModel, renderDashboard as renderSynthetic, validDate, classifyResult } from '../src/index.mjs';
import { records } from '../examples/fixtures.mjs';
import { inspectStaticHtml, deepFreeze } from './independent-html-checks.mjs';
const renderDashboard = records => renderSynthetic({profile:'synthetic_demo',records});
const row = (overrides = {}) => ({ metric:'Série alternativa', date:'2024-01-01', result:2, unit:'u-demo', reference:'Faixa fictícia A', source:'EXEMPLO-A', ...overrides });

test('independent: emitted page has static content, local assets, coherent ids and restrictive CSP', async () => {
  const html = await readFile(new URL('../examples/VergHealth-demo.html', import.meta.url), 'utf8');
  const report = inspectStaticHtml(html);
  assert.equal(report.scriptBlocks, 0);
  assert.match(html, /<table[ >]/);
  assert.match(html, /<circle /);
  assert.match(html, /Dados sintéticos|DADOS FICTÍCIOS/);
});
test('independent: supplied visual reference is unchanged', async () => {
  const bytes = await readFile(new URL('../reference/VergHealth-proposal-v4.html', import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b00ab5d1dbb513e3bd5b7d2ca7a95dae0a09f52d7639565b9e9dac43507390a8');
});
test('independent: deterministic rendering of frozen input without modifying records', () => {
  const fixture=deepFreeze(structuredClone(records));
  const before=JSON.stringify(fixture);
  assert.equal(renderDashboard(fixture), renderDashboard(fixture));
  assert.equal(JSON.stringify(fixture), before);
});
test('independent: alternate dataset has no names, metrics or sources left over from demo', () => {
  const html=renderDashboard([row({result:12.25}),row({date:'2024-01-03',result:'<15',source:'EXEMPLO-B',reference:'Faixa fictícia B'})]);
  for (const record of records) {
    assert.ok(!html.includes(record.metric));
    assert.ok(!html.includes(record.source));
  }
  assert.match(html, /Série alternativa/); assert.match(html, /EXEMPLO-B/);
  assert.match(html, /Faixa fictícia A/); assert.match(html, /Faixa fictícia B/);
  assert.equal((html.match(/<circle /g)||[]).length,1);
});
test('independent: all dynamic text stays text, including attribute quotes and closing tags', () => {
  const text='MARCA <b data-x="valor"> & \'texto\' </style></script>';
  const html=renderDashboard([row({metric:text,unit:text,reference:text,source:text,date:text,result:text})]);
  assert.ok(!html.includes('<b data-x'));
  assert.ok(!html.includes('</style>'));
  assert.ok(!html.includes('</script>'));
  assert.match(html,/&lt;b data-x=&quot;valor&quot;&gt;/);
  assert.match(html,/&amp;/); assert.match(html,/&#39;texto&#39;/);
});
test('independent: X distances represent real calendar spacing, not array index', () => {
  const html=renderDashboard([row(),row({date:'2024-01-02',result:3}),row({date:'2024-01-11',result:4})]);
  const xs=[...html.matchAll(/<circle[^>]+cx="([^"]+)"/g)].map(m=>Number(m[1]));
  assert.equal(xs.length,3); assert.equal(xs[0],65); assert.equal(xs[1],112); assert.equal(xs[2],535);
});
test('independent: zero remains a value, absent/unitless/UNKNOWN values do not become zero points', () => {
  const model=createViewModel([row({result:0}),row({date:'UNKNOWN',result:3}),row({date:'2024-01-03',result:null}),row({unit:'',result:8})]);
  assert.equal(model.groups[0].points.length,1); assert.equal(model.groups[0].points[0].result.value,0);
  assert.equal(model.groups[0].segments.length,0); assert.equal(model.groups[0].delta,null);
  assert.equal(model.groups[1].points.length,0);
  assert.match(renderDashboard([row({result:null})]), /Não informado/);
});
test('independent: invalid dates do not normalize into a different calendar day', () => {
  for (const date of ['2024-04-31','2023-02-29','2026-00-10','2026-01-00','UNKNOWN','2026-10-18T12:00:00Z']) assert.equal(validDate(date),null);
  assert.notEqual(validDate('2024-02-29'),null);
});
test('independent: exact-unit separation, duplicate dates and inequality operators retain semantics', () => {
  const model=createViewModel([row(),row({result:9}),row({unit:'U-DEMO',result:4}),row({date:'2024-01-04',result:'≤ 7,5'})]);
  assert.equal(model.groups.length,2); assert.equal(model.groups[0].delta,null); assert.equal(model.groups[0].segments.length,0);
  assert.equal(model.groups[0].rows.length,3); assert.equal(model.groups[0].points.length,2);
  for (const value of ['< 0,5','>3','<=4','>=9','≤ 7,5','≥2']) {
    assert.equal(classifyResult(value).kind,'comparator'); assert.equal(classifyResult(value).value,null);
  }
});

test('independent: numeric-looking and ambiguous strings never turn into exact clinical points', () => {
  for (const value of ['1.240','1,240','06-12','1,240.5','12,25','12.25','0','-2']) {
    assert.equal(classifyResult(value).kind,'text'); assert.equal(classifyResult(value).value,null);
    const model=createViewModel([row({result:value})]); assert.equal(model.groups[0].points.length,0);
    assert.match(renderDashboard([row({result:value})]), /Sem valores exatos/);
  }
});
test('independent: public input rejects extra fields, accessors and non-plain records before executing them', () => {
  let calls=0;
  const accessor=Object.defineProperty({},'metric',{enumerable:true,get(){calls++;return 'not allowed';}});
  for (const value of [null,[],new Date(),row({extra:'omitted'}),accessor,Object.assign(Object.create({}),row())]) assert.throws(()=>createViewModel([value]));
  assert.equal(calls,0);
});

test('independent: current build matches checked-in example and refuses output replacement',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'health-independent-'));
 try{
  const target=join(directory,'demo.html'),script=fileURLToPath(new URL('../examples/build-demo.mjs',import.meta.url));
  execFileSync(process.execPath,[script,'--out',target]);
  const html=await readFile(target,'utf8'),example=await readFile(new URL('../examples/VergHealth-demo.html',import.meta.url),'utf8');
  assert.equal(html,example);
  inspectStaticHtml(html);
  const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.ok(html.includes(`style-src 'sha256-${createHash('sha256').update(css).digest('base64')}'`));
  assert.throws(()=>execFileSync(process.execPath,[script,'--out',target],{stdio:'pipe'}));
  assert.equal(await readFile(target,'utf8'),html);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('independent: page cannot label undeclared/private input synthetic and never runs profile getters',()=>{
 for(const value of [undefined,null,records,{records},{profile:'private',records},{profile:'synthetic_demo',records,extra:'value'}])assert.throws(()=>renderSynthetic(value));
 let calls=0;const value={records};Object.defineProperty(value,'profile',{enumerable:true,get(){calls++;return 'synthetic_demo';}});
 assert.throws(()=>renderSynthetic(value));assert.equal(calls,0);
});

test('independent: collection accessors and overridden iteration never execute during model validation',()=>{
 let calls=0;
 const accessor=[];Object.defineProperty(accessor,'0',{enumerable:true,get(){calls++;return row();}});
 const method=[row()];Object.defineProperty(method,'map',{value(){calls++;return [];}});
 for(const value of [accessor,method,Array(1)])assert.throws(()=>createViewModel(value));
 assert.equal(calls,0);
});
