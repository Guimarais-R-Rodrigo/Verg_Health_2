import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluate, digest, FIELDS, parseJson, CURRENT_CONTRACT } from '../evaluate.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../fixtures/smoke/${name}.json`, import.meta.url), 'utf8'));
const inputs = () => [read('expected'), read('candidate'), read('registry')];
const check = mutate => { const x = inputs(); mutate(...x); return evaluate(...x); };
const rejects = (mutate, code) => assert.throws(() => check(mutate), e => e.code === code);
function perfect(e, a) {
  a.runs = e.cases.map((c, i) => ({caseId:c.caseId, sourceSha256:c.sourceSha256,
    attemptId:`test-attempt-${i}`, evidenceDigest:'a'.repeat(64), status:'review_ready',
    pages:Array.from({length:c.expectedPages}, (_, j) => ({pageNumber:j+1,status:'completed'})),
    records:c.records.map((r,j) => ({recordId:r.recordId,pageNumber:r.pageNumber,
      associationLocation:{groupIndex:0,candidateIndex:j},review_decision:'PENDING',
      values:Object.fromEntries(Object.entries(r.fields).filter(([,v])=>v.state!=='unscored').map(([k,v])=>[k,v.value]))}))}));
}
test('smoke exposes wrong values, omissions, power-of-ten changes and false agreement', () => {
  const r = evaluate(...inputs());
  assert.equal(r.extracted.recordsExpected,4); assert.equal(r.extracted.recordsMissing,1);
  assert.equal(r.extracted.totals.expectedValues + r.extracted.totals.expectedAbsences,47);
  assert.equal(r.extracted.totals.unscored,1); assert.equal(r.extracted.numericPowerOfTenMismatches,2);
  assert.equal(r.extracted.byField.unit.missingFields,2);
  assert.equal(r.extracted.byField.comparator.wrongValues,1);
  assert.equal(r.extracted.byField.collectionDate.wrongValues,1);
  assert.equal(r.extracted.byField.valueNumeric.abstainedValues,1);
  assert.equal(r.agreement.sameWrongFields,5); assert.equal(r.agreement.sameCorrectFields,7);
  assert.equal(r.pageCoverage.missing,1);
  assert.equal(r.reviewWorkload.correctionFieldEdits,5);
  assert.equal(r.reviewWorkload.documentsWithTiming,0);
  assert.equal(r.reviewWorkload.documentsWithoutTiming,1);
  assert.equal(r.reviewed.documentsNotMeasured,3);
  assert.equal(r.reviewed.totals.notMeasured,35);
  assert.equal(r.qualification,'NOT_QUALIFIED_FOR_CLINICAL_OR_PRODUCTION_OCR');
});
test('a perfect synthetic projection measures exact recall, never qualification', () => {
  const r=check(perfect); assert.equal(r.extracted.exactValueRecall.value,1);
  assert.equal(r.extracted.explicitAbsenceMatch.value,1); assert.equal(r.extracted.totals.unscored,1);
  assert.equal(r.reviewed,null); assert.equal(r.agreement.falseAgreementFraction.value,null);
  assert.equal(r.acceptanceDecision,'NOT_DEFINED_NO_NUMERICAL_RELEASE_TARGET');
});
test('empty output retains every expected denominator and every missing page', () => {
  const r=check((e,a)=>{a.runs=[];});
  assert.equal(r.extracted.totals.missingFields,47);assert.equal(r.extracted.recordsMissing,4);
  assert.equal(r.extracted.exactValueRecall.value,0);assert.equal(r.pageCoverage.missing,4);
});
test('missing null-valued fields are omissions, never correct absence', () => {
  const r=check((e,a)=>{perfect(e,a);delete a.runs[0].records[0].values.valueQualitative;});
  assert.equal(r.extracted.byField.valueQualitative.missingFields,1);
  assert.equal(r.extracted.byField.valueQualitative.correctAbsences,2);
});
test('zero is a value, null and missing are not zero', () => {
  const p=check(perfect);assert.equal(p.extracted.byField.valueNumeric.correctValues,3);
  const n=check((e,a)=>{perfect(e,a);a.runs[2].records[0].values.valueNumeric=null;});
  assert.equal(n.extracted.byField.valueNumeric.abstainedValues,1);
  const m=check((e,a)=>{perfect(e,a);delete a.runs[2].records[0].values.valueNumeric;});
  assert.equal(m.extracted.byField.valueNumeric.missingFields,1);
});
test('exact UTF-8-oriented strings: no micro-unit, whitespace or decimal text normalization', () => {
  for(const [field,value] of [['unit','μg/L'],['valueRaw','1.25'],['valueRaw','1,250'],['refText','0,50 a 2,00 ']]) {
    const r=check((e,a)=>{perfect(e,a);a.runs[0].records[0].values[field]=value;});
    assert.equal(r.extracted.byField[field].wrongValues,1);
  }
});
test('numbers use strict equality, not epsilon; textual precision measured separately', () => {
  const r=check((e,a)=>{perfect(e,a);a.runs[0].records[0].values.valueNumeric=1.25000000000001;});
  assert.equal(r.extracted.byField.valueNumeric.wrongValues,1);
  assert.equal(r.extracted.byField.valueRaw.correctValues,4);
});
test('a missing truth field or unknown candidate field cannot disappear silently', () => {
  rejects(e=>{delete e.cases[0].records[0].fields.unit;},'INCOMPLETE_OR_UNKNOWN_TRUTH_FIELD');
  rejects((e,a)=>{a.runs[0].records[0].values.newUnit='mg';},'UNKNOWN_CANDIDATE_FIELD');
});
test('unscored truth requires a reason and does not count as correct', () => {
  rejects(e=>{e.cases[0].records[0].fields.unit={state:'unscored',reason:''};},'UNSCORED_REASON_REQUIRED');
  const r=check((e,a)=>{perfect(e,a);e.cases[0].records[0].fields.unit={state:'unscored',reason:'Not adjudicated'};});
  assert.equal(r.extracted.byField.unit.unscored,1);assert.equal(r.extracted.byField.unit.correctValues,2);
});
test('duplicate candidate and truth record identities are rejected', () => {
  rejects((e,a)=>{a.runs[0].records.push(structuredClone(a.runs[0].records[0]));},'DUPLICATE_RECORD_ID');
  rejects(e=>{e.cases[0].records.push(structuredClone(e.cases[0].records[0]));},'DUPLICATE_EXPECTED_RECORD');
});
test('duplicate original locations with different IDs cannot double count', () => {
  rejects((e,a)=>{const r=structuredClone(a.runs[0].records[0]);r.recordId='extra';a.runs[0].records.push(r);},'DUPLICATE_ASSOCIATION_LOCATION');
});
test('unmatched candidate record counted as extra, not matched by value/name', () => {
  const r=check((e,a)=>{perfect(e,a);a.runs[0].records[0].recordId='unmapped-row';});
  assert.equal(r.extracted.extraRecords,1);assert.equal(r.extracted.recordsMissing,1);
  assert.equal(r.extracted.totals.missingFields,12);
});
test('wrong page association prevents correct values from receiving credit', () => {
  const r=check((e,a)=>{e.cases[0].expectedPages=2;perfect(e,a);a.runs[0].records[0].pageNumber=2;});
  assert.equal(r.extracted.totals.wrongAssociation,12);
  assert.equal(r.extracted.recordsWithAllScoredFieldsCorrect,3);
});
test('record on failed or missing page cannot be scored', () => {
  rejects((e,a)=>{a.runs[0].status='cancelled';a.runs[0].pages[0].status='failed';},'RECORD_ON_UNAVAILABLE_PAGE');
});
test('false complete, incoherent partial and error output are rejected', () => {
  rejects((e,a)=>{a.runs[0].pages=[];},'FALSE_COMPLETE_PAGE_COVERAGE');
  rejects((e,a)=>{a.runs[0].status='partial';},'PARTIAL_PAGE_COVERAGE_INVALID');
  rejects((e,a)=>{a.runs[0].status='error';},'ERROR_RUN_HAS_COMPLETED_OUTPUT');
});
test('unknown source, suite, run and reused attempt identities block scoring', () => {
  rejects((e,a)=>{a.runs[0].sourceSha256='f'.repeat(64);},'SOURCE_IDENTITY_MISMATCH');
  rejects((e,a)=>{a.suiteId='different';},'CANDIDATE_IDENTITY_INVALID');
  rejects((e,a)=>{a.runs[0].caseId='unknown';},'UNKNOWN_CANDIDATE_CASE');
  rejects((e,a)=>{a.runs[1].attemptId=a.runs[0].attemptId;},'ATTEMPT_ID_INVALID_OR_REUSED');
  rejects((e,a)=>{a.runs[0].comparison.attemptId=a.runs[0].attemptId;},'ATTEMPT_ID_INVALID_OR_REUSED');
});
test('missing engine metadata and version changes do not produce accuracy scores', () => {
  rejects((e,a)=>{a.pipeline.engines=[];},'ENGINE_IDENTITY_MISSING');
  rejects((e,a)=>{a.pipeline.structurerVersion='1.2.0-synthetic';},'UNSUPPORTED_PRODUCT_CONTRACT');
  rejects((e,a)=>{a.pipeline.effectiveConfigSha256='b'.repeat(64);},'PIPELINE_MISMATCH');
  rejects((e,a)=>{delete a.pipeline.adapter;},'INVALID_SHAPE');
});
test('comparison missing field, matching null, and both missing never become agreement correctness', () => {
  const r=check((e,a)=>{
    a.runs[0].records[0].values.valueNumeric=null;a.runs[0].comparison.records[0].values.valueNumeric=null;
    delete a.runs[0].records[0].values.unit;delete a.runs[0].comparison.records[0].values.unit;
    delete a.runs[0].comparison.records[0].values.comparator;
  });
  assert.equal(r.agreement.sameAbstentions,1);assert.equal(r.agreement.bothMissingFields,1);
  assert.equal(r.agreement.oneMissingField,1);assert.equal(r.agreement.sameWrongFields,3);
});
test('confidence changes never change scoring, review decisions never certify truth', () => {
  const [e,a,g]=inputs(), baseline=evaluate(e,a,g);
  for(const run of a.runs)for(const r of run.records){r.confidence=0;r.review_decision='APPROVE';}
  const changed=evaluate(e,a,g);
  assert.deepEqual(changed.extracted,baseline.extracted);assert.deepEqual(changed.agreement,baseline.agreement);
});
test('review evidence mismatch and remapping original associations are rejected', () => {
  rejects((e,a)=>{a.runs[0].reviewed.evidenceDigest='b'.repeat(64);},'REVIEW_PROVENANCE_INVALID');
  rejects((e,a)=>{a.runs[0].reviewed.records[0].associationLocation.candidateIndex=1;},'REVIEW_REWROTE_SOURCE_ASSOCIATION');
});
test('selectively reviewed cases retain other cases as not measured, not correct', () => {
  const r=evaluate(...inputs()); assert.equal(r.reviewed.recordsNotMeasured,3);
  assert.equal(r.reviewed.recordsWithAllScoredFieldsCorrect,1);
  assert.equal(r.reviewed.exactValueRecall.denominator,r.extracted.exactValueRecall.denominator);
  assert.ok(r.reviewed.exactValueRecall.value<1);
});
test('zero review time recorded separately from absent timing', () => {
  const r=check((e,a)=>{a.runs[0].reviewed.elapsedMs=0;});
  assert.equal(r.reviewWorkload.documentsWithTiming,1);assert.equal(r.reviewWorkload.elapsedMsRecorded,0);
});
test('numeric strings and nonfinite numbers are rejected, no coercion', () => {
  rejects((e,a)=>{a.runs[0].records[0].values.valueNumeric='1.25';},'CANDIDATE_FIELD_TYPE_INVALID');
  rejects((e,a)=>{a.runs[0].records[0].values.valueNumeric=NaN;},'CANDIDATE_FIELD_TYPE_INVALID');
});
function holdout(e,g) {
  e.split='holdout';e.truthOrigin='independent_manual';g.developerExposure=[];
  g.frozenHoldouts=[{suiteId:e.suiteId,expectedSha256:digest(e),pipelineSha256:digest(e.pipeline),custodianId:'external-reviewer',frozenAt:e.truthFrozenAt,independent:true}];
}
test('relabelling smoke as holdout is blocked by exposure registry', () => {
  rejects((e,a,g)=>{const exposure=g.developerExposure;holdout(e,g);g.developerExposure=exposure;},'HOLDOUT_CONTAMINATION');
});
test('family variants and renamed identical bytes are contaminated', () => {
  for(const field of ['familyId','sourceSha256','caseId'])rejects((e,a,g)=>{
    holdout(e,g);g.developerExposure=[{caseId:'other',familyId:'other',sourceSha256:'b'.repeat(64),[field]:e.cases[0][field]}];
  },'HOLDOUT_CONTAMINATION');
});
test('holdout requires exact frozen truth, pipeline and pre-run registration', () => {
  rejects((e,a,g)=>{holdout(e,g);e.cases[0].records[0].fields.valueNumeric.value=9;},'HOLDOUT_NOT_FROZEN');
  rejects((e,a,g)=>{holdout(e,g);g.frozenHoldouts=[];},'HOLDOUT_NOT_FROZEN');
  rejects((e,a,g)=>{holdout(e,g);g.frozenHoldouts[0].frozenAt='2026-10-18T11:00:00Z';},'HOLDOUT_REGISTERED_AFTER_RUN');
});
test('registry declarations can make input admissible but never prove blindness/qualification', () => {
  const r=check((e,a,g)=>holdout(e,g));assert.equal(r.split,'holdout');
  assert.equal(r.qualification,'NOT_QUALIFIED_FOR_CLINICAL_OR_PRODUCTION_OCR');
  assert.ok(r.limitations.some(x=>x.includes('not authenticated independence')));
});
test('evaluation does not mutate input artifacts', () => {
  const values=inputs(), before=structuredClone(values);evaluate(...values);assert.deepEqual(values,before);
});
test('count partitions reconcile for both measured layers', () => {
  const r=evaluate(...inputs());
  for(const layer of [r.extracted,r.reviewed])for(const c of [layer.totals,...Object.values(layer.byField)]) {
    const outcomes=['correctValues','correctAbsences','missingFields','abstainedValues','wrongValues','wrongAbsences','wrongAssociation','notMeasured'];
    assert.equal(outcomes.reduce((n,k)=>n+c[k],0),c.expectedValues+c.expectedAbsences);
  }
  assert.equal(FIELDS.length,12);
});
test('matching unsupported versions cannot evade contract pins',()=>{
  rejects((e,a)=>{e.pipeline.appVersion='999';a.pipeline.appVersion='999';},'UNSUPPORTED_PRODUCT_CONTRACT');
  const lock=JSON.parse(readFileSync(new URL('../contract-lock.json',import.meta.url)));
  assert.equal(CURRENT_CONTRACT.sourceManifestSha256,lock.files.find(f=>f.path==='PUBLICATION_MANIFEST.json').sha256);
});
test('timestamps reject calendar rollover and candidates before truth freeze',()=>{
  rejects((e,a)=>{a.generatedAt='2026-02-30T10:00:00Z';},'CANDIDATE_IDENTITY_INVALID');
  rejects((e,a)=>{a.generatedAt='2026-10-17T10:00:00Z';},'CANDIDATE_PRECEDES_TRUTH_FREEZE');
});
test('unsafe integers and duplicate JSON keys cannot silently lose information',()=>{
  rejects((e,a)=>{a.runs[0].records[0].values.valueNumeric=9007199254740992;},'CANDIDATE_FIELD_TYPE_INVALID');
  for(const s of ['{"a":1,"a":2}','{"a":1,"\\u0061":2}','{"x":[{"a":1,"a":2}]}']) assert.throws(()=>parseJson(Buffer.from(s)),e=>e.code==='DUPLICATE_JSON_KEY');
  assert.deepEqual(parseJson(Buffer.from('{"x":[{"a":"brace } quote \\\" colon :"},{"a":2}]}')),{x:[{a:'brace } quote " colon :'},{a:2}]});
  assert.throws(()=>parseJson(Buffer.from([0xff])),TypeError);
});
test('initial and latest snapshot pending counts are distinguished',()=>{
  const r=evaluate(...inputs());assert.equal(r.reviewWorkload.initialPendingRecords,3);
  assert.equal(r.reviewWorkload.latestSnapshotPendingRecords,2);
});
test('ground truth comparators are symbolic and result types use current contract enums',()=>{
  rejects(e=>{e.cases[0].records[0].fields.comparator.value='equals';},'EXPECTED_COMPARATOR_INVALID');
  rejects(e=>{e.cases[0].records[0].fields.resultType.value='NUMBER';},'EXPECTED_RESULT_TYPE_INVALID');
  const r=check((e,a)=>{perfect(e,a);a.runs[0].records[0].values.comparator='equals';});
  assert.equal(r.extracted.byField.comparator.wrongValues,1);
});
