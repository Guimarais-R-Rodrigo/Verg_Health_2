# Escopo desta entrega e pré-requisitos

Este módulo oferece avaliação de registros estruturados sintéticos. Não contém a aplicação funcional Verg Health, seu parser, um motor OCR ou documentos de teste em PDF/imagem.

## Referência de contrato

A implementação foi alinhada por leitura ao contrato da fonte funcional Verg Health 3.2.2, revisão `source-and-approved-fixtures-v3`:

- Manifesto da fonte: SHA-256 `c0b32f28d73eb5d12c53b237e56f9593d1bb1cfd207f39018acf118fb9290ef1`.
- Estruturação atual: `geometry-0.3.0-health-v1`.
- Catálogo: `1.0.0-synthetic`.
- Run: `1`; rascunho: `1.0.0`.

`contract-lock.json` identifica os arquivos e hashes usados para conferir nomes, estágios e proveniência dos campos. Nenhum desses arquivos funcionais é distribuído pelo módulo. Os exemplos foram criados separadamente e contêm somente registros fictícios.

## Entregas distintas

A fonte funcional 3.2.2 v3 não está publicada neste repositório como parte desta entrega e não está certificada para uso clínico ou produção. Sua disponibilização, instalação, integração e validação continuam sendo pré-requisitos separados. O incremento visual isolado do repositório também não equivale à aplicação funcional ou à entrega do OCR.

Publicar ou executar este avaliador não publica a fonte funcional, não fornece seus recursos, não instala pesos, não altera o motor padrão e não autoriza dados reais. A versão funcional deverá ser reconciliada com seu manifesto e contratos antes de qualquer integração futura.

## O que esta medição sustenta

Os testes verificam a comparação de campos e a contabilização de valores incorretos, omissões, ausência explícita, associações, falsa concordância e alterações de revisão. O smoke usa candidatos com falhas deliberadas. Seus resultados não medem a acurácia do Health ou de qualquer motor OCR.

O avaliador requer uma projeção de registros fornecida externamente. Um exportador integrado ao aplicativo ainda precisa ser implementado e validado. Não é suficiente copiar um objeto estruturado e presumir que ele já está no estágio draft/review descrito no README.

## O que permanece pendente

- Holdout sintético novo e independente, com gabarito manual, custódia e exposição registradas.
- Instalação Windows limpa e reproduzível da aplicação e de seus componentes.
- Inferência real no caminho selecionado e medições de recursos, carga, rede e recuperação.
- Jornada de revisão humana, com identidade, páginas, associação, correção e decisão explícitas.
- Validação de retenção, autenticação, segurança e operação no escopo de uso planejado.

O sidecar `verg.document-observation` 1.0.2 é uma capacidade opcional; a captura completa na aplicação não pode ser presumida. O avaliador não produz nem valida esse sidecar e não reconstrói texto bruto a partir de tokens.

O [runbook de holdout e Windows](HOLDOUT_WINDOWS_RUNBOOK.md) organiza essas próximas verificações. Todas devem distinguir resultado verificado, falha, inconclusão e etapa não executada. Nenhuma pontuação deste módulo oferece aprovação automática, aceite clínico ou certificação de produção.
