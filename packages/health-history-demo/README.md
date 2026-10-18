# Histórico sintético: contrato e host independente

Implementação nova, aditiva e independente. Não é adaptador da aplicação funcional 3.2.2v3 e não usa sua fonte. O renderer público `health-presentation` é uma dependência local intacta. Todo exemplo foi inventado do zero. `synthetic_demo` continua obrigatório; o rótulo não prova anonimização nem inspeciona se dados são reais.

## Integração efetivamente alcançada

`examples/fixtures.mjs` → `adaptSyntheticHistory` → `renderDashboard` público → `examples/synthetic-history.html`.

O host chama o adaptador e o renderer reais. Não há renderer substituto/mock. Há HTML estático de histórico e detalhes de rastreabilidade, sem JavaScript de navegador. Não há importação, OCR, revisão interativa, banco, API ou integração com o aplicativo funcional. A seleção/revisão é declarada pelo fixture; não demonstra autenticação, validação documental ou aprovação clínica. Este módulo não é um mecanismo de autorização.

## Executar (da raiz de postimages)

    node --test packages/health-history-demo/tests/*.test.mjs
    node --test packages/health-presentation/tests/*.test.mjs
    node packages/health-history-demo/examples/build-demo.mjs

Node >=20 declarado; execução desta rodada somente Node 24.19.0. Sem dependências externas, instalação, socket, OCR ou servidor. O builder escreve apenas o HTML sintético local do exemplo; o adaptador e o host são funções puras.

## Contrato de entrada

Objeto JSON plain com três campos: `profile: "synthetic_demo"`, `records: []`, `selectedSnapshots: [{recordId,snapshotId}]`. Máximo 10.000 elementos por array, strings de até 512 caracteres, números finitos. Acessores, subclasses, campos desconhecidos, arrays esparsos e undefined são recusados. Ausência, null e string vazia são estados distintos no snapshot preservado. Não são aceitos identificadores reais nem payloads clínicos; a responsabilidade por essa restrição é do chamador.

Cada registro tem `recordId` estável, `snapshotId` e objetos `source` e `review`. Campos opcionais: biomarkerCode, biomarkerName, collectionDate, valueRaw, valueNumeric, resultType, comparator, valueQualitative, unit, refText, refMin, refMax. Literais são strings ou null; valueNumeric/refMin/refMax são números ou null. Datas não são derivadas do arquivo, da execução ou do relógio. Não há parser médico ou conversor de unidades.

`source`: documentId, pageNumber (inteiro positivo ou null), associationLocation (literal informado, não posição inventada), sourceSha256, evidenceDigest, attemptId. Os identificadores dos fixtures são claramente fictícios e não hashes de documentos. A função apenas preserva esses campos, sem validá-los criptograficamente.

`review`: decision, pageDecision, associationConfirmed (boolean/null), revisionVersion, reviewHash. Vocabulário afirmativo estrito: APPROVE/APPROVE/true. Para aparecer no histórico são também obrigatórios fonte completa e revisão identificada. PENDING, REJECT, ausência de fonte/revisão ou associação não confirmada produzem exclusão com motivo. O host não oferece curadoria: mostra apenas contagem de excluídos; a lista de motivos está no retorno do adaptador, não é promovida a resultado histórico.

A seleção de snapshot é explícita e fornecida separadamente, sem escolher “último” pela ordem, data ou versão textual. Não pode haver mais de uma seleção para recordId. Par recordId/snapshotId duplicado ou seleção inexistente é erro. Snapshot não selecionado não entra no histórico. Se o snapshot selecionado está pendente, não se reutiliza automaticamente a revisão aprovada anterior. O escopo deste contrato exige recordId único por registro lógico no conjunto; um futuro chamador deve fornecer identidades previamente resolvidas, nunca parear por nome/valor.

## Projeção e proteção semântica

- Somente resultType `exact`, número finito, código/unidade conhecidos, ausência de texto qualitativo e ausência de comparador explícito/literal comparativo podem produzir ponto. Além disso, valueRaw é obrigatório e deve concordar exatamente com a representação decimal do número já fornecido. Aceitam-se apenas decimais sem agrupamento, com ponto e sinal opcional; zeros fracionários finais são ignorados na comparação. Vírgula, espaços, expoentes, zeros inteiros à esquerda, precisão que diverge da representação do número e magnitude maior que MAX_SAFE_INTEGER ficam textuais. Nenhum número é calculado a partir do literal: a verificação lexical apenas autoriza ou impede usar valueNumeric já fornecido. Não é parser clínico nem validação médica.
- Comparadores nunca viram o número do limite. Se o símbolo vem separado do literal, ambos são apresentados com rótulos distintos. Sem literal, o limite fornecido é marcado “literal não informado”.
- Texto/qualitativo/ausência nunca viram zero. Zero explícito exato é válido.
- Identidade de série usa biomarkerCode + estado/literal da unidade. Mesmo nome com códigos diferentes não se funde; mudanças de nome com mesmo código ficam na mesma série, preservando cada nome original nos detalhes.
- Código ausente ou sentinela reservada (UNKNOWN, N/A, null, “Não informado”, variantes documentadas no código): registro isolado por identidade de snapshot e sem ponto exato. Unidade ausente/null/vazia: séries separadas, sem ponto. Sentinelas reservadas em unidade também impedem ponto; o literal permanece preservado. Nenhuma conversão, trim de unidade ou inferência de código.
- O renderer público agrupa por nome + unidade. O adaptador dá a cada série um rótulo visível único incluindo código e ordinal. Esse ordinal é só identificador de apresentação para esta execução, não identidade persistente. O vínculo estável fica em `provenance`.
- Datas inválidas/desconhecidas continuam na tabela; não entram na cronologia. Duplicatas preservam fontes/linhas; não inferem ordem intra-dia. Datas desconhecidas suprimem linhas da série; duplicatas interrompem segmentos. Não há julgamento de melhora/piora.
- Literais, referências, fonte, evidência e revisão são copiados integralmente para `provenance`, com clone separado e congelado. Ausência/null/vazio não são normalizados nesse snapshot.
- A tabela do renderer apresenta o valor numérico de resultados exatos (por exemplo, 4). O literal original (por exemplo, `4.00`) permanece nos detalhes “Registro N”, juntamente com fonte e revisão. Não se alega preservação da formatação decimal no gráfico.
- A projeção pode ser recusada se a composição de vários campos exceder o limite de 2.048 caracteres do renderer. Nenhum truncamento ou perda silenciosa é realizado.

## Saída

`adaptSyntheticHistory` retorna `{profile,records,model,provenance,excluded}` congelado. `records` contém exclusivamente a projeção aceita pelo renderer existente; `model` é o modelo real desse renderer; cada entrada `provenance` identifica `rowNumber`, `seriesKey` e snapshot integral. A ordem do array conserva a ordem fornecida e não declara ordenação clínica intra-dia. `renderSyntheticHistory` retorna `{history,html}`; o HTML escapa os valores e inclui o fragmento real de `renderDashboard`.

## Limites

Esta fatia fecha apenas a ligação de apresentação sintética. Testes de Node e inspeção de string não provam aparência, responsividade ou acessibilidade em navegador. Não foram executados navegador, OCR/PDF, Windows limpo, build da aplicação funcional, inferência, holdout, publicação, Git write, PR ou deploy. O bloqueio de publicação da fonte funcional continua integral. Nenhum arquivo bloqueado foi lido, copiado, derivado ou omitido para montar pacote funcional alternativo.
