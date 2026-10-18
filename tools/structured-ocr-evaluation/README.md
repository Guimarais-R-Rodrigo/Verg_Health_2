# Verg Health: avaliação estruturada sintética

Incremento local independente, 18/10/2026. Não é uma versão do aplicativo, um parser médico, um teste de inferência OCR, um aceite clínico ou uma autorização de publicação.

## O que já funciona

O avaliador compara gabaritos manuais com projeções dos campos extraídos e revisados. Usa somente Node e módulos nativos. Não importa a fonte funcional, não abre documentos/imagens, não executa OCR, não instala dependências, não acessa rede, não grava dados do produto e não aprova resultados. Os exemplos são inventados e contêm erros deliberados.

Execute a partir desta pasta:

```sh
node --test tests/evaluate.test.mjs
node evaluate.mjs fixtures/smoke/expected.json fixtures/smoke/candidate.json fixtures/smoke/registry.json
```

O segundo comando retorna JSON em stdout. Saída 0 significa que entradas e cálculo foram aceitos pelo avaliador, mesmo quando existem erros. Não significa aprovação da extração. Saída 2 retorna `NOT_SCORED` e um código fixo para entrada inválida ou proveniência insuficiente. Não há percentual mínimo inventado nem exit code de liberação.

## Contrato efetivamente observado

Fonte funcional examinada, sem execução: Health 3.2.2, revisão `source-and-approved-fixtures-v3`, manifesto SHA-256 `c0b32f28d73eb5d12c53b237e56f9593d1bb1cfd207f39018acf118fb9290ef1`. Identidades fixadas: estruturação `geometry-0.3.0-health-v1`, catálogo `1.0.0-synthetic`, run `1`, rascunho `1.0.0`. O avaliador rejeita outras identidades, inclusive quando candidato e gabarito concordam entre si. Uma futura versão exige adaptação explícita e nova revisão; nunca substituir silenciosamente o parser histórico pelo atual.

`contract-lock.json` registra tamanhos e hashes dos arquivos usados para conferir o contrato. Nenhum código funcional foi copiado. As identidades imutáveis estão também fixadas em `CURRENT_CONTRACT`; a suíte confere o vínculo com o manifesto registrado.

| Campo da projeção | Origem no produto | Comparação |
|---|---|---|
| collectionDate | structured.groups[].collectionDate / job.collection_date | string exata, sem inferir data |
| biomarkerCode, biomarkerName, valueRaw, unit, refText | candidato estruturado e sua projeção no draft | literal exato no estágio declarado |
| refMin, refMax | draft, preservando null quando ausente | número JSON exato ou ausência explícita |
| resultType, comparator, valueNumeric, valueQualitative | projeção derivada em extraction_api.js, produzida pelo parser já existente | valores fornecidos, nunca recalculados aqui |
| associationLocation | groupIndex/candidateIndex da evidência original | identidade explícita, sem parear por nome/valor |
| review_decision | draft_candidates.review_decision | apenas contagem, jamais verdade |

Referências de código: `src/backend/extraction_api.js:15–16,134–149,200–209,221–238,324`; `src/ocr/structure_current.js:1–22`; `src/ocr/structure_versions.js:1–17`; `src/ocr/structure_geometric_health.js:172–197`; `src/local/exam_draft.mjs:6–9`; `src/ocr/catalog.js:5`.

Esta é uma projeção de avaliação nova, não um payload de API nem o schema oficial de importação. Um exportador futuro deve copiar os valores do estágio declarado e conservar a evidência original separadamente. O avaliador não normaliza strings vazias para null nem reconstrói campos ausentes. A API atual faz normalizações próprias ao criar drafts; o exportador deve apontar claramente se está exportando structured, draft ou reviewed. Neste pacote a projeção é draft/review, com o literal `valueRaw` preservado conforme esse estágio.

Na estruturação geométrica OCR atual, refMin/refMax são retirados e as referências permanecem literais. Um limite numérico presente no gabarito e ausente no candidato continua sendo lacuna mensurável; isso não exige que o parser infira intervalos nem classifica a ausência como erro clínico. Um gabarito de escopo apenas literal pode declarar esses campos `unscored` com motivo antes da execução. Não os retirar depois para melhorar o resultado.

O sidecar `verg.document-observation` 1.0.2 é uma capacidade Node opcional. A própria adoção registra lacunas de captura literal/rotação/motor/configuração na produção. Este avaliador não inventa sidecars, não concatena tokens para simular raw, não valida envelopes 1.0.2 e não interpreta a ausência de sidecar como uma leitura clínica errada.

## Entradas, ausência e denominadores

- Cada gabarito declara todos os 12 campos: `value` com valor conhecido, `absent` com null explícito, ou `unscored` com justificativa. Gabarito incompleto, chave desconhecida, ID duplicado ou versão desconhecida bloqueiam a pontuação.
- `value`: entra no denominador de valores conhecidos. Null/string vazia no candidato é abstenção; chave/registro/documento ausente é omissão. Zero é um valor, nunca ausência.
- `absent`: entra em denominador separado. Só null explicitamente presente recebe correspondência de ausência. Duas chaves inexistentes nunca recebem acerto.
- `unscored`: aparece na contagem e não recebe crédito. É indispensável divulgar esses campos e seus motivos com o relatório; sua exclusão não pode ser feita após observar o candidato.
- O denominador vem de todos os documentos esperados, inclusive falhos, omitidos e sem candidatos. Registros extras aparecem separadamente. A métrica é recall de campos conhecidos, não precisão; extras não desaparecem da análise nem são adicionados silenciosamente ao denominador de recall.
- Camadas extraída e revisada são medidas separadamente. Quando só parte foi revisada, os demais campos são `notMeasured` e continuam no denominador. Nenhuma revisão produzida significa `reviewed: null`, não acerto total.
- `mismatches` lista apenas IDs e tipos de discrepância, não valores ou dados clínicos. `byField` distingue data, comparador, unidade, valor e referência.

No gabarito, comparator usa somente =, <, <=, >, >= ou ausência explícita; resultType usa NUMERIC, COMPARATOR, QUALITATIVE ou UNPARSED. Um símbolo/tipo incorreto fornecido no candidato é divergência, sem correção automática.

As strings são exatas: sem trim, case-fold, troca de vírgula/ponto, µ/μ, equivalência de unidades ou tradução de comparadores. Números são comparados com igualdade estrita de Number IEEE-754, sem tolerância. Inteiros fora do intervalo seguro são rejeitados. Isso não é aritmética decimal de precisão arbitrária: 1.25 e 1.250 têm o mesmo Number; a precisão/escrita original fica em valueRaw/refText e é comparada separadamente. O diagnóstico `numericPowerOfTenMismatches` detecta apenas razões numéricas exatas de potência de dez, sem interpretar texto nem atribuir causa ao OCR. Não é detector completo de erros decimais.

## Pareamento e proveniência

O custodiante atribui recordId por documento/página/linha de evidência, antes de avaliar valores. Não usar biomarkerCode, nome, valor ou ordenação como chave automática. Linhas repetidas recebem IDs distintos e localizações distintas. Duplicatas de ID/localização bloqueiam avaliação; uma linha sem correspondência fica extra e a linha esperada continua omitida. Página errada não ganha crédito de campo correto.

Limite: o avaliador não vê o original e não prova que o mapeamento fornecido é verdadeiro; trocas dentro da mesma página só são detectadas se o mapeamento independente e os valores evidenciarem o erro. Tabela repetida, múltiplas coletas e linhas ambíguas precisam de adjudicação documentada. Não forçar um ID esperado a uma linha incerta para ganhar cobertura.

Cada run tem origem, attemptId exclusivo, evidenceDigest, páginas e estado. Pipeline fixa versão do aplicativo, manifesto, structurer, catálogo, schemas, adaptador, configuração sanitizada e motores/modelos. Metadados ausentes/incompatíveis significam `NOT_SCORED`, não prova de erro clínico. Hashes são integridade declarada, não autenticação, propriedade ou prova de independência. O pacote não valida a correspondência entre evidenceDigest e bytes de evidência externa.

## Concordância e revisão

`comparison` requer outra tentativa, origem igual e pipeline explícito. Pode ser outra leitura ou motor; não é chamado automaticamente independente. A concordância é confrontada com o gabarito: acerto compartilhado, erro compartilhado, abstenção compartilhada, ausência em um/ambos ou divergência. Scores/confidence nunca alteram a pontuação. Um erro idêntico nos dois candidatos é falsa concordância.

`initialPendingRecords` mede pendências no snapshot inicial; `latestSnapshotPendingRecords`, no último snapshot fornecido. `correctionFieldEdits` conta diferenças de campos entre snapshots, não cliques, esforço cognitivo nem todas as ações da UI. Inclusões/remoções e decisões finais são contadas separadamente. Tempo só é somado quando medido; null é ausência de medição, zero é medição zero. A contagem não substitui revisão de identidade, páginas e associações exigida pelo aplicativo.

## Smoke e holdout

As quatro fixtures são desenvolvimento conhecido. O gabarito foi escrito manualmente sem ler saída de motor; os candidatos foram construídos com falhas deliberadas. Seus sourceSha256 são hashes de rótulos fictícios `NOT-A-DOCUMENT`, não de PDFs ou imagens. Instantes, hashes de evidência/revisão e IDs das fixtures são metadados fictícios; não provam congelamento, execução ou revisão real. Uma fixture marcada APPROVE serve para testar contagem, não representa aprovação realizada no produto.

Não existe holdout novo neste pacote. A proteção verifica registro externo de exposição por caseId, sourceSha256 e familyId; variantes da mesma família não viram amostra independente. Holdout exige gabarito e pipeline congelados, custodiante identificado e registro anterior à execução. O mesmo processo que cria ou altera esses registros não se torna independente porque o JSON diz isso. A independência real depende da governança descrita no [runbook](docs/HOLDOUT_WINDOWS_RUNBOOK.md).

Leia também [escopo e pré-requisitos](docs/DELIVERY_RECONCILIATION.md). A aplicação funcional e sua publicação são uma entrega separada; este módulo não as inclui.
