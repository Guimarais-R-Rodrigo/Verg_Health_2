import {renderDashboard,escapeHtml} from '../../health-presentation/src/index.mjs';
import {adaptSyntheticHistory} from './history-adapter.mjs';
/** Real public renderer wired to new adapter. No backend, persistence or real-data entry. */
export function renderSyntheticHistory(input) {
  const history = adaptSyntheticHistory(input);
  const html = `<div class="synthetic-host"><p>Host exclusivamente fictício. Seleção de snapshots fornecida explicitamente. Não executa curadoria nem valida aprovação real.</p>${renderDashboard({profile:history.profile,records:history.records})}<section aria-label="Vínculos dos snapshots fictícios"><h2>Fonte, literal e revisão de cada registro</h2><p>O gráfico usa somente números exatos elegíveis. Os literais originais e estados ausentes/null/vazios são preservados abaixo, sem reconstrução. Identificadores são inventados e não comprovam processamento.</p>${history.provenance.map(p=>`<details><summary>Registro ${p.rowNumber}: ${escapeHtml(p.snapshot.recordId)} · snapshot ${escapeHtml(p.snapshot.snapshotId)}</summary><pre>${escapeHtml(JSON.stringify(p.snapshot,null,2))}</pre></details>`).join('')}<p>${history.excluded.length} snapshot(s) fora do histórico aprovado desta demonstração. O fluxo de curadoria não está implementado neste host.</p></section></div>`;
  return {history,html};
}
