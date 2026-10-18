# Verg Health

## Proposta visual isolada

Este repositório contém uma proposta reutilizável de apresentação, com dados inteiramente fictícios. Não é uma aplicação clínica operacional e não contém importação de laudos, OCR, autenticação, armazenamento de pacientes ou publicação configurada.

- [Módulo e contratos de apresentação](packages/health-presentation/README.md)
- [Referência visual preservada](packages/health-presentation/reference/VergHealth-proposal-v4.html)
- [Escopo e próximos passos](docs/VergHealth-visual-consolidation.md)

O visual usa azul escuro, ciano e detalhes rubi. Os gráficos mantêm unidades, datas e referências por registro; textos e operadores não são convertidos em medições exatas.

## Verificação local

Requer Node.js 22 ou superior, sem instalar dependências:

```sh
node --test packages/health-presentation/tests/*.test.mjs
node packages/health-presentation/examples/build-demo.mjs --out ./VergHealth-preview.html
```

O arquivo de saída precisa ser novo. A prévia é estática e utiliza apenas exemplos sintéticos. A integração com a aplicação e a revisão visual no navegador são etapas futuras.

Não inclua laudos, fotos pessoais, dados de pacientes, credenciais ou informações privadas neste repositório público.
