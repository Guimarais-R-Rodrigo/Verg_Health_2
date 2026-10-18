/** Independent presentation-only contract. All inputs must be invented synthetic data. */
import {createViewModel} from '../../health-presentation/src/index.mjs';
const own = (object, key) => Object.hasOwn(object, key);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
// Reserved absence sentinels in this synthetic contract, never usable identities/units.
const unknownSentinels = new Set(['UNKNOWN','N/A','NA','NULL','NONE','UNDEFINED','MISSING','NOT PROVIDED','NOT INFORMED','DESCONHECIDO','DESCONHECIDA','NÃO INFORMADO','NAO INFORMADO','NÃO INFORMADA','NAO INFORMADA','SEM UNIDADE','SEM CÓDIGO','SEM CODIGO','-','?']);
const known = value => nonempty(value) && !unknownSentinels.has(value.trim().toUpperCase());
// Comparison only: never derive a measurement. Restrict to ungrouped decimal
// literals that normalize exactly to the already-supplied number's decimal string.
function compatibleExactLiteral(raw, number) {
  if (typeof raw !== 'string' || typeof number !== 'number' || !Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER) return false;
  const canonical = value => {
    if (!/^[+-]?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
    let text = value.replace(/^\+/, '');
    if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '');
    return text === '-0' ? '0' : text;
  };
  const literal = canonical(raw), supplied = canonical(String(number));
  return literal !== null && supplied !== null && literal === supplied;
}
const fields = new Set(['recordId','snapshotId','biomarkerCode','biomarkerName','collectionDate','valueRaw','valueNumeric','resultType','comparator','valueQualitative','unit','refText','refMin','refMax','source','review']);
const sourceFields = new Set(['documentId','pageNumber','associationLocation','sourceSha256','evidenceDigest','attemptId']);
const reviewFields = new Set(['decision','pageDecision','associationConfirmed','revisionVersion','reviewHash']);
// Validate descriptors before reading values. This contract accepts plain JSON data only.
function clone(value, depth = 0) {
  if (depth > 8) throw new TypeError('Input too deep');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string' && value.length <= 512) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object') throw new TypeError('Plain finite JSON values required');
  const array = Array.isArray(value);
  if (array ? Object.getPrototypeOf(value) !== Array.prototype : ![Object.prototype,null].includes(Object.getPrototypeOf(value))) throw new TypeError('Plain JSON containers required');
  const keys = Reflect.ownKeys(value);
  if (array && (value.length > 10000 || keys.length !== value.length + 1)) throw new TypeError('Bounded dense array required');
  const result = array ? [] : Object.create(null);
  for (const key of keys) {
    if (array && key === 'length') continue;
    if (typeof key !== 'string' || (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) throw new TypeError('Invalid key');
    const descriptor = Object.getOwnPropertyDescriptor(value,key);
    if (!own(descriptor,'value')) throw new TypeError('Accessors forbidden');
    Object.defineProperty(result,key,{value:clone(descriptor.value,depth+1),enumerable:true,writable:true,configurable:true});
  }
  return result;
}
function shape(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.has(key))) throw new TypeError('Unexpected object fields');
}
function nullableString(value) { return value === null || typeof value === 'string'; }
function validateRecord(r) {
  shape(r,fields);
  if (!nonempty(r.recordId) || !nonempty(r.snapshotId)) throw new TypeError('Explicit record and snapshot identities required');
  for (const [key,value] of Object.entries(r)) {
    if (['source','review'].includes(key)) continue;
    if (['valueNumeric','refMin','refMax'].includes(key)) {
      if (value !== null && typeof value !== 'number') throw new TypeError('Numeric field must be finite number or null');
    } else if (!nullableString(value)) throw new TypeError('Literal fields must be strings or null');
  }
  shape(r.source,sourceFields); shape(r.review,reviewFields);
  for (const [key,value] of Object.entries(r.source)) {
    if (key === 'pageNumber') { if (value !== null && (!Number.isSafeInteger(value) || value < 1)) throw new TypeError('Invalid page'); }
    else if (!nullableString(value)) throw new TypeError('Source literal required');
  }
  for (const [key,value] of Object.entries(r.review)) {
    if (key === 'associationConfirmed') { if (typeof value !== 'boolean' && value !== null) throw new TypeError('Association boolean required'); }
    else if (!nullableString(value)) throw new TypeError('Review literal required');
  }
}
function freeze(value) { if(value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value; }
function state(r,key) {return own(r,key) ? [r[key] === null ? 'null' : 'value',r[key]] : ['absent'];}
const pair = r => JSON.stringify([r.recordId,r.snapshotId]);
function reason(r) {
  if (r.review.decision !== 'APPROVE') return 'review_not_approved';
  if (r.review.pageDecision !== 'APPROVE') return 'page_not_approved';
  if (r.review.associationConfirmed !== true) return 'association_not_confirmed';
  if (!nonempty(r.review.revisionVersion) || !nonempty(r.review.reviewHash)) return 'review_identity_missing';
  if (!['documentId','sourceSha256','evidenceDigest','attemptId','associationLocation'].every(key => nonempty(r.source[key])) || !Number.isSafeInteger(r.source.pageNumber)) return 'source_identity_missing';
  return null;
}
function displayResult(r, identifiable) {
  // Never parse raw/qualitative text or use a threshold as an exact measurement.
  const hasComparator = nonempty(r.comparator);
  const rawLooksLimited = typeof r.valueRaw === 'string' && /^\s*(?:[<>≤≥]=?)/.test(r.valueRaw);
  if (identifiable && known(r.unit) && r.resultType === 'exact' && !nonempty(r.valueQualitative) && !hasComparator && !rawLooksLimited && compatibleExactLiteral(r.valueRaw,r.valueNumeric)) return r.valueNumeric;
  if (hasComparator && nonempty(r.valueRaw) && !rawLooksLimited) return `Comparador ${r.comparator} · literal: ${r.valueRaw}`;
  if (nonempty(r.valueRaw) && nonempty(r.valueQualitative)) return `Literal: ${r.valueRaw} · qualitativo: ${r.valueQualitative}`;
  if (nonempty(r.valueRaw)) return r.valueRaw;
  if (nonempty(r.valueQualitative)) return r.valueQualitative;
  // A known threshold with no literal remains qualified, never numeric.
  if (hasComparator && typeof r.valueNumeric === 'number') return `${r.comparator} ${r.valueNumeric} · literal não informado`;
  if (r.resultType === 'exact' && typeof r.valueNumeric === 'number') return 'Literal ausente · resultado exato não elegível';
  return null;
}
export function adaptSyntheticHistory(input) {
  const data = clone(input);
  shape(data,new Set(['profile','records','selectedSnapshots']));
  if (data.profile !== 'synthetic_demo') throw new TypeError('Only synthetic_demo is supported');
  if (!Array.isArray(data.records) || !Array.isArray(data.selectedSnapshots)) throw new TypeError('Explicit records and snapshot selection required');
  const index = new Map();
  for (const r of data.records) {validateRecord(r); if(index.has(pair(r))) throw new TypeError('Duplicate snapshot identity'); index.set(pair(r),r);}
  const selected = new Set(), recordIds = new Set();
  for (const choice of data.selectedSnapshots) {
    shape(choice,new Set(['recordId','snapshotId']));
    if (!nonempty(choice.recordId) || !nonempty(choice.snapshotId) || !index.has(pair(choice))) throw new TypeError('Selection must identify an existing snapshot');
    if(recordIds.has(choice.recordId)) throw new TypeError('Only one explicitly selected snapshot per record');
    recordIds.add(choice.recordId); selected.add(pair(choice));
  }
  const records = [], provenance = [], excluded = [], series = new Map();
  for (const r of data.records) {
    const exclusion = selected.has(pair(r)) ? reason(r) : 'not_selected';
    if (exclusion) {excluded.push({recordId:r.recordId,snapshotId:r.snapshotId,reason:exclusion});continue;}
    const identifiable = known(r.biomarkerCode);
    const key = JSON.stringify([identifiable ? ['code',r.biomarkerCode] : ['unidentified',r.recordId,r.snapshotId],state(r,'unit')]);
    if (!series.has(key)) {
      const number = series.size + 1;
      series.set(key,{key,number,label:`${r.biomarkerName || 'Exame não informado'} · ${identifiable ? r.biomarkerCode : 'Código não informado'} · série ${number}`});
    }
    const group = series.get(key), rowNumber = records.length + 1;
    records.push({metric:group.label,date:r.collectionDate ?? '',result:displayResult(r,identifiable),unit:r.unit ?? '',reference:r.refText ?? '',source:`Registro ${rowNumber} · ${r.recordId} · snapshot ${r.snapshotId} · fonte ${r.source.documentId} · página ${r.source.pageNumber} · revisão ${r.review.revisionVersion}`});
    provenance.push({rowNumber,seriesKey:key,snapshot:r});
  }
  const model = createViewModel(records);
  return freeze({profile:'synthetic_demo',records,model,provenance,excluded});
}
