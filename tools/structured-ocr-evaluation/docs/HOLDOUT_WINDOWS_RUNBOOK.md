# Holdout novo e Windows limpo: plano executável de qualificação

Estado em 18/10/2026: preparado, não executado. Nenhum motor/modelo, instalador, PDF ou browser foi executado nesta rodada. As etapas abaixo são trabalho futuro, sujeito ao ambiente e às confirmações aplicáveis. Não aprovam instalação de origem desconhecida, dados reais, envio externo ou publicação.

## 1. Fixar o escopo antes de produzir casos

Responsável do produto e revisor independente registram: objetivo de uso sintético, layouts/modalidades cobertos, limites conhecidos, campos literais/derivados avaliados, papéis da revisão humana e critérios de decisão. Não definir porcentagens por conveniência depois de ver os resultados. Aceite clínico exige validação própria por responsáveis qualificados; este harness não o oferece.

Usar a fonte funcional 3.2.2 v3 já identificada, em cópia separada. Não usar a branch visual isolada como aplicativo completo. Conferir SHA do pacote, manifesto, versões, configuração efetiva sanitizada, runtime, motores e pesos antes do teste. Guardar essa identificação com a evidência. Mudança de qualquer item invalida comparação direta e exige uma nova tentativa identificada.

## 2. Construir holdout sem contaminação

Um custodiante que não ajusta o parser cria documentos totalmente fictícios, novos e fora das famílias já usadas. Nenhum dado de paciente ou documento real. A matriz de cobertura deve incluir, no recorte desejado:

- documento nativo, raster e misto; página ausente/falha e abstenção explícita;
- casas decimais, zero, sinal e comparadores =, <, <=, >, >= nas formas suportadas;
- unidades e variantes literais µ/μ; unidade ausente e referência ausente;
- intervalo e referência unilateral; referência ambígua que exige abstenção;
- data ambígua/ausente, coletas diferentes e contexto histórico;
- nomes repetidos, linhas vizinhas, colunas, continuação, duas páginas e contexto insuficiente;
- caso fora de escopo que deve permanecer pendente, sem inferência silenciosa.

Essa lista é cobertura de risco, não compromisso de suportar todos os casos. Registrar o comportamento esperado de abstenção antes de rodar. Não fabricar gabarito a partir do texto extraído ou do próprio parser. Dois adjudicadores, quando disponíveis, conferem original e gabarito; divergências são registradas e resolvidas ou ficam unscored com motivo. Definir recordId e associação por evidência, não por semelhança de resultado.

Congelar bytes dos originais, gabarito, matriz, relação de famílias, pipeline e configuração; registrar hashes e instante UTC. Custodiante guarda o gabarito separado do implementador/runner. Registrar todo caso já visto e toda variante no inventário de exposição. Os hashes de rótulos do smoke deste pacote não podem substituir hashes dos originais do holdout.

O registro `frozenHoldouts` contém digest canônico do esperado e do pipeline calculados pela função digest do avaliador, custodiante, instante e declaração de independência. Preservar também SHA dos arquivos exatos fora do JSON. Não editar o registro para fazer uma reprovação passar. Após exposição a achados e correção, o corpus vira regressão conhecida; uma nova conclusão cega requer outras famílias.

## 3. Preparar Windows realmente limpo

Usar máquina/VM descartável autorizada, sem perfil de produção, pastas reais, segredos ou credenciais. Registrar Windows/build/arquitetura, CPU/RAM, Node/Python, locale, timezone e diretório de trabalho. Não chamar um ambiente com cache/venv/instalação reaproveitado de limpo.

Verificar de onde veio cada runtime/wheel/peso e suas licenças/hashes contra o material revisado. Instalação de origem desconhecida requer confirmação específica. Nunca desabilitar TLS, antivírus, firewall ou aviso de segurança para fazer passar. Se uma dependência não estiver acessível pelo caminho autorizado, registrar o bloqueio e parar a etapa dependente.

Instalar a partir dos manifests/locks aprovados em escopo local à VM. Manter a execução dentro do escopo autorizado e registrar separadamente qualquer verificação indisponível. Recolher evidência de instalação reproduzível e ausência de dependência acidental de cache. Manter downloads e execução claramente separados quando necessário.

## 4. Rodar sem escolher o melhor resultado

Fixar perfil por documento antes da execução e uma tentativa inicial por configuração. Registrar todas as tentativas, inclusive falhas, cancelamentos e tempos excedidos. Repetição recebe novo attemptId e motivo; não substituir a primeira medição nem selecionar o melhor OCR. Medir aquecimento e execução fria separadamente.

Executar apenas o caminho aprovado de OCR/bridge. Não inferir que flags offline provam bloqueio de rede nativa. Se a qualificação incluir rede/RSS/árvore de processos, combinar previamente observação apropriada do sistema operacional, sem alterar suas proteções. Registrar duração, pico de memória quando efetivamente medido, páginas concluídas, códigos de erro e saída parcial.

O orçamento 3.2.2 é cooperativo. Timeout do chamador não prova término do kernel/processo nem ausência de efeito HTTP. Processo sem fechamento confirmado deve manter lock. Depois de timeout de envio, consultar o estado antes de repetir; não presumir rollback nem idempotência de nova operationId.

## 5. Exportar registros sem criar novo parser

Exportador revisado deve preservar os valores do draft e seus vínculos: sourceSha256, attemptId, evidenceDigest, versões, páginas e associationLocation. Manter structured/run original e revisão em artefatos separados. Não reconstruir raw por concatenação de tokens nem fabricar sidecar 1.0.2. Captura indisponível permanece indisponível.

O exportador para este harness ainda não foi implementado nem validado. Até lá, um custodiante pode produzir a projeção manualmente e conferir cada célula contra os artefatos sintéticos; isso mede comparação de registros e não automatiza a cadeia de evidência.

Não transformar missing em null, completar referência, converter unidade, remover comparador, preencher data ou alterar nome para facilitar correspondência. Quando a API normalizou um campo ao gerar o draft, declarar o estágio e preservar a leitura literal separada. Aplicar validação real do produto em sua própria fronteira; este avaliador não a substitui.

Rodar o avaliador somente depois do congelamento de saídas. O custodiante confere resultado contra o gabarito. Divulgar contagens por campo, omissões, páginas ausentes, extras, unscored, associações incertas e taxa com denominador explícito. Não agregar versões, variantes e reruns como documentos independentes.

## 6. Medir revisão humana e experiência

Registrar snapshot antes/depois, versão/hash de revisão e tempo realmente observado. Conferir separadamente identidade, cada página, associação de candidato, correções, decisões e ausência de promoção automática. Incluir um caso de dois motores concordando no mesmo erro e outro com score alto incorreto.

Avaliar apresentação de missing, ambiguous, unsupported e error: nenhuma célula em branco deve sugerir normalidade. Usuário precisa ver origem literal e ambiguidade. Sem screenshots/browser nesta rodada, isso permanece verificação futura; não há alegação de UI revisada visualmente.

## 7. Paradas e critérios de prontidão

Parar a etapa dependente diante de fonte/hash/versão desconhecida, dado real, credencial, bloqueio de acesso, fixture contaminada, gabarito exposto antes do freeze, execução não registrada, original não recuperável ou confirmação obrigatória ausente. Uma tentativa malsucedida permanece no relatório.

Entregar evidência suficiente para decisão humana: instalação limpa reproduzida; holdout novo com denominadores; runtime e recursos medidos; recuperação/cancelamento com limites explícitos; revisão end-to-end; retenção/autenticação/segurança no escopo autorizado. Status possíveis: verificado no recorte, falhou, inconclusivo, não executado. Não converter `não executado` em PASS.

A fonte funcional 3.2.2 v3 não está publicada por este incremento e continua sendo pré-requisito separado. Esta prontidão não autoriza merge, deploy, troca de motor padrão ou uso de dados reais.
