/** Verg Health: pure, read-only presentation. No parsing of clinical documents. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}
export function classifyResult(value) {
  if (value === null || value === undefined || value === '') return {kind:'missing', label:'Não informado', value:null};
  if (typeof value === 'number') return Number.isFinite(value) ? {kind:'exact',label:String(value),value} : {kind:'invalid',label:'Valor inválido',value:null};
  if (typeof value !== 'string') return {kind:'invalid',label:'Valor inválido',value:null};
  const label = value.trim();
  if (!label) return {kind:'missing',label:'Não informado',value:null};
  if (/^(?:<=|>=|<|>|≤|≥)\s*[+-]?\d+(?:[.,]\d+)?$/.test(label)) return {kind:'comparator',label,value:null};
  return {kind:'text',label,value:null};
}
const plain = value => typeof value === 'string' ? value : '';
/** Records are display inputs, never diagnoses. Units are matched exactly; no conversion. */
export function createViewModel(records = []) {
  if (!Array.isArray(records) || Object.getPrototypeOf(records)!==Array.prototype) throw new TypeError('records must be a plain array');
  const arrayKeys=Reflect.ownKeys(records);
  if(arrayKeys.length!==records.length+1) throw new TypeError('records must be dense without extra fields');
  for(const key of arrayKeys) {
    if(key==='length') continue;
    if(typeof key!=='string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key)>=records.length) throw new TypeError('Unexpected array field');
    if(!('value' in Object.getOwnPropertyDescriptor(records,key))) throw new TypeError('Array accessors are not supported');
  }
  if (records.length>10000) throw new RangeError('At most 10000 demonstration records are supported');
  const allowed = new Set(['metric','date','result','unit','reference','source']);
  const rows = records.map((record, index) => {
    if (!record || typeof record !== 'object' || ![Object.prototype,null].includes(Object.getPrototypeOf(record))) throw new TypeError('Each record must be a plain object');
    for (const key of Reflect.ownKeys(record)) {
      if (!allowed.has(key)) throw new TypeError('Unexpected record field');
      const descriptor=Object.getOwnPropertyDescriptor(record,key);
      if (!('value' in descriptor)) throw new TypeError('Record accessors are not supported');
      const value=descriptor.value;
      if (typeof value==='string' && value.length>2048) throw new RangeError('Display fields must not exceed 2048 characters');
      if (key==='result') {
        if (value!==null && value!==undefined && !['string','number'].includes(typeof value)) throw new TypeError('Unsupported result type');
      } else if (value!==undefined && typeof value!=='string') throw new TypeError('Display fields must be strings');
    }
    const r = record;
    const date = plain(r.date), unit = plain(r.unit), metric = plain(r.metric) || 'Exame não informado';
    return {id:index,metric,unit,date,time:validDate(date),result:classifyResult(r.result),reference:plain(r.reference) || 'Não informada',source:plain(r.source) || 'Não informada'};
  });
  const map = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.metric,row.unit]);
    if (!map.has(key)) map.set(key,{metric:row.metric,unit:row.unit,rows:[]});
    map.get(key).rows.push(row);
  }
  const groups = [...map.values()].map(group => {
    const ordered = group.rows.filter(r => r.time !== null).sort((a,b) => a.time-b.time);
    const counts = new Map();
    for (const row of ordered) counts.set(row.time,(counts.get(row.time)||0)+1);
    const points = ordered.filter(r => r.result.kind === 'exact' && group.unit.trim());
    // Unknown chronology prevents connecting any records. Duplicates and non-exact
    // dated rows interrupt a segment, rather than creating a fictional progression.
    const segments = []; let segment = [];
    const flush = () => {if (segment.length > 1) segments.push(segment);segment=[];};
    for (const row of ordered) {
      if (row.result.kind !== 'exact' || counts.get(row.time)>1 || !group.unit.trim() || group.rows.some(r=>r.time===null)) {flush();continue;}
      segment.push(row);
    }
    flush();
    const delta = segments.length===1 && segments[0].length===group.rows.length ? segments[0].at(-1).result.value-segments[0][0].result.value : null;
    return {...group,points,segments,delta:Number.isFinite(delta)?delta:null,duplicateDates:[...counts].filter(([,count])=>count>1).map(([time])=>time)};
  });
  return {rows,groups};
}
const displayDate = row => row.time === null ? (row.date ? `${row.date} · data não validada` : 'Data não informada') : row.date;
function renderChart(group) {
  const e=escapeHtml, points=group.points;
  if (!points.length) return '<p class="empty">Sem valores exatos com data válida e unidade para desenhar. Consulte a tabela.</p>';
  const values=points.map(r=>r.result.value), times=points.map(r=>r.time);
  const min=Math.min(...values), max=Math.max(...values), first=Math.min(...times),last=Math.max(...times);
  // Scaling remains finite for large finite inputs; no extrapolated measurements.
  const magnitude=Math.max(Math.abs(min),Math.abs(max),1);
  const low=min/magnitude, high=max/magnitude;
  const x=r=>first===last?300:65+(r.time-first)/(last-first)*470;
  const y=r=>low===high?130:205-(r.result.value/magnitude-low)/(high-low)*140;
  const n=value=>value.toFixed(2);
  const lines=group.segments.map(segment=>`<polyline class="history-line" points="${segment.map(r=>`${n(x(r))},${n(y(r))}`).join(' ')}"/>`).join('');
  const dots=points.map(r=>`<circle class="history-point" cx="${n(x(r))}" cy="${n(y(r))}" r="5"><title>${e(displayDate(r))}: ${e(r.result.label)} ${e(r.unit)}; fonte ${e(r.source)}; referência ${e(r.reference)}</title></circle>`).join('');
  return `<svg viewBox="0 0 600 260" role="img" aria-label="${e(group.metric)}: registros exatos fictícios, ${e(group.unit)}. Valores completos na tabela."><line class="grid" x1="65" x2="535" y1="65" y2="65"/><line class="grid" x1="65" x2="535" y1="205" y2="205"/><text x="8" y="65">${e(String(max))}</text><text x="8" y="205">${e(String(min))}</text>${lines}${dots}<text x="65" y="245">${e(new Date(first).toISOString().slice(0,10))}</text><text x="535" y="245" text-anchor="end">${e(new Date(last).toISOString().slice(0,10))}</text></svg>`;
}
function renderGroup(group) {
  const e=escapeHtml;
  return `<section class="panel"><header><p class="eyebrow">HISTÓRICO DEMONSTRATIVO</p><h2>${e(group.metric)}</h2><p>${e(group.unit||'Unidade não informada')} · dados inteiramente fictícios</p></header>${renderChart(group)}<p class="explanation">Pontos representam registros exatos. Linhas apenas ligam datas conhecidas, únicas e consecutivas. Não estimam medições intermediárias. Variação não indica melhora ou piora.</p>${group.delta===null?'':`<p class="delta">Diferença aritmética entre registros: ${e(String(group.delta))} ${e(group.unit)}</p>`}<div class="table-scroll"><table><caption>Valores e referências por registro · ${e(group.metric)}</caption><thead><tr><th scope="col">Data</th><th scope="col">Resultado</th><th scope="col">Unidade</th><th scope="col">Referência do registro</th><th scope="col">Fonte fictícia</th></tr></thead><tbody>${group.rows.map(r=>`<tr><td>${e(displayDate(r))}</td><td>${e(r.result.label)}</td><td>${e(r.unit||'Não informada')}</td><td>${e(r.reference)}</td><td>${e(r.source)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
export function renderDashboard(input) {
  if (!input || typeof input!=='object' || ![Object.prototype,null].includes(Object.getPrototypeOf(input))) throw new TypeError('Explicit synthetic_demo profile and records are required');
  const keys=Reflect.ownKeys(input);
  if(keys.length!==2 || !keys.includes('profile') || !keys.includes('records')) throw new TypeError('Only profile and records are allowed');
  for(const key of keys) if(!('value' in Object.getOwnPropertyDescriptor(input,key))) throw new TypeError('Profile accessors are not supported');
  if(input.profile!=='synthetic_demo') throw new TypeError('Only synthetic_demo profile is supported');
  if(!Array.isArray(input.records)) throw new TypeError('Explicit records array is required');
  const model=createViewModel(input.records);
  return `<main id="conteudo"><div class="intro"><p class="eyebrow">VERG HEALTH · PROPOSTA DE INTERFACE</p><h1>Seu histórico, em perspectiva.</h1><p>Dados sintéticos. Sem diagnóstico ou recomendação clínica.</p></div>${model.groups.length?model.groups.map(renderGroup).join(''):'<p class="empty">Nenhum registro informado.</p>'}<footer>Proposta em revisão. Sem importação, OCR, armazenamento ou conexão externa.</footer></main>`;
}
