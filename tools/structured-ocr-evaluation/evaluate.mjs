/** Standalone, non-clinical measurement of synthetic structured records.
 * No parser, OCR, product import, network, database or promotion capability.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const VERSION = 'health-structured-evaluation-1';
export const CURRENT_CONTRACT = Object.freeze({appVersion:'3.2.2',
  sourceManifestSha256:'c0b32f28d73eb5d12c53b237e56f9593d1bb1cfd207f39018acf118fb9290ef1',
  structurerVersion:'geometry-0.3.0-health-v1', catalogVersion:'1.0.0-synthetic',
  runSchemaVersion:'1', draftSchemaVersion:'1.0.0'});
export const FIELDS = Object.freeze(['biomarkerCode', 'biomarkerName', 'collectionDate',
  'valueRaw', 'valueNumeric', 'resultType', 'valueQualitative', 'comparator',
  'unit', 'refText', 'refMin', 'refMax']);
const numeric = new Set(['valueNumeric', 'refMin', 'refMax']);
const own = (o, k) => Object.hasOwn(o, k);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const assert = (ok, code) => { if (!ok) fail(code); };
const object = o => o !== null && typeof o === 'object' && !Array.isArray(o);
const hash = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s);
const id = s => typeof s === 'string' && /^[A-Za-z0-9_.:-]{1,160}$/.test(s);
const nonempty = s => typeof s === 'string' && s.trim().length > 0;
const int = n => Number.isSafeInteger(n) && n >= 0;
const timestamp = s => typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().replace('.000Z','Z') === s.replace('.000Z','Z');
function keys(o, required, optional = [], code = 'INVALID_SHAPE') {
  assert(object(o) && required.every(k => own(o, k)) && Object.keys(o).every(k => [...required, ...optional].includes(k)), code);
}
function list(a, code = 'INVALID_LIST') { assert(Array.isArray(a) && a.length <= 10000, code); }
function unique(a, key, code) {
  const set = new Set();
  for (const item of a) { const value = key(item); assert(!set.has(value), code); set.add(value); }
}
export function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') { assert(Number.isFinite(value), 'NON_FINITE'); return JSON.stringify(value); }
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  assert(object(value), 'NON_JSON');
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
function pipeline(p) {
  keys(p, ['appVersion', 'sourceManifestSha256', 'structurerVersion', 'catalogVersion',
    'runSchemaVersion', 'draftSchemaVersion', 'effectiveConfigSha256', 'adapter', 'engines']);
  for (const k of ['appVersion', 'structurerVersion', 'catalogVersion', 'runSchemaVersion', 'draftSchemaVersion']) assert(nonempty(p[k]), 'PIPELINE_IDENTITY_MISSING');
  assert(hash(p.sourceManifestSha256) && hash(p.effectiveConfigSha256), 'PIPELINE_HASH_INVALID');
  assert(Object.entries(CURRENT_CONTRACT).every(([k,v])=>p[k]===v), 'UNSUPPORTED_PRODUCT_CONTRACT');
  keys(p.adapter, ['id', 'version']); assert(id(p.adapter.id) && nonempty(p.adapter.version), 'ADAPTER_IDENTITY_MISSING');
  list(p.engines); assert(p.engines.length > 0, 'ENGINE_IDENTITY_MISSING');
  unique(p.engines, e => e.id, 'DUPLICATE_ENGINE');
  for (const e of p.engines) {
    keys(e, ['id', 'version', 'models']); assert(id(e.id) && nonempty(e.version), 'ENGINE_IDENTITY_MISSING');
    list(e.models); unique(e.models, m => m.id, 'DUPLICATE_MODEL');
    for (const m of e.models) { keys(m, ['id', 'version', 'sha256']); assert(id(m.id) && nonempty(m.version) && hash(m.sha256), 'MODEL_IDENTITY_MISSING'); }
  }
}
function fieldType(field, value) {
  return value === null || (numeric.has(field) ? typeof value === 'number' && Number.isFinite(value) && (!Number.isInteger(value) || Number.isSafeInteger(value)) : typeof value === 'string');
}
function checkExpected(e) {
  keys(e, ['schemaVersion', 'suiteId', 'split', 'synthetic', 'truthOrigin', 'truthFrozenAt', 'pipeline', 'cases']);
  assert(e.schemaVersion === VERSION && id(e.suiteId) && e.synthetic === true, 'EXPECTED_IDENTITY_INVALID');
  assert(['developer_smoke', 'holdout'].includes(e.split) && timestamp(e.truthFrozenAt), 'EXPECTED_SPLIT_INVALID');
  assert(e.truthOrigin === (e.split === 'holdout' ? 'independent_manual' : 'manual_synthetic_developer'), 'TRUTH_ORIGIN_INVALID');
  pipeline(e.pipeline); list(e.cases); assert(e.cases.length > 0, 'EMPTY_EXPECTED_SUITE');
  unique(e.cases, c => c.caseId, 'DUPLICATE_EXPECTED_CASE');
  unique(e.cases, c => c.sourceSha256, 'DUPLICATE_EXPECTED_SOURCE');
  for (const c of e.cases) {
    keys(c, ['caseId', 'familyId', 'sourceSha256', 'expectedPages', 'records']);
    assert(id(c.caseId) && id(c.familyId) && hash(c.sourceSha256) && int(c.expectedPages) && c.expectedPages > 0 && c.expectedPages <= 200, 'EXPECTED_CASE_INVALID');
    list(c.records); assert(c.records.length > 0, 'EMPTY_TRUTH_RECORDS');
    unique(c.records, r => r.recordId, 'DUPLICATE_EXPECTED_RECORD');
    for (const r of c.records) {
      keys(r, ['recordId', 'pageNumber', 'fields']);
      assert(id(r.recordId) && int(r.pageNumber) && r.pageNumber > 0 && r.pageNumber <= c.expectedPages, 'EXPECTED_RECORD_INVALID');
      keys(r.fields, FIELDS, [], 'INCOMPLETE_OR_UNKNOWN_TRUTH_FIELD');
      for (const [field, cell] of Object.entries(r.fields)) {
        assert(object(cell), 'EXPECTED_CELL_INVALID');
        if (cell.state === 'unscored') { keys(cell, ['state', 'reason']); assert(nonempty(cell.reason), 'UNSCORED_REASON_REQUIRED'); }
        else {
          keys(cell, ['state', 'value']);
          assert(['value', 'absent'].includes(cell.state) && fieldType(field, cell.value), 'EXPECTED_CELL_INVALID');
          assert(cell.state === 'absent' ? cell.value === null : cell.value !== null && cell.value !== '', 'EXPECTED_ABSENCE_MUST_BE_EXPLICIT');
          if (cell.state === 'value' && field === 'comparator') assert(['=','<','<=','>','>='].includes(cell.value), 'EXPECTED_COMPARATOR_INVALID');
          if (cell.state === 'value' && field === 'resultType') assert(['NUMERIC','COMPARATOR','QUALITATIVE','UNPARSED'].includes(cell.value), 'EXPECTED_RESULT_TYPE_INVALID');
        }
      }
    }
  }
}
function checkRecords(records, pageLimit) {
  list(records); unique(records, r => r.recordId, 'DUPLICATE_RECORD_ID');
  unique(records, r => `${r.associationLocation?.groupIndex}:${r.associationLocation?.candidateIndex}`, 'DUPLICATE_ASSOCIATION_LOCATION');
  for (const r of records) {
    keys(r, ['recordId', 'pageNumber', 'associationLocation', 'values', 'review_decision'], ['confidence']);
    assert(id(r.recordId) && int(r.pageNumber) && r.pageNumber > 0 && r.pageNumber <= pageLimit, 'RECORD_IDENTITY_INVALID');
    keys(r.associationLocation, ['groupIndex', 'candidateIndex']);
    assert(int(r.associationLocation.groupIndex) && int(r.associationLocation.candidateIndex), 'ASSOCIATION_LOCATION_INVALID');
    keys(r.values, [], FIELDS, 'UNKNOWN_CANDIDATE_FIELD');
    for (const [field, value] of Object.entries(r.values)) assert(fieldType(field, value), 'CANDIDATE_FIELD_TYPE_INVALID');
    assert(['PENDING', 'APPROVE', 'REJECT'].includes(r.review_decision), 'REVIEW_DECISION_INVALID');
    if (own(r, 'confidence')) assert(r.confidence === null || typeof r.confidence === 'number' && Number.isFinite(r.confidence) && r.confidence >= 0 && r.confidence <= 100, 'CONFIDENCE_INVALID');
  }
}
function checkRegistry(e, registry) {
  keys(registry, ['schemaVersion', 'developerExposure', 'frozenHoldouts']);
  assert(registry.schemaVersion === VERSION, 'REGISTRY_VERSION_INVALID');
  list(registry.developerExposure); list(registry.frozenHoldouts);
  for (const r of registry.developerExposure) {
    keys(r, ['caseId', 'familyId', 'sourceSha256']); assert(id(r.caseId) && id(r.familyId) && hash(r.sourceSha256), 'EXPOSURE_IDENTITY_INVALID');
  }
  unique(registry.frozenHoldouts, r => r.suiteId, 'DUPLICATE_HOLDOUT_REGISTRATION');
  for (const r of registry.frozenHoldouts) {
    keys(r, ['suiteId', 'expectedSha256', 'pipelineSha256', 'custodianId', 'frozenAt', 'independent']);
    assert(id(r.suiteId) && hash(r.expectedSha256) && hash(r.pipelineSha256) && id(r.custodianId) && timestamp(r.frozenAt) && r.independent === true, 'HOLDOUT_REGISTRATION_INVALID');
  }
  if (e.split === 'holdout') {
    for (const c of e.cases) assert(!registry.developerExposure.some(x => x.caseId === c.caseId || x.familyId === c.familyId || x.sourceSha256 === c.sourceSha256), 'HOLDOUT_CONTAMINATION');
    const frozen = registry.frozenHoldouts.find(x => x.suiteId === e.suiteId);
    assert(frozen && frozen.expectedSha256 === digest(e) && frozen.pipelineSha256 === digest(e.pipeline) && Date.parse(frozen.frozenAt) >= Date.parse(e.truthFrozenAt), 'HOLDOUT_NOT_FROZEN');
  } else {
    for (const c of e.cases) assert(registry.developerExposure.some(x => x.caseId === c.caseId && x.familyId === c.familyId && x.sourceSha256 === c.sourceSha256), 'SMOKE_EXPOSURE_UNREGISTERED');
  }
}
function checkCandidate(e, a) {
  keys(a, ['schemaVersion', 'suiteId', 'synthetic', 'generatedAt', 'pipeline', 'runs']);
  assert(a.schemaVersion === VERSION && a.suiteId === e.suiteId && a.synthetic === true && timestamp(a.generatedAt), 'CANDIDATE_IDENTITY_INVALID');
  pipeline(a.pipeline); assert(digest(a.pipeline) === digest(e.pipeline), 'PIPELINE_MISMATCH');
  assert(Date.parse(a.generatedAt) >= Date.parse(e.truthFrozenAt), 'CANDIDATE_PRECEDES_TRUTH_FREEZE');
  list(a.runs); unique(a.runs, r => r.caseId, 'DUPLICATE_CANDIDATE_CASE');
  const attempts = new Set();
  const addAttempt = attemptId => { assert(id(attemptId) && !attempts.has(attemptId), 'ATTEMPT_ID_INVALID_OR_REUSED'); attempts.add(attemptId); };
  for (const run of a.runs) {
    keys(run, ['caseId', 'sourceSha256', 'attemptId', 'evidenceDigest', 'status', 'pages', 'records'], ['reviewed', 'comparison']);
    const expected = e.cases.find(c => c.caseId === run.caseId);
    assert(expected, 'UNKNOWN_CANDIDATE_CASE'); assert(run.sourceSha256 === expected.sourceSha256, 'SOURCE_IDENTITY_MISMATCH'); addAttempt(run.attemptId);
    assert(hash(run.evidenceDigest), 'EVIDENCE_DIGEST_MISSING');
    assert(['review_ready', 'partial', 'error', 'abstained', 'cancelled'].includes(run.status), 'RUN_STATE_INVALID');
    list(run.pages); unique(run.pages, p => p.pageNumber, 'DUPLICATE_PAGE');
    for (const p of run.pages) { keys(p, ['pageNumber', 'status']); assert(int(p.pageNumber) && p.pageNumber > 0 && p.pageNumber <= expected.expectedPages && ['completed', 'failed', 'pending', 'cancelled'].includes(p.status), 'PAGE_INVALID'); }
    if (run.status === 'review_ready') assert(run.pages.length === expected.expectedPages && run.pages.every(p => p.status === 'completed'), 'FALSE_COMPLETE_PAGE_COVERAGE');
    const completed = run.pages.filter(p => p.status === 'completed').length;
    if (run.status === 'partial') assert(completed > 0 && completed < expected.expectedPages, 'PARTIAL_PAGE_COVERAGE_INVALID');
    if (['error', 'abstained'].includes(run.status)) assert(completed === 0 && run.records.length === 0, 'ERROR_RUN_HAS_COMPLETED_OUTPUT');
    checkRecords(run.records, expected.expectedPages);
    for (const r of run.records) assert(run.pages.some(p => p.pageNumber === r.pageNumber && p.status === 'completed'), 'RECORD_ON_UNAVAILABLE_PAGE');
    if (run.reviewed) {
      const rev = run.reviewed; keys(rev, ['revisionVersion', 'reviewHash', 'evidenceDigest', 'elapsedMs', 'records']);
      assert(int(rev.revisionVersion) && rev.revisionVersion >= 1 && hash(rev.reviewHash) && rev.evidenceDigest === run.evidenceDigest, 'REVIEW_PROVENANCE_INVALID');
      assert(rev.elapsedMs === null || typeof rev.elapsedMs === 'number' && Number.isFinite(rev.elapsedMs) && rev.elapsedMs >= 0, 'REVIEW_TIME_INVALID');
      checkRecords(rev.records, expected.expectedPages);
      for (const r of rev.records) {
        const prior = run.records.find(x => x.recordId === r.recordId);
        if (prior) assert(r.pageNumber === prior.pageNumber && digest(r.associationLocation) === digest(prior.associationLocation), 'REVIEW_REWROTE_SOURCE_ASSOCIATION');
      }
    }
    if (run.comparison) {
      const secondary = run.comparison; keys(secondary, ['attemptId', 'sourceSha256', 'pipeline', 'records']);
      addAttempt(secondary.attemptId); assert(secondary.sourceSha256 === run.sourceSha256, 'COMPARISON_SOURCE_MISMATCH');
      pipeline(secondary.pipeline); checkRecords(secondary.records, expected.expectedPages);
    }
  }
}
const counter = () => ({expectedValues: 0, expectedAbsences: 0, unscored: 0, correctValues: 0, correctAbsences: 0,
  missingFields: 0, abstainedValues: 0, wrongValues: 0, wrongAbsences: 0, wrongAssociation: 0, notMeasured: 0});
const ratio = (n, d) => ({numerator: n, denominator: d, value: d ? n / d : null});
function tenShift(expected, actual) {
  if (typeof expected !== 'number' || typeof actual !== 'number' || !expected || !actual || Math.sign(expected) !== Math.sign(actual)) return false;
  const power = Math.log10(Math.abs(actual / expected));
  return Number.isInteger(power) && power !== 0 && actual / expected === 10 ** power;
}
function measure(e, a, stage) {
  const totals = counter(), byField = Object.fromEntries(FIELDS.map(f => [f, counter()]));
  const out = {totals, byField, recordsExpected: 0, recordsMatched: 0, recordsMissing: 0, recordsNotMeasured: 0,
    extraRecords: 0, documentsNotMeasured: 0, recordsWithAnyMismatch: 0, recordsWithAllScoredFieldsCorrect: 0,
    numericPowerOfTenMismatches: 0, mismatches: []};
  for (const c of e.cases) {
    const run = a.runs.find(r => r.caseId === c.caseId);
    const unavailable = stage === 'reviewed' && !run?.reviewed;
    if (unavailable) out.documentsNotMeasured++;
    const records = stage === 'reviewed' ? run?.reviewed?.records ?? [] : run?.records ?? [];
    out.extraRecords += records.filter(r => !c.records.some(t => t.recordId === r.recordId)).length;
    for (const truth of c.records) {
      out.recordsExpected++;
      const record = records.find(r => r.recordId === truth.recordId);
      if (unavailable) out.recordsNotMeasured++; else if (record) out.recordsMatched++; else out.recordsMissing++;
      let bad = false, scored = 0;
      for (const field of FIELDS) {
        const cell = truth.fields[field], counts = byField[field];
        const inc = key => { totals[key]++; counts[key]++; };
        if (cell.state === 'unscored') { inc('unscored'); continue; }
        scored++;
        inc(cell.state === 'value' ? 'expectedValues' : 'expectedAbsences');
        let outcome;
        if (unavailable) outcome = 'notMeasured';
        else if (!record || !own(record.values, field)) outcome = 'missingFields';
        else if (record.pageNumber !== truth.pageNumber) outcome = 'wrongAssociation';
        else if (record.values[field] === cell.value) outcome = cell.state === 'value' ? 'correctValues' : 'correctAbsences';
        else if (cell.state === 'value' && (record.values[field] === null || record.values[field] === '')) outcome = 'abstainedValues';
        else outcome = cell.state === 'value' ? 'wrongValues' : 'wrongAbsences';
        inc(outcome);
        if (!['correctValues', 'correctAbsences'].includes(outcome)) {
          bad = true; out.mismatches.push({caseId: c.caseId, recordId: truth.recordId, field, outcome});
          if (outcome === 'wrongValues' && numeric.has(field) && tenShift(cell.value, record.values[field])) out.numericPowerOfTenMismatches++;
        }
      }
      if (bad) out.recordsWithAnyMismatch++;
      else if (scored) out.recordsWithAllScoredFieldsCorrect++;
    }
  }
  out.exactValueRecall = ratio(totals.correctValues, totals.expectedValues);
  out.explicitAbsenceMatch = ratio(totals.correctAbsences, totals.expectedAbsences);
  return out;
}
function agreement(e, a) {
  const result = {documentsWithComparison: 0, jointlyPresentScoredFields: 0, sameCorrectFields: 0,
    sameWrongFields: 0, sameAbstentions: 0, bothMissingFields: 0, oneMissingField: 0, differentFields: 0,
    associationMismatchFields: 0, unscoredFields: 0};
  for (const c of e.cases) {
    const run = a.runs.find(r => r.caseId === c.caseId); if (!run?.comparison) continue;
    result.documentsWithComparison++;
    for (const truth of c.records) {
      const p = run.records.find(r => r.recordId === truth.recordId);
      const s = run.comparison.records.find(r => r.recordId === truth.recordId);
      for (const field of FIELDS) {
        const cell = truth.fields[field]; if (cell.state === 'unscored') { result.unscoredFields++; continue; }
        const hasP = p && own(p.values, field), hasS = s && own(s.values, field);
        if (!hasP && !hasS) { result.bothMissingFields++; continue; }
        if (!hasP || !hasS) { result.oneMissingField++; continue; }
        if (p.pageNumber !== truth.pageNumber || s.pageNumber !== truth.pageNumber) { result.associationMismatchFields++; continue; }
        result.jointlyPresentScoredFields++;
        if (p.values[field] !== s.values[field]) result.differentFields++;
        else if (p.values[field] === cell.value) result.sameCorrectFields++;
        else if (cell.state === 'value' && [null, ''].includes(p.values[field])) result.sameAbstentions++;
        else result.sameWrongFields++;
      }
    }
  }
  result.falseAgreementFraction = ratio(result.sameWrongFields,
    result.sameCorrectFields + result.sameWrongFields);
  return result;
}
function workload(e, a) {
  const out = {documentsWithReview: 0, documentsWithoutReview: 0, initialPendingRecords: 0, latestSnapshotPendingRecords: 0,
    reviewedApprove: 0, reviewedReject: 0, reviewedPending: 0, correctionFieldEdits: 0,
    recordsAddedDuringReview: 0, recordsRemovedDuringReview: 0, elapsedMsRecorded: 0,
    documentsWithTiming: 0, documentsWithoutTiming: 0};
  for (const c of e.cases) {
    const run = a.runs.find(r => r.caseId === c.caseId);
    out.initialPendingRecords += (run?.records ?? []).filter(r => r.review_decision === 'PENDING').length;
    out.latestSnapshotPendingRecords += (run?.reviewed?.records ?? run?.records ?? []).filter(r => r.review_decision === 'PENDING').length;
    if (!run?.reviewed) { out.documentsWithoutReview++; continue; }
    const rev = run.reviewed; out.documentsWithReview++;
    if (rev.elapsedMs === null) out.documentsWithoutTiming++;
    else { out.documentsWithTiming++; out.elapsedMsRecorded += rev.elapsedMs; }
    out.recordsRemovedDuringReview += run.records.filter(r => !rev.records.some(t => t.recordId === r.recordId)).length;
    for (const r of rev.records) {
      out[{APPROVE:'reviewedApprove', REJECT:'reviewedReject', PENDING:'reviewedPending'}[r.review_decision]]++;
      const prior = run.records.find(x => x.recordId === r.recordId);
      if (!prior) { out.recordsAddedDuringReview++; continue; }
      for (const f of FIELDS) if (own(prior.values, f) !== own(r.values, f) || prior.values[f] !== r.values[f]) out.correctionFieldEdits++;
    }
  }
  return out;
}
export function evaluate(expected, candidate, registry) {
  // Validate before computing any denominator or reporting a result.
  checkExpected(expected); checkRegistry(expected, registry); checkCandidate(expected, candidate);
  if (expected.split === 'holdout') assert(Date.parse(registry.frozenHoldouts.find(r => r.suiteId === expected.suiteId).frozenAt) <= Date.parse(candidate.generatedAt), 'HOLDOUT_REGISTERED_AFTER_RUN');
  const pageCoverage = {expected: 0, completed: 0, failed: 0, pending: 0, cancelled: 0, missing: 0};
  for (const c of expected.cases) {
    pageCoverage.expected += c.expectedPages;
    const run = candidate.runs.find(r => r.caseId === c.caseId);
    for (let n = 1; n <= c.expectedPages; n++) { const p = run?.pages.find(p => p.pageNumber === n); pageCoverage[p ? p.status : 'missing']++; }
  }
  return {schemaVersion: VERSION, suiteId: expected.suiteId, split: expected.split,
    qualification: 'NOT_QUALIFIED_FOR_CLINICAL_OR_PRODUCTION_OCR',
    evidenceKind: 'synthetic_structured_record_comparison_only',
    acceptanceDecision: 'NOT_DEFINED_NO_NUMERICAL_RELEASE_TARGET',
    truthSha256: digest(expected), candidateSha256: digest(candidate), pipelineSha256: digest(candidate.pipeline), registrySha256: digest(registry),
    identity: candidate.pipeline, pageCoverage, extracted: measure(expected, candidate, 'extracted'),
    reviewed: candidate.runs.some(r => r.reviewed) ? measure(expected, candidate, 'reviewed') : null,
    agreement: agreement(expected, candidate), reviewWorkload: workload(expected, candidate),
    limitations: ['No OCR inference or source-document decoding.', 'Record alignment is externally adjudicated; stable IDs do not prove correct association.',
      'Exact strings and finite IEEE-754 JSON numbers only; no normalization, tolerance, conversion or medical interpretation. Unsafe integers are rejected; decimal spelling/precision belongs to literal fields.',
      'Hashes and split declarations are integrity metadata, not authenticated independence or provenance.',
      'Confidence and review decisions never establish correctness.', 'No product-schema validation, review authorization, promotion or sidecar validation.']};
}
/** Valid JSON plus duplicate-key detection; never parse clinical content. */
export function parseJson(bytes) {
  assert(bytes.byteLength <= 4 * 1024 * 1024, 'INPUT_TOO_LARGE');
  const text = new TextDecoder('utf-8', {fatal:true}).decode(bytes);
  const value = JSON.parse(text), stack = [];
  for (let i=0; i<text.length; i++) {
    const ch=text[i];
    if (ch==='{') stack.push(new Set());
    else if (ch==='[') stack.push(null);
    else if (ch==='}' || ch===']') stack.pop();
    else if (ch==='"') {
      const start=i;
      while (++i<text.length) { if(text[i]==='\\') i++; else if(text[i]==='"') break; }
      let next=i+1; while (/\s/.test(text[next]??'') && next<text.length) next++;
      if(text[next]===':') {
        const key=JSON.parse(text.slice(start,i+1)), seen=stack.at(-1);
        assert(seen && !seen.has(key),'DUPLICATE_JSON_KEY'); seen.add(key);
      }
    }
    assert(stack.length<=40,'JSON_DEPTH_LIMIT');
  }
  return value;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assert(process.argv.length === 5, 'USAGE_EXPECTED_CANDIDATE_REGISTRY');
    const load = p => parseJson(readFileSync(p));
    console.log(JSON.stringify(evaluate(load(process.argv[2]), load(process.argv[3]), load(process.argv[4])), null, 2));
  } catch (error) {
    // Fixed error codes only: do not print input records, paths, or parser text.
    console.error(JSON.stringify({status: 'NOT_SCORED', code: error.code || 'INVALID_JSON_OR_INPUT', qualification: 'NOT_QUALIFIED'}));
    process.exitCode = 2;
  }
}
