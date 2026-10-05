# Análise da integração com a Ellon API

**Data da análise:** 05/10/2026  
**API analisada:** Ellon API Integração v26.4  
**Swagger:** `http://fvendas.ellon.inf.br:9047/swagger/index.html`  
**Contrato:** Swagger/OpenAPI 2.0, 21 caminhos, 22 operações e 42 definições.

> Este documento não contém usuário, senha, código de integração nem tokens.
> Esses valores devem ficar somente em variáveis de ambiente ou em armazenamento
> cifrado. Nenhuma operação de escrita foi executada durante a análise.

## Resumo executivo

A API permite:

- receber produtos, preços, estoque, marcas, grupos e fotos da Ellon;
- receber clientes e dados cadastrais da Ellon;
- enviar clientes novos ou atualizados para a Ellon;
- enviar um carrinho como pré-pedido;
- receber pedidos, itens, faturamento, entrega e dados de NF-e;
- consultar formas de pagamento, vendedores e transportadoras;
- operar um fluxo específico de abastecimento de cooperados.

A API **não expõe** recursos próprios para promoções, cupons, serviços/oficina,
veículos, agendamentos, orçamentos de serviço, fidelidade ou compatibilidade de
peças. Esses módulos devem continuar sob responsabilidade do M2 Auto Hub, salvo
se a Ellon fornecer endpoints adicionais.

O melhor desenho inicial é tratar a **Ellon como fonte de verdade comercial**
para produto, preço, estoque, cadastro fiscal e faturamento, enquanto o M2 Auto
Hub permanece responsável pela experiência digital, promoções, oficina e
relacionamento. Pedidos aprovados no site seriam enviados como pré-pedidos e
acompanhados posteriormente por consultas.

## Situação do acesso em 05/10/2026

- O login no portal Ellon foi validado com sucesso.
- A documentação Swagger está acessível.
- O endpoint de autenticação da integração respondeu `401` com a mensagem de
  que a configuração de integração ainda não foi realizada.
- Todas as consultas de integração também retornaram `401`, como esperado sem
  essa vinculação.
- Portanto, as credenciais do portal não são o bloqueio. A Ellon precisa
  habilitar/vincular a integração no ambiente do cliente e confirmar os papéis
  do código de integração, hash e token Bearer.
- O JWT fornecido tem expiração declarada em **29/09/2027 às 19:39:52 UTC**, mas
  não foi aceito porque a configuração de integração está ausente.

### Configuração encontrada no portal

A leitura da tela `/configintegracoes/2/n` confirmou que a empresa **2 — M2
AUTO CENTER** existe, mas os seguintes valores ainda não estão configurados:

- Transação dos pedidos;
- Centro de custo;
- Vendedor;
- Local de depósito.

`Usa Fotos Produtos` está como **Sim** e `Limit Produtos` está como **0**. A
ausência dos quatro vínculos comerciais é a causa mais provável da mensagem de
integração não configurada. A opção mais provável para empresa é `2`, centro de
custo é `1 — EMPRESA` e depósito é `1 — LOJA LOCAL`; transação e vendedor não
devem ser escolhidos tecnicamente sem validação comercial/contábil. `0` para o
limite de produtos também precisa ser confirmado como “sem limite”.

A tela global `/configuracoesapi` exibe `ZgotmplZ` em campos de ZeroConf/spool,
aparentemente um placeholder de template Go não resolvido. Esses campos não são
necessários para nossa integração HTTP e não devem ser alterados.

## Segurança e autenticação

Segundo o Swagger, as chamadas usam:

1. `access_token` na query string;
2. `Authorization: Bearer {token}` no cabeçalho;
3. `empresa` no cabeçalho, opcional no contrato e com padrão documentado `1`;
4. autenticação por `POST /publico/integracoes/autenticacao`, com `usuario` e
   `senha`, para obtenção do token Bearer.

Segundo a orientação direta da Ellon, as credenciais numéricas têm finalidades
distintas: o usuário informado para entrar no portal é uma credencial do portal;
o outro código fornecido é o **código que será solicitado no fluxo de
integração**. Ele não deve ser confundido com código da empresa. O JWT informado
pela Ellon foi denominado **HASH**. Os valores não são reproduzidos neste
documento.

O mapeamento operacional adotado é: usuário Ellon/API e senha no corpo da
autenticação, HASH em `access_token`, empresa no cabeçalho e Bearer retornado
pelo endpoint para as chamadas seguintes. O código de integração permanece em
campo próprio. Esse mapeamento deve ser validado depois de a Ellon liberar a
configuração, pois antes disso a API devolve a mesma mensagem de “integração não
configurada” sem chegar à validação final das credenciais.

Na implementação, usuário e código de integração são armazenados em campos
separados e cifrados. A autenticação tenta primeiro o usuário Ellon/API exigido
pelo Swagger e, somente diante de rejeição, tenta o código de integração como
identificador. Isso acomoda a ambiguidade do fornecedor sem confundir empresa,
usuário e código no cadastro administrativo.

Há uma inconsistência no OpenAPI: o texto diz que `access_token` e Bearer são
obrigatórios simultaneamente, mas o bloco `security` os descreve como opções
alternativas. A implementação deve assumir que **ambos são obrigatórios** até a
Ellon confirmar o contrário.

### Riscos e controles compensatórios

- O servidor na porta `9047` aceita apenas HTTP. HTTPS nessa porta falhou. Isso
  expõe senha, token e dados pessoais em trânsito se a chamada for feita pela
  internet sem túnel seguro.
- `access_token` na URL pode aparecer em logs de proxy, histórico e observação
  de tráfego. Logs internos devem remover query strings ou mascarar o valor.
- O Swagger não documenta renovação, revogação nem tempo de vida do token
  emitido pela autenticação.
- Não há webhooks documentados. A sincronização terá de ser por polling.
- Não há documentação de limite de requisições, tamanho de página, timeout,
  SLA, ambiente sandbox ou política de versionamento.

O fornecedor confirmou que HTTPS não está disponível e não será alterado. Isso
não impede tecnicamente a integração, mas mantém um risco residual de
interceptação que não pode ser eliminado pelo nosso código. Para operar assim:

- somente o backend deve chamar a Ellon; navegador e aplicativo nunca acessam a
  porta `9047` diretamente;
- usar um worker dedicado, com acesso mínimo aos segredos e sem resposta pública;
- solicitar allowlist do IP fixo da VPS na porta `9047`, se o firewall da Ellon
  oferecer essa possibilidade, mesmo que eles não ofereçam HTTPS;
- restringir no firewall da nossa VPS a saída para o IP e porta exatos da Ellon;
- usar uma credencial exclusiva de integração, com o menor nível de privilégio;
- remover query string, cabeçalhos de autorização e payloads pessoais de logs,
  APM, traces e mensagens de erro;
- manter tokens cifrados em repouso, rotacionáveis e fora do frontend;
- aplicar timeout curto, limite de concorrência, circuit breaker e fila para
  reduzir exposição e impedir que a indisponibilidade da Ellon derrube o site;
- minimizar os dados transmitidos e não buscar XML de NF-e sem necessidade;
- registrar uma aceitação formal do risco HTTP e revisar o contrato/LGPD com o
  cliente antes da ativação.

Um proxy HTTPS na nossa VPS protegeria apenas navegador → nossa VPS; ele **não
criptografa** o trecho nossa VPS → Ellon. VPN/túnel continuaria sendo a única
forma de proteger esse trecho sem mudança na API, caso a infraestrutura Ellon
algum dia permita.

## Inventário de endpoints

| Direção sugerida | Método e caminho | Finalidade | Observações |
|---|---|---|---|
| autenticação | `POST /publico/integracoes/autenticacao` | obter Bearer token | requer `access_token`; atualmente bloqueado pela configuração |
| Ellon → M2 | `POST /publico/integracoes/produtos?pagina=` | pesquisar/listar produtos | usa POST, mas é consulta; paginação incompleta no contrato |
| Ellon → M2 | `GET /publico/integracoes/produto/{id}` | obter produto | inclui preço, estoque, fotos e fornecedor |
| Ellon → M2 | `GET /publico/integracoes/gruposprodutos` | listar grupos | candidato a categorias |
| Ellon → M2 | `GET /publico/integracoes/marcasprodutos` | listar marcas | retorna o mesmo esquema de grupos |
| Ellon → M2 | `GET /publico/integracoes/clientes?pagina=` | listar clientes | contém dados pessoais; exige base legal e minimização |
| Ellon → M2 | `GET /publico/integracoes/clientes/{id}` | obter cliente | consulta individual |
| M2 → Ellon | `POST /publico/integracoes/cadastrocliente` | criar ou atualizar cliente | Swagger não explica a chave usada no update |
| M2 → Ellon | `POST /publico/integracoes/gerarprepedido` | criar pré-pedido | principal saída do checkout para o ERP |
| Ellon → M2 | `GET /publico/integracoes/prepedido/{numero}` | detalhes do pré-pedido | contrato declara array, mesmo para um número |
| Ellon → M2 | `GET /publico/integracoes/prepedidoscliente/{cliente}` | pedidos por cliente | filtros de data opcionais |
| Ellon → M2 | `GET /publico/integracoes/prepedidosdetalhados` | pedidos paginados | exige página, quantidade e intervalo de datas |
| Ellon → M2 | `POST /publico/integracoes/consultaresumovendas?pagina=` | faturamentos/vendas | retorna itens, cancelamento e origem externa |
| Ellon → M2 | `GET /publico/integracoes/consultanfe/{pedido_site}` | NF-e do pedido do site | pode retornar chave, número e XML completo |
| Ellon → M2 | `POST /publico/integracoes/consultapedidosentrega` | controle de entregas | filtros declarados como todos obrigatórios |
| Ellon → M2 | `GET /publico/integracoes/formaspagamento` | formas de pagamento | necessário antes de enviar pedido |
| Ellon → M2 | `GET /publico/integracoes/formaspagamento/{id}` | forma específica | contrato declara array |
| Ellon → M2 | `GET /publico/integracoes/transportadoras` | transportadoras | necessário para envio de pedido |
| Ellon → M2 | `GET /publico/integracoes/transportadoras/{id}` | transportadora específica | contrato declara array |
| Ellon → M2 | `GET /publico/integracoes/vendedores` | vendedores | repete `Authorization` como parâmetro explícito |
| Ellon → M2 | `GET /integracoes/cooperado/abastecimento?placa=` | limite do cooperado | fluxo específico, não relacionado ao e-commerce atual |
| M2 → Ellon | `POST /integracoes/cooperado/abastecimento` | gerar faturamento | não implementar sem requisito explícito |

Todos, exceto autenticação, aceitam ou exigem contexto da empresa. O código
correto da empresa para integração ainda precisa ser confirmado; o portal do
usuário exibiu uma empresa, mas isso não prova que seja o mesmo identificador
esperado no cabeçalho.

## Dados que podemos receber

### Produtos

Campos documentados: identificador, descrição, descrição da sequência, código
de barras, referência reduzida, referência de fábrica, aplicação, grupo,
subgrupo, seção, marca, NCM, unidade, tipo, preço de venda, preço de oferta,
quantidade, estoque mínimo, custo real, peso, altura, largura, comprimento,
datas da última compra e venda, fornecedores e fotos.

Mapeamento proposto:

| Ellon | M2 Auto Hub | Tratamento |
|---|---|---|
| `id` + `sequencia` | nova chave externa | não usar o UUID interno como ID Ellon |
| `descricao` | `Product.name` | direto, após normalização UTF-8 |
| `aplicacao` | `description` ou `specifications` | decidir se complementa a descrição |
| `reduzida` / `ref_fabrica` | `sku` | confirmar qual é única e estável |
| `preco_venda` | `salePrice` | converter string decimal com regra brasileira |
| `preco_oferta` | `promoPrice` | não confundir com campanha/promoção do M2 |
| `quantidade` | `stock` | a API envia string; definir arredondamento para `Int` |
| `estoque_minimo` | `minStock` | converter número para inteiro |
| `custo_real` | `costPrice` | dado sensível; nunca expor na API pública do site |
| `grupo` / `sub_grupo` | `category` / `subcategory` | manter também os IDs externos |
| `marca` | `supplier` ou novo campo `brand` | `supplier` atual não representa marca corretamente |
| `fotos[].foto` | `images` | confirmar se é URL, base64 ou binário codificado |
| demais campos | `specifications` | preservar sem perder atributos do ERP |

Lacunas locais: o modelo atual precisa de `externalId`, `externalSequence`,
`externalUpdatedAt` e estado de sincronização. `supplier` e marca devem ser
separados. Não devemos sobrescrever slug, SEO, imagens editoriais ou regras de
promoção sem uma política explícita.

### Clientes

Campos disponíveis: ID, nome, fantasia, CPF/CNPJ, RG/IE, nascimento, e-mail,
telefone, celular, endereço completo e status.

O M2 possui cliente e endereços normalizados, mas exige e-mail único e senha.
Clientes importados da Ellon não devem receber senha previsível. Devem nascer
como conta provisória/inativa e concluir um fluxo seguro de ativação. É preciso
adicionar `ellonCustomerId` e definir resolução de conflito por CPF/CNPJ, e-mail
e telefone.

### Pedidos, vendas e NF-e

Podemos receber cabeçalho, cliente, itens, valores bruto/líquido, descontos,
forma de pagamento, vendedor, indicador, datas, cancelamento, marketplace,
identificador externo, dados de entrega e XML da NF-e.

O M2 já tem `externalOrderId`, porém `externalProvider` só aceita Mercado Livre
e Shopee. Será necessário incluir `ELLON` ou criar uma tabela genérica de
integração. O número do pré-pedido e o ID do pedido do site devem ser guardados
separadamente para idempotência e conciliação.

### Cadastros auxiliares

Formas de pagamento, vendedores, transportadoras, grupos e marcas devem ser
armazenados em cache/tabelas de referência com ID Ellon, nome, data da última
sincronização e estado ativo. IDs não devem ficar hardcoded.

## Dados que podemos enviar

### Cliente

`cadastrocliente` aceita nome/fantasia, documentos, nascimento, contatos,
endereço e status. O contrato chama a operação de criar/atualizar, mas não
recebe um ID no corpo. Precisamos perguntar à Ellon se o upsert usa CPF/CNPJ,
e-mail ou outra chave; sem isso há risco de duplicidade.

### Pré-pedido

`gerarprepedido` recebe:

- `id_cliente` Ellon;
- `id_pedido_site`, que deve ser o UUID do pedido M2 e a chave de idempotência;
- `forma_pagto` Ellon;
- `transportadora` Ellon;
- `valor_frete`;
- `id_vendedor` opcional;
- observação;
- itens com `id_produto`, `id_sequencia` e quantidade.

O retorno contém `numeroPedido` e `status`. O contrato não envia preço unitário,
desconto ou cupom no pré-pedido; a Ellon aparentemente recalcula os valores a
partir do cadastro. Portanto, divergências entre o total mostrado no checkout e
o total do ERP precisam de uma regra de bloqueio ou aprovação.

### Abastecimento de cooperado

Aceita CNPJ, CPF do motorista, data, chave de integração, quilometragem, placa,
quantidade, referência, valor e observação. Esse fluxo está fora do escopo atual
do M2 Auto Hub e não deve ser habilitado apenas porque existe na API.

## O que não pode ser sincronizado pelo contrato atual

- promoções, campanhas, cupons e segmentações;
- serviços, mão de obra e ordens de serviço;
- veículos do cliente e histórico de revisões;
- agendamento de oficina;
- orçamentos de serviço e aprovação pública;
- pontos e recompensas de fidelidade;
- compatibilidade entre peça e veículo;
- status detalhado de estoque reservado;
- webhooks ou eventos em tempo real.

## Arquitetura recomendada

1. **Adaptador Ellon isolado no backend:** nenhum acesso direto do navegador à
   Ellon. Isso protege os segredos e evita CORS, vazamentos e dependência do ERP
   na renderização da loja.
2. **Cofre de configuração:** URL, empresa, usuário, senha, hash e tokens
   cifrados em repouso. Nunca em Git, frontend, logs ou banco sem criptografia.
3. **Tabelas de vínculo:** UUID M2 ↔ IDs Ellon para produtos, clientes e pedidos.
4. **Outbox para envios:** cliente e pedido entram numa fila transacional;
   tentativas têm idempotência, backoff, limite e auditoria.
5. **Polling incremental:** produtos por `data_alteracao`; pedidos/vendas por
   janela de datas com sobreposição e deduplicação.
6. **Reconciliador periódico:** compara estoque, preço, totais e status para
   detectar divergência silenciosa.
7. **Painel de integração:** conexão, última sincronização, filas, erros,
   reprocessamento e histórico, sem revelar segredos.
8. **Feature flags:** catálogo, clientes e pedidos são ativados separadamente.

## Casos de contorno incorporados ao plano

| Caso | Comportamento implementado/proposto |
|---|---|
| Serviço/mão de obra sem endpoint próprio | Um serviço do M2 pode ser mapeado para um código comercial previamente cadastrado na Ellon. A OS técnica continua intacta. |
| Revisão gera várias OS | Cada OS possui chave idempotente própria; a revisão permanece como origem e não é faturada diretamente. |
| OS sem cliente cadastrado | Bloquear exportação. Cliente avulso não tem dados fiscais suficientes. |
| Cliente ainda não existe na Ellon | Criar/atualizar cliente antes do pré-pedido e persistir o vínculo dos IDs. |
| Cliente duplicado ou resposta sem ID | Interromper o envio e exigir conciliação; nunca criar repetidamente às cegas. |
| Peça ou serviço sem código Ellon | Pré-validação lista cada item sem mapeamento e impede a geração do pedido. |
| Item excluído do catálogo depois da OS | O histórico da OS é preservado; o vínculo externo continua separado do cadastro atual. |
| OS sem custo, garantia ou cortesia | Exigir um código Ellon específico de garantia/cortesia; não converter silenciosamente para venda normal. |
| Desconto ou promoção do M2 | A Ellon recalcula valores. Divergência deve ir para conciliação antes do faturamento. |
| Estoque mudou após aprovação | Revalidar na Ellon no momento do pré-pedido; não confiar somente no estoque local. |
| Duplo clique/repetição da requisição | Chave única `service-order:{id}:v1`; retorna o mesmo job sem duplicar. |
| Timeout depois de enviar | Marcar como resultado ambíguo e bloquear retentativa automática. Conferir na Ellon antes de reenviar. |
| Erro conhecido antes do processamento | Retentativa com backoff exponencial e limite de tentativas. |
| Cancelamento antes do envio | Cancelar o job pendente; não chamar a Ellon. |
| Cancelamento depois do pré-pedido | Não apagar o vínculo. Encaminhar cancelamento/conciliação conforme endpoint que a Ellon ainda precisa fornecer. |
| Pagamento dividido | A API aceita uma forma de pagamento. Inicialmente bloquear ou escolher uma regra comercial explícita. |
| Serviço com quantidade fracionada | O modelo local atual usa inteiro. Horas fracionadas exigem código/unidade comercial ou ajuste de modelo. |
| Pedido parcialmente faturado | Manter número do pré-pedido e vendas/notas recebidas como eventos separados. |
| NF-e indisponível temporariamente | Consultar periodicamente até estado terminal; não considerar ausência imediata como erro definitivo. |
| Produto com preço/estoque inválido | Rejeitar somente o registro problemático, registrar erro e continuar o lote. |
| Token vencido ou `401` | Autenticar novamente uma vez; se persistir, abrir erro operacional sem loop infinito. |
| Ellon indisponível | Site e oficina continuam funcionando; a outbox persiste o trabalho para processamento posterior. |
| Integração desativada | Nenhum envio ocorre, mas OS, revisões e pedidos locais continuam normais. |

### Regra de conversão de revisão/OS

Uma revisão nunca vira pedido diretamente. Ela pode gerar uma ou mais ordens de
serviço. Somente uma OS **concluída**, com cliente cadastrado, configuração
comercial completa e todos os itens mapeados pode criar um pré-pedido Ellon.
Assim, o M2 preserva diagnóstico, checklist, fotos, mecânico, aprovação e
garantia; a Ellon recebe apenas a representação comercial/fiscal.

### Fonte de verdade sugerida

| Domínio | Fonte principal | Regra |
|---|---|---|
| estoque e preço base | Ellon | Ellon → M2; edição local bloqueada ou sinalizada |
| dados fiscais do produto | Ellon | Ellon → M2 |
| conteúdo comercial/SEO | M2 | preservar nome editorial, slug e descrição de venda conforme política |
| promoções e cupons | M2 | não há contrato Ellon |
| cliente digital e consentimentos | M2 | enviar apenas dados necessários à Ellon |
| cadastro fiscal do cliente | Ellon após conciliação | conflitos exigem revisão |
| pedido antes do envio | M2 | carrinho e consentimento |
| pré-pedido/faturamento/NF-e | Ellon | retorno Ellon → M2 |
| oficina, revisões e fidelidade | M2 | sem endpoint Ellon |

## LGPD

- Definir em contrato controlador, operador, finalidade, retenção, suporte a
  direitos do titular, suboperadores e resposta a incidentes.
- Sincronizar somente os campos necessários para venda/faturamento.
- CPF, CNPJ, endereço, telefone, nascimento e XML da NF-e são dados pessoais ou
  documentos sensíveis no contexto operacional; acesso deve ser por função e
  auditado.
- XML de NF-e não deve ser armazenado indefinidamente sem política fiscal e de
  retenção. Preferir guardar metadados e buscar sob demanda, se o SLA permitir.
- Pedidos de exclusão no M2 precisam considerar obrigação legal de retenção no
  ERP; anonimização e bloqueio podem substituir eliminação imediata.
- Não registrar payloads completos de cliente/NF-e em logs de erro.
- Registrar consentimento não torna todo compartilhamento legítimo; a base legal
  mais provável para pedido e faturamento é execução de contrato/obrigação legal.

## Perguntas obrigatórias para a Ellon

1. Após preencher Transação, Centro de Custo, Vendedor e Depósito para a empresa
   2, qual ação deve ser executada: apenas **Gravar Configurações** ou também
   **Sincronizar**?
2. Confirmar apenas o encaixe técnico: código de integração como usuário da
   autenticação, HASH como `access_token`, Bearer retornado pelo endpoint e
   empresa `2` no cabeçalho. O HASH é fixo? Qual é sua política de rotação?
3. Existe endpoint de refresh/revogação? Qual a validade real do token?
4. Mesmo sem HTTPS, podem restringir a porta `9047` ao IP fixo da nossa VPS? Há
   ambiente sandbox/homologação?
5. Qual o limite de chamadas, tamanho de página e número inicial da paginação?
6. `produtos` retorna array ou objeto paginado? Como identificar a última página?
7. Qual campo é único e estável para SKU: `reduzida`, `referencia`,
   `ref_fabrica`, `id` + `sequencia` ou código de barras?
8. `quantidade`, `preco_venda` e `preco_oferta` usam ponto ou vírgula decimal?
9. O que contém `fotos[].foto`: URL, base64 ou caminho interno?
10. Como `cadastrocliente` decide entre criação e atualização?
11. `id_pedido_site` impede duplicação se a requisição for repetida?
12. Como preço, desconto, frete e cupom são conciliados no pré-pedido?
13. Quais valores válidos existem para status, tipo de movimento e operação?
14. Existe webhook, changelog ou endpoint não publicado para estoque/pedido?
15. Qual é a política de compatibilidade e aviso prévio entre versões?

## Fases propostas para decisão

### Fase 0 — desbloqueio e homologação

O responsável comercial define transação e vendedor, a configuração é gravada
na empresa 2 e a Ellon confirma o procedimento de sincronização. Registramos os
controles compensatórios e executamos testes controlados, preferencialmente em
empresa de homologação.

### Fase 1 — catálogo somente leitura

Importar grupos, marcas, produtos, fotos, preço e estoque. Validar paginação,
decimais, performance e política de sobrescrita. É a fase de menor risco.

#### Implementação disponível

O painel já permite enfileirar **Sincronizar produtos agora** e habilitar uma
execução automática a cada dez minutos. O importador:

- percorre páginas até resposta vazia ou repetida;
- aceita array direto ou envelopes `produtos`, `Produtos`, `data`, `items` e
  `registros`, devido à ausência de contrato de paginação preciso;
- converte números com ponto ou vírgula;
- cria produtos novos e atualiza produtos já vinculados pelo ID + sequência;
- vincula por SKU exato quando encontra um produto local correspondente;
- importa preço, oferta, estoque, estoque mínimo, custo, categoria, marca,
  aplicação, fotos e especificações técnicas;
- isola registros inválidos sem interromper o restante do lote;
- registra contagens e até cem erros no resultado do job;
- usa checkpoint incremental por `data_alteracao` depois da carga inicial;
- nunca apaga automaticamente um produto local ausente na resposta Ellon.

### Fase 2 — clientes

Adicionar vínculos externos, regras de deduplicação, conta provisória, auditoria
e tratamento LGPD. Sincronização inicialmente M2 → Ellon.

### Fase 3 — pedidos

Mapear formas de pagamento/transportadoras, usar outbox idempotente, enviar
pré-pedido e conciliar número/status. Bloquear reenvio duplicado.

### Fase 4 — pós-venda

Sincronizar faturamento, cancelamento, entrega e metadados de NF-e. Adicionar
painel operacional, alertas e reprocessamento.

## Decisão recomendada

Não implementar tudo de uma vez. Aprovar **Fase 0 + Fase 1** primeiro. Depois de
validar dados reais e os controles compensatórios, decidir se clientes e pedidos
devem ser bidirecionais. A maior decisão funcional é quem vence conflitos de
cadastro e preço; as maiores decisões técnicas são a aceitação formal do HTTP,
o isolamento da conexão e a idempotência confirmada pela Ellon.
