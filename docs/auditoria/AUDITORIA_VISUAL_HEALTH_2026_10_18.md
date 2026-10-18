# Auditoria técnica parcial da proposta Verg Health

Data: 2026-10-18 (UTC). Destino: Verg_Health_2. Escopo: exclusivamente o novo pacote de apresentação, suas demonstrações sintéticas, referência visual e CI isolada. Estado: proposta em revisão, sem aprovação visual final, release, integração de aplicativo ou encerramento formal de auditoria de produto.

## Resultado verificado

33/33 testes passaram em Node v24.19.0: 19 do pacote e 14 regressões independentes. Nenhuma dependência foi instalada. O build temporário reproduziu exatamente as bytes da demonstração versionada. Uma segunda escrita no mesmo destino foi recusada e o arquivo existente permaneceu intacto.

Comandos a partir da raiz do repositório:

    node --test packages/health-presentation/tests/*.test.mjs
    node packages/health-presentation/examples/build-demo.mjs --out /tmp/health-proposta-nova.html

A opção --out exige um arquivo ainda inexistente. O comando sem --out regenera apenas a demonstração sintética empacotada.

## Cobertura independente

- Referência v4 congelada byte a byte: SHA-256 `b00ab5d1dbb513e3bd5b7d2ca7a95dae0a09f52d7639565b9e9dac43507390a8`.
- Renderer público exige objeto explícito com profile synthetic_demo e records; recusa perfis ausentes/privados, campos extras e accessors. A declaração não anonimiza nem comprova a origem dos dados.
- Arrays densos e registros planos, sem getters, métodos próprios ou protótipos alternativos; limites de coleção/texto e tipos documentados. A validação não executou os getters dos casos de teste.
- Chamadas determinísticas com entradas congeladas, sem mutação. Uma fixture independente substitui integralmente métricas e fontes da demonstração original.
- Todo texto dinâmico fica escapado em conteúdo, atributos e títulos SVG. IDs únicos, alvos ARIA/âncoras existentes, nenhuma URL remota ou atributo de evento/estilo inline no HTML derivado.
- Gráfico e tabela estão presentes no HTML inicial, sem JavaScript. CSP restritiva com hash das bytes exatas de CSS, sem conexão, formulário, objeto ou base externa.
- Somente números JavaScript finitos são exatos. Strings como 1.240, 1,240, 06-12, 1,240.5, 12,25 e 12.25 permanecem texto; este pacote não cria outro parser de resultados.
- Comparadores permanecem limites textuais. Ausência não vira zero; zero numérico legítimo permanece ponto. Datas inválidas/UNKNOWN ficam na tabela, sem coordenada inferida.
- Distância horizontal usa datas reais, não posição na lista. Datas duplicadas não recebem ordem intra-dia inventada. Datas desconhecidas suspendem linhas e delta; valores não exatos interrompem segmentos.
- Unidades diferentes não são combinadas, convertidas ou comparadas. Referências e fontes permanecem por registro. Não há faixa clínica global, diagnóstico, recomendação ou interpretação de melhora/piora.
- Build novo confere com o exemplo versionado; a referência histórica é preservada separadamente e seu script não é importado pelo módulo.

Foram corrigidos durante a revisão: conversão indevida de strings numéricas, validação permissiva de objetos/coleções, ausência de declaração sintética no entrypoint, estilos inline dispensáveis e sobrescrita do destino explícito.

## Higiene da proposta pública

Foram inspecionados os arquivos do patch: código, SVG/CSS, HTML de referência/demonstração, fixtures inventadas, testes, documentação e workflow. Não foram incluídos prontuários, documentos reais, dados de conta, anexos clínicos, credenciais, histórico de conversas ou material privado. Não há importação de acervo, OCR, paciente, armazenamento, banco ou autenticação. Os testes de texto e valores são inteiramente artificiais. A verificação de padrões complementa a inspeção; não é mecanismo automático de anonimização para futuras entradas.

A base de destino inspecionada continha somente um arquivo ignore; esta proposta não migra outro aplicativo nem declara funcionalidade que não existe nessa base. O arquivo original de ignore permanece fora do patch.

## CI e publicação

A base não tinha workflows. A nova health-presentation.yml usa pull_request filtrado por caminhos e workflow_dispatch, contents:read, Node 24, teste isolado e build sintético temporário. Não instala o aplicativo, não lê secrets, não publica artefatos e não faz deploy. Nenhum gatilho de push foi adicionado. A revisão da árvore não comprova ausência de integrações externas ao Git; os testes acima são locais, não resultado remoto de CI.

## Limites

Não foram executados navegador, screenshots, contraste medido, leitor de tela, importação, OCR, PDF, integração, produção ou dados reais. A paleta e o emblema são derivados do estudo; a consolidação mantém o emblema estático e não reproduz suas animações/controles. A regra de movimento reduzido permanece no CSS; fidelidade visual renderizada ainda requer aprovação específica.

Um dashboard por documento: o fragmento usa ID fixo. Contratos futuros de dados reais precisam de avaliação própria, ambiente apropriado, proveniência e controles de privacidade. Nenhum bloqueio remanescente foi observado para guardar e revisar esta proposta pública estritamente sintética, dentro desses limites.
