import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptSyntheticHistory} from '../src/history-adapter.mjs';
import {renderSyntheticHistory} from '../src/synthetic-host.mjs';
import {renderDashboard} from '../../health-presentation/src/index.mjs';
import {demo,inventedRecord} from '../examples/fixtures.mjs';
const input = records => ({profile:'synthetic_demo',records,selectedSnapshots:records.map(({recordId,snapshotId})=>({recordId,snapshotId}))});
const one = overrides => input([inventedRecord('test',overrides)]);
const points = h => h.model.groups.flatMap(g=>g.points);
const apply = overrides => adaptSyntheticHistory(one(overrides));
test('zero is an exact point and not missing',()=>assert.equal(points(apply({}))[0].result.value,0));
for (const comparator of ['<','>','<=','>=','≤','≥']) test(`comparator ${comparator} never becomes exact point`,()=>{
  const h=apply({valueRaw:`${comparator}5`,valueNumeric:5,resultType:'comparator',comparator});
  assert.equal(points(h).length,0); assert.equal(h.records[0].result,`${comparator}5`);
});
test('inconsistent exact type cannot override comparator',()=>assert.equal(points(apply({resultType:'exact',valueRaw:'<5',valueNumeric:5})).length,0));
test('explicit comparator without literal stays qualified',()=>{const h=apply({valueRaw:null,comparator:'<',valueNumeric:5});assert.equal(points(h).length,0);assert.match(h.records[0].result,/< 5/);});
test('qualitative cannot become zero even with supplied numeric value',()=>{const h=apply({resultType:'qualitative',valueRaw:'Não detectado',valueNumeric:0});assert.equal(points(h).length,0);assert.equal(h.records[0].result,'Não detectado');});
test('missing numeric value never manufactured',()=>assert.equal(points(apply({valueRaw:null,valueNumeric:null,resultType:'missing'})).length,0));
test('same display name with different codes creates separate groups',()=>{const h=adaptSyntheticHistory(input([inventedRecord('a'),inventedRecord('b',{biomarkerCode:'DEMO-B'})]));assert.equal(h.model.groups.length,2);});
test('same code with renamed display name retains code identity and raw names',()=>{const h=adaptSyntheticHistory(input([inventedRecord('a'),inventedRecord('b',{biomarkerName:'Outro nome',collectionDate:'2040-02-01'})]));assert.equal(h.model.groups.length,1);assert.equal(h.provenance[1].snapshot.biomarkerName,'Outro nome');});
test('units distinct literal values never convert or merge',()=>{const h=adaptSyntheticHistory(input(['u-demo','U-demo',' u-demo','outra'].map((unit,i)=>inventedRecord(String(i),{unit}))));assert.equal(h.model.groups.length,4);});
test('missing/null/empty units remain distinct in preserved data and groups',()=>{const absent=inventedRecord('absent');delete absent.unit;const h=adaptSyntheticHistory(input([absent,inventedRecord('null',{unit:null}),inventedRecord('empty',{unit:''})]));assert.equal(h.model.groups.length,3);assert.equal(points(h).length,0);assert.equal(Object.hasOwn(h.provenance[0].snapshot,'unit'),false);assert.equal(h.provenance[1].snapshot.unit,null);assert.equal(h.provenance[2].snapshot.unit,'');});
test('missing identity is isolated per original record and not charted',()=>{const h=adaptSyntheticHistory(input([inventedRecord('a',{biomarkerCode:null}),inventedRecord('b',{biomarkerCode:null})]));assert.equal(h.model.groups.length,2);assert.equal(points(h).length,0);});
test('duplicates preserve rows, sources and suppress inferred order/delta',()=>{const h=adaptSyntheticHistory(input([inventedRecord('a'),inventedRecord('b',{valueNumeric:2,valueRaw:'2'})]));assert.equal(h.records.length,2);assert.notEqual(h.provenance[0].snapshot.source.documentId,h.provenance[1].snapshot.source.documentId);assert.equal(h.model.groups[0].segments.length,0);assert.equal(h.model.groups[0].delta,null);});
for(const collectionDate of [null,'','2040-02-30','not-a-date']) test(`unknown date ${collectionDate} is table-only`,()=>{const h=apply({collectionDate});assert.equal(points(h).length,0);assert.equal(h.records.length,1);});
test('unknown date blocks connecting other known records',()=>{const h=adaptSyntheticHistory(input([inventedRecord('a'),inventedRecord('b',{collectionDate:'2040-02-01'}),inventedRecord('c',{collectionDate:null})]));assert.equal(h.model.groups[0].segments.length,0);assert.equal(h.model.groups[0].delta,null);});
for (const decision of ['PENDING','REJECT',null,'approve','']) test(`decision ${decision} never enters history`,()=>{const h=apply({review:{...inventedRecord('r').review,decision}});assert.equal(h.records.length,0);assert.equal(h.excluded[0].reason,'review_not_approved');});
test('rejected page blocks approved row',()=>assert.equal(apply({review:{...inventedRecord('r').review,pageDecision:'REJECT'}}).records.length,0));
test('unconfirmed association blocks approved row',()=>assert.equal(apply({review:{...inventedRecord('r').review,associationConfirmed:false}}).records.length,0));
test('missing source or review identities block history without fabrication',()=>{
  for(const key of ['documentId','pageNumber','associationLocation','sourceSha256','evidenceDigest','attemptId']) {const source={...inventedRecord('r').source};delete source[key];assert.equal(apply({source}).records.length,0);}
  for(const key of ['revisionVersion','reviewHash']) {const review={...inventedRecord('r').review};delete review[key];assert.equal(apply({review}).records.length,0);}
});
test('explicit corrected snapshot selected, old snapshot not silently reused',()=>{const h=adaptSyntheticHistory(demo);const r=h.provenance.find(p=>p.snapshot.recordId==='corrected');assert.equal(r.snapshot.snapshotId,'invented-corrected-current');assert.equal(r.snapshot.review.revisionVersion,'invented-v2');assert.equal(r.snapshot.valueRaw,'4.00');assert.ok(h.excluded.some(r=>r.snapshotId==='invented-corrected-old'&&r.reason==='not_selected'));});
test('selected pending revision never falls back to old approval',()=>{const old=inventedRecord('x'),current=inventedRecord('x',{snapshotId:'current',review:{decision:'PENDING'}});const data=input([old,current]);data.selectedSnapshots=[{recordId:'x',snapshotId:'current'}];assert.equal(adaptSyntheticHistory(data).records.length,0);});
test('no automatic latest selection, even if only one snapshot',()=>{const data=one({});data.selectedSnapshots=[];assert.equal(adaptSyntheticHistory(data).records.length,0);});
test('ambiguous, duplicate and unavailable snapshot selections fail closed',()=>{
  const data=one({});data.selectedSnapshots.push(data.selectedSnapshots[0]);assert.throws(()=>adaptSyntheticHistory(data));
  const dupe=one({});dupe.records.push(dupe.records[0]);assert.throws(()=>adaptSyntheticHistory(dupe));
  const absent=one({});absent.selectedSnapshots[0].snapshotId='nonexistent';assert.throws(()=>adaptSyntheticHistory(absent));
});
test('reference literal stays neutral; no min/max fabricated',()=>{const h=apply({refText:'ambíguo: consultar fonte'});assert.equal(h.records[0].reference,'ambíguo: consultar fonte');assert.equal(Object.hasOwn(h.provenance[0].snapshot,'refMin'),false);});
test('projection is detached, frozen and preserves all accepted source/review fields',()=>{const data=one({});const before=JSON.stringify(data);const h=adaptSyntheticHistory(data);assert.equal(JSON.stringify(data),before);assert.equal(JSON.stringify(h.provenance[0].snapshot),JSON.stringify(data.records[0]));data.records[0].source.documentId='changed';assert.notEqual(h.provenance[0].snapshot.source.documentId,'changed');assert.throws(()=>{h.provenance[0].snapshot.source.documentId='change';});});
test('actual public renderer output is embedded in host, with real adapter projection',()=>{const {history,html}=renderSyntheticHistory(demo);assert.ok(html.includes(renderDashboard({profile:'synthetic_demo',records:history.records})));assert.match(html,/history-point/);assert.match(html,/&lt;5/);assert.match(html,/4\.00/);assert.match(html,/invented-review-v2/);assert.doesNotMatch(html,/invented-corrected-old/);assert.equal((html.match(/<main /g)||[]).length,1);assert.equal((html.match(/id="conteudo"/g)||[]).length,1);});
test('host escapes injection in raw text, names and evidence',()=>{const data=one({valueRaw:'<img src=x onerror=alert(1)>',resultType:'qualitative',biomarkerName:'</h2><script>bad</script>',source:{...inventedRecord('r').source,documentId:'<svg onload=bad>'}});const {html}=renderSyntheticHistory(data);assert.doesNotMatch(html,/<script>|<img|<svg onload/);assert.match(html,/&lt;img/);});
test('real profile or unknown envelope cannot bypass synthetic gate',()=>{const data=one({});data.profile='real';assert.throws(()=>renderSyntheticHistory(data));const extra=one({});extra.patientId='real';assert.throws(()=>adaptSyntheticHistory(extra));});
test('accessors are rejected without execution',()=>{let called=false;const data=one({});Object.defineProperty(data.records[0],'unit',{get(){called=true;return 'u';},enumerable:true});assert.throws(()=>adaptSyntheticHistory(data));assert.equal(called,false);});
test('sparse arrays, undefined, nonfinite, prototypes, extra keys rejected',()=>{const inputs=[];const sparse=one({});sparse.records=new Array(1);inputs.push(sparse);const undef=one({unit:undefined});inputs.push(undef);inputs.push(one({valueNumeric:NaN}),one({valueNumeric:Infinity}),one({bad:'field'}));const proto=one({});Object.setPrototypeOf(proto.records[0],{spoof:true});inputs.push(proto);for(const data of inputs)assert.throws(()=>adaptSyntheticHistory(data));});
test('empty approved history is explicit empty state',()=>{const {history,html}=renderSyntheticHistory(input([]));assert.equal(history.records.length,0);assert.match(html,/Nenhum registro informado/);});

test('separate comparator remains visible when raw literal omits symbol',()=>{const h=apply({valueRaw:'5',valueNumeric:5,resultType:'comparator',comparator:'<'});assert.equal(points(h).length,0);assert.match(h.records[0].result,/Comparador </);assert.equal(h.provenance[0].snapshot.valueRaw,'5');});

for (const valueRaw of [null,'','UNKNOWN','Não detectado','5',' 0','0 ','0,0','0e0','00','0 mg','-','0.00000000000000000001']) test(`inconsistent exact literal ${valueRaw} cannot create a point`,()=>{const h=apply({valueRaw,valueNumeric:0,resultType:'exact'});assert.equal(points(h).length,0);assert.equal(h.provenance[0].snapshot.valueRaw,valueRaw);});
test('numeric 999 cannot override literal 5',()=>assert.equal(points(apply({valueRaw:'5',valueNumeric:999})).length,0));
test('absent raw field cannot create a point',()=>{const data=one({});delete data.records[0].valueRaw;assert.equal(points(adaptSyntheticHistory(data)).length,0);});
for(const [valueRaw,valueNumeric] of [['4.00',4],['+4.0',4],['-4.00',-4],['0.00',0],['-0.0',0],['1.25',1.25]]) test(`strict decimal agreement ${valueRaw} retains supplied numeric point`,()=>assert.equal(points(apply({valueRaw,valueNumeric}))[0].result.value,valueNumeric));
for(const [valueRaw,valueNumeric] of [['9007199254740993',9007199254740992],['1.0000000000000001',1],['0.0000001',1e-7],['1e+21',1e21]]) test(`precision/exponent ambiguity ${valueRaw} stays textual`,()=>assert.equal(points(apply({valueRaw,valueNumeric})).length,0));
for(const sentinel of ['UNKNOWN',' unknown ','N/A','null','Não informado','-','?']) test(`unknown identity/unit sentinel ${sentinel} cannot create a point`,()=>{assert.equal(points(apply({biomarkerCode:sentinel})).length,0);assert.equal(points(apply({unit:sentinel})).length,0);});
test('same unknown code cannot merge distinct original records',()=>{const h=adaptSyntheticHistory(input([inventedRecord('a',{biomarkerCode:'UNKNOWN'}),inventedRecord('b',{biomarkerCode:'UNKNOWN'})]));assert.equal(h.model.groups.length,2);assert.equal(points(h).length,0);});

test('nonempty qualitative conflicts with exact metadata and stays visible',()=>{const h=apply({valueQualitative:'Não detectado'});assert.equal(points(h).length,0);assert.match(h.records[0].result,/Não detectado/);assert.equal(h.provenance[0].snapshot.valueRaw,'0');});
