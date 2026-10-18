# Validação delimitada — 18/10/2026

Resultado: avaliador independente pronto para revisão no escopo de comparação de registros sintéticos. Nenhuma qualificação OCR ou clínica foi executada.

- Runtime observado: Node v24.19.0.
- Comando próprio: `node --test --test-reporter=tap tests/evaluate.test.mjs`.
- Resultado final: 34 testes passaram; zero falhas, skips ou cancelamentos. Evidência: `unit-tests.tap`.
- CLI: `node evaluate.mjs fixtures/smoke/expected.json fixtures/smoke/candidate.json fixtures/smoke/registry.json`. Saída 0 com métricas em `smoke-evaluation.json`; não significa aceite da extração.
- Evaluator SHA-256 revisado independentemente: `479c4c9331b497fc19cfc00ae4b8dd59a0176573866dc34d52cd088f84e7cd15`.
- Revisão independente reportada: 38 probes finais passaram contra esse hash. Foram encontradas e corrigidas duas falhas antes do resultado final: aceitação de data UTC inexistente por normalização de Date.parse; inteiro JSON além da precisão segura confundido com outro valor. Também foram verificados bloqueio de versão não suportada, duplicatas, UTF-8, denominadores, contaminação e falsa concordância. Esses 38 probes são evidência do revisor; não devem ser somados aos 34 como 72 cenários independentes.
- Leitura de integridade: 14/14 arquivos textuais/schema usados para conferir o contrato continuam iguais aos hashes registrados, nas duas cópias funcionais de referência. Evidência: `source-pin-check.json`. Não é nova verificação dos 448 arquivos nem leitura dos PDFs/fixtures antigos.

## Resultado esperado do smoke deliberadamente incorreto

Quatro casos conhecidos, cada um com uma linha fictícia. O candidato omite um documento e contém falhas intencionais. Há 35 valores conhecidos, 12 ausências explícitas e um campo não adjudicado. O resultado identifica 20 valores exatos, sete ausências exatas, 12 campos omitidos, uma abstenção e sete valores divergentes. Duas divergências numéricas têm fator exato de potência de dez. Uma comparação simulada compartilha cinco campos errados. Isso testa o avaliador; não mede desempenho do Health, PP-OCR ou outro motor.

A revisão fictícia de um documento altera cinco campos; três documentos seguem sem medição de revisão. Nenhum tempo humano foi medido. Os metadados de origem, tentativa, revisão e tempos das fixtures são simulados e declarados como tal.

## Não executado

Produto Health, parser, inferência OCR, PDF/imagem, build funcional, browser/UI, instalação Windows, limites de processo/rede/memória, dados reais, exportador da aplicação, validação de sidecar, publicação, Git, merge ou deploy. 

Os critérios de entrada deste avaliador e a comparação exata são testados. Autenticidade de proveniência, independência de holdout, pareamento com documentos reais e autorização de revisão continuam fora de sua capacidade. A fonte funcional 3.2.2 v3 continua uma entrega separada, não publicada nem certificada por este módulo.
