# Auditoria estrutural de UX dos painéis

## Escopo e evidências

Auditoria baseada nas rotas, componentes, formulários, navegações e estados existentes no frontend. Foram inventariadas as superfícies pública, cliente, lojista e mecânico, incluindo páginas de primeiro nível, modais, drawers, assistentes e editores. Não existem prints completos nem uma pasta de logos oficiais no material fornecido; por isso, decisões de direção de arte e redesign visual amplo dependem da etapa visual prevista pela skill FUSE Studio Redesign.

## Diagnóstico transversal

1. **Muitos destinos primários.** O lojista recebe 16 itens na sidebar e o cliente 10. A taxonomia reflete módulos técnicos, não as tarefas que o usuário tenta concluir.
2. **Funções relacionadas competem entre si.** Clientes, Relacionamento, Suporte e Fidelidade são partes da mesma jornada; Produtos, Serviços e Marketplaces formam um único catálogo; Cupons, Promoções e Landing Page são ferramentas de venda.
3. **Densidade sem prioridade.** Há páginas com 8 a 23 cards e componentes especialistas acima de 1.000 linhas. Métricas, explicações, filtros e ações aparecem simultaneamente.
4. **Formulários extensos dentro de modais.** Pedido, orçamento, produto, promoção, fidelidade e consulta de veículo acumulam muitos campos e decisões em superfícies estreitas. Os fluxos de pedido e orçamento já foram reduzidos para três etapas, mas ainda precisam de resumo fixo e revelação condicional.
5. **Padrões diferentes entre painéis.** Cliente, lojista e mecânico têm três implementações de navegação e agrupamentos diferentes. O mecânico já usa a melhor abstração: uma fila de trabalho com vistas internas.
6. **Textos que explicam a interface.** Descrições repetem rótulos ou instruem ações óbvias. Ajuda longa deve ficar contextual, recolhida e próxima do campo que necessita dela.

## Arquitetura recomendada

### Painel do lojista

Reduzir de 16 destinos para 7 destinos primários:

| Destino primário | Funções internas preservadas |
|---|---|
| Início | prioridades, alertas e criação rápida |
| Atendimentos | pedidos, orçamentos, ordens de serviço e revisões |
| Catálogo | produtos, serviços e marketplaces |
| Clientes | cadastro, Cliente 360º, relacionamento, suporte e fidelidade |
| Vendas | promoções, cupons e conteúdo da vitrine |
| Relatórios | visão executiva e exportações por assunto |
| Configurações | loja, conta, equipe, PWA, frete, PDF e consulta por placa |

As rotas atuais devem continuar válidas e abrir diretamente a subaba correspondente. A sidebar mostra somente os sete objetivos; subfunções ficam em tabs responsivas ou em navegação local da página.

### Painel do cliente

Reduzir de 10 destinos para 6 objetivos:

| Destino primário | Funções internas preservadas |
|---|---|
| Início | próxima ação, alertas e resumo mínimo |
| Compras | pedidos, orçamentos e aprovações |
| Meu veículo | veículos, revisões e agendamentos |
| Benefícios | favoritos e cupons |
| Ajuda | suporte, chamados e FAQ |
| Conta | perfil, endereços e preferências de notificação |

Notificações urgentes devem continuar acessíveis pelo cabeçalho, com badge; não precisam ocupar uma página no menu primário. URLs legadas permanecem como entradas diretas para as subabas.

### Painel do mecânico

Manter dois destinos: **Trabalho** e **Perfil**. Revisões e OS já pertencem à fila única e devem continuar como filtros internos, não voltar à sidebar. Priorizar “próximo serviço”, atrasos e bloqueios; métricas históricas ficam recolhidas.

## Auditoria por área do lojista

- **Início:** manter no primeiro viewport somente pendências, três ações frequentes e alertas críticos. Indicadores históricos, atividade e explicações permanecem em “Ver desempenho”.
- **Atendimentos:** a consolidação existente é correta. Padronizar busca e filtros compartilhados; preservar a aba selecionada na URL; abrir detalhes em painel lateral no desktop e página completa no celular.
- **Catálogo:** Produtos e Serviços devem compartilhar cabeçalho, busca, status, categorias e ação “Novo”. Marketplaces é uma subaba de distribuição. Categorias deixam de ser modais isolados e passam a ser uma ação contextual da respectiva lista.
- **Clientes:** lista e Cliente 360º são a entrada. Relacionamento, chamados e fidelidade aparecem como abas do cliente quando há seleção e como filas agregadas quando não há.
- **Vendas:** Promoções e Cupons compartilham calendário/status; Landing Page vira “Vitrine”, com edição por seção e preview. Remover cards explicativos permanentes do editor e usar ajuda recolhida.
- **Relatórios:** reduzir os dez cards simultâneos. Começar por resumo executivo e permitir escolher Vendas, Estoque, Serviços ou Marketing antes de mostrar detalhes/exportações.
- **Configurações:** unir Minha Conta, PWA, Configurações e Usuários em uma área com índice lateral/local. Separar “Minha conta” de “Configurações da loja” sem mantê-las como destinos globais concorrentes.

## Auditoria por área do cliente

- **Início:** manter a pergunta “o que você quer fazer?” e no máximo três ações. Ocultar métricas de relacionamento e benefícios até solicitação.
- **Compras:** Pedidos e Orçamentos devem ser tabs da mesma página, porque o orçamento frequentemente origina um pedido. Usar um único padrão de status e timeline.
- **Meu veículo:** Veículos e Revisões devem compartilhar seletor de veículo. Após selecionar um veículo, mostrar próxima revisão, histórico e ações; evitar pedir seleção novamente em cada fluxo.
- **Benefícios:** Favoritos e Cupons podem compartilhar uma página, mas não devem ser misturados na mesma lista. Ações principais: comprar favorito e aplicar/consultar cupom.
- **Ajuda:** preservar dashboard de suporte, FAQ e chamados, removendo cards de contato duplicados quando o mesmo canal já está no cabeçalho/rodapé.
- **Conta:** agrupar dados pessoais, endereços, senha e preferências. Estatísticas de gasto e nível são resumo, não formulário.

## Formulários e assistentes

- Aplicar três passos somente a tarefas de criação complexas: **contexto**, **itens/dados**, **revisão e confirmação**.
- Campos opcionais aparecem por condição; não exibir todos antecipadamente.
- Manter resumo fixo no desktop e resumo recolhível no mobile.
- Um CTA primário por etapa; ações secundárias usam estilo discreto.
- Erros aparecem no campo e num resumo curto no topo; não depender apenas de toast.
- CEP, placa e cliente selecionado devem preencher dados relacionados sem apagar edições manuais.
- Edição longa de produto, promoção, fidelidade e configurações deve usar página ou drawer largo, não modal central estreito.

## Componentes e consistência

- Criar um shell único de página com título curto, ação primária, busca/filtros e conteúdo; descrições só quando adicionarem contexto real.
- Reutilizar um padrão de `EntityList`, `FilterBar`, `EmptyState`, `DetailDrawer`, `FormStepper` e `LocalTabs` em vez de novas variações por módulo.
- Limitar cards de KPI a quatro por visão; demais métricas entram em detalhes progressivos.
- Evitar cards dentro de cards. Usar divisores, grupos e títulos de seção para reduzir ruído visual.
- Padronizar estados vazio, carregando, erro parcial, confirmação e permissão negada.

## Ordem segura de implementação

1. Consolidar a navegação sem remover rotas: novos destinos primários apontam para subabas existentes.
2. Criar shells compartilhados e migrar primeiro Catálogo, Clientes e Configurações do lojista.
3. Consolidar Compras, Meu veículo, Benefícios e Conta do cliente.
4. Transformar formulários longos em páginas/drawers progressivos, preservando payloads e validações.
5. Validar desktop, notebook, tablet e mobile com dados reais e estados vazios/erro.

## Dependência visual

Para propostas visuais por tela e viewport, são necessários prints legíveis das telas atuais e a logo oficial. Sem esses arquivos, esta auditoria não presume uma nova direção de arte nem altera a marca.
