# Plano de Implementação

## Resumo da aplicação

O M2 Auto Hub é um monorepo com loja pública e três experiências autenticadas: painel do cliente, painel do lojista e painel do mecânico. O frontend usa React/Vite, o backend usa Express/Prisma/PostgreSQL e há também um aplicativo Flutter. O produto cobre catálogo, pedidos, orçamentos, clientes, veículos, revisões, ordens de serviço, relacionamento, suporte, fidelidade, campanhas, marketplaces, relatórios e configurações.

As capacidades são amplas, mas a navegação atual está organizada principalmente por entidades e módulos internos. Para usuários leigos, tarefas que pertencem ao mesmo objetivo aparecem separadas e o dashboard funciona mais como relatório passivo do que como ponto de trabalho. Há ainda atalhos visíveis no painel do cliente que não executam ação alguma.

### Inventário dos painéis e jornadas auditadas

| Painel | Páginas/funções confirmadas | Jornada real | Diagnóstico de produto |
|---|---|---|---|
| Público/loja | home, catálogo, serviços, promoções, carrinho, checkout, contato, login e aprovação pública de orçamento | descobrir, comprar ou solicitar atendimento | A entrada comercial está separada dos painéis, o que é adequado; retornos à loja precisam usar rota completa, não apenas hash local |
| Cliente | início, perfil/endereços, orçamentos, pedidos, veículos, revisões/agendamentos, favoritos, cupons, suporte/FAQ/tickets | comprar, aprovar orçamento, cuidar do veículo e acompanhar atendimento | Boa cobertura funcional, porém atalhos quebrados e uma segunda área “Minha Conta” duplicavam pedidos/orçamentos e escondiam notificações |
| Lojista — operação | dashboard, pedidos, orçamentos, ordens de serviço, revisões/agendamentos | receber demanda, preparar proposta, executar e concluir | Etapas da mesma jornada estão em quatro módulos; o dashboard precisava ser a camada agregadora segura antes de uma futura central transacional |
| Lojista — catálogo/vendas | produtos, serviços, marketplaces, cupons, promoções e landing page | manter oferta e gerar venda | Funções são relacionadas, mas possuem regras próprias; devem permanecer especializadas, com atalhos e contexto cruzado em vez de fusão indiscriminada |
| Lojista — clientes | clientes, relacionamento, suporte e fidelidade | conhecer, atender e reter | Dados do mesmo cliente aparecem em módulos distintos; oportunidade futura é um workspace 360º do cliente, mantendo permissões e históricos |
| Lojista — gestão | relatórios, usuários, conta, PWA e configurações | administrar operação e plataforma | Separação é coerente por risco/permissão; não deve ser fundida apenas para reduzir o menu |
| Mecânico | revisões, ordens de serviço atribuídas e perfil | ver fila própria, iniciar, registrar e concluir trabalho | O recorte por mecânico está correto, mas há duas filas paralelas para tipos de trabalho relacionados; uma futura “Minha fila” agregada reduziria troca de tela |

## Principais problemas encontrados

1. **P1 — Atalhos quebrados no painel do cliente.** “Rastrear pedido”, “Suporte”, “Ver todos”, “Fazer primeiro pedido” e o rastreamento do card recente não levam ao destino prometido.
2. **P1 — Operação fragmentada no painel do lojista.** Pedidos, orçamentos, clientes, estoque e revisões possuem telas próprias, mas o dashboard não reúne as pendências com ações diretas; o usuário precisa interpretar indicadores e procurar o módulo correto.
3. **P1 — Falhas silenciosas no dashboard do cliente.** Erros de pedidos, favoritos ou cupons são apenas registrados no console, deixando contagens zeradas sem explicar ao usuário.
4. **P2 — Dashboard administrativo faz carga ampla e mascara falhas.** Sete recursos são carregados juntos na entrada e cada falha é convertida em lista vazia, o que pode apresentar “zero” como se fosse dado real.
5. **P2 — Organização por módulos expõe a arquitetura interna.** Orçamentos, pedidos, ordens de serviço e revisões são etapas relacionadas da jornada de atendimento, mas permanecem distribuídas em menus separados. A consolidação completa exige preservar permissões e regras de transição.
6. **P1 — Área do cliente duplicada e parcialmente órfã.** `/my-account` repetia pedidos e orçamentos do painel principal; notificações, apesar de possuírem API completa, só existiam nessa página sem entrada no menu do cliente.
7. **P2 — Duas filas no painel do mecânico.** Revisões e ordens de serviço são atribuídas ao mesmo profissional, mas exigem alternância de página e não oferecem priorização conjunta.
8. **P2 — Contexto do cliente espalhado no lojista.** Cadastro, pedidos, relacionamento, suporte, fidelidade e veículos existem, mas não há uma visão única orientada ao atendimento daquele cliente.

## Oportunidades de melhoria

| ID | TIPO | SITUAÇÃO ATUAL | OPORTUNIDADE | ESFORÇO ELIMINADO | BENEFÍCIO | SOLUÇÃO | PRIORIDADE | RISCO | TESTE | STATUS |
|---|---|---|---|---|---|---|---|---|---|---|
| OP-01 | JUNTAR / ANTECIPAR | Indicadores administrativos são passivos e as pendências ficam em módulos separados | Transformar o dashboard em central de trabalho com pendências clicáveis e criação rápida | Interpretar métricas, abrir menu e procurar a tela | Próxima ação evidente e menos navegação | Bloco “Central de ações” com pedidos, orçamentos e estoque pendentes, mais CTAs de criação | P1 | Baixo | Teste de navegação e build | DONE |
| OP-02 | ELIMINAR | Atalhos do cliente têm handlers vazios ou botões sem ação | Conectar cada CTA ao fluxo já existente | Procurar manualmente pedidos, suporte ou loja | Fluxos importantes em um clique | Navegação por URL/aba e links funcionais | P1 | Baixo | Teste de interação | DONE |
| OP-03 | ANTECIPAR | Falha parcial vira zero sem contexto | Exibir aviso recuperável e permitir tentar novamente | Dúvida e repetição sem diagnóstico | Confiança nos dados e recuperação clara | Estado de erro agregado no dashboard do cliente | P1 | Baixo | Teste de erro e retry | DONE |
| OP-04 | JUNTAR | Pedido, orçamento, OS e revisão formam uma jornada, mas são quatro destinos | Evoluir para uma central de atendimentos com visão unificada e abas/filtros preservando telas atuais | Alternância constante de módulo e perda de contexto | Operação orientada à jornada | Rota agregadora no frontend reutilizando contratos, permissões e telas existentes | P2 | Baixo | Build, rotas e navegação | DONE |
| OP-05 | AUTOMATIZAR | Dashboard administrativo baixa dados de módulos sem relação com a tela atual | Carregar por contexto e distinguir indisponível de vazio | Espera e requisições desnecessárias | Entrada mais rápida | Matriz de necessidades por rota; central carrega pedidos/orçamentos e módulos especialistas carregam seus próprios dados | P2 | Baixo | Teste unitário da matriz e build | DONE |
| OP-06 | JUNTAR / ELIMINAR | `/my-account` duplica pedidos e orçamentos e isola notificações | Incorporar notificações ao painel principal e manter a URL antiga como compatibilidade | Descobrir e alternar entre duas áreas de conta | Uma única área do cliente sem perda funcional | Nova aba Notificações e redirect compatível | P1 | Baixo | Build e navegação | DONE |
| OP-07 | JUNTAR | Mecânico possui filas separadas de revisões e OS | Criar “Minha fila” com os dois tipos de trabalho no mesmo destino | Alternar páginas principais | Trabalho reunido sem ampliar permissões | Página única com abas de Revisões e OS, mantendo rotas legadas | P2 | Baixo | Teste de rotas e build | DONE |
| OP-08 | JUNTAR / ANTECIPAR | Atendimento ao cliente está espalhado por módulos administrativos | Workspace 360º com resumo e dados contextuais | Buscar pedidos e veículos separadamente | Atendimento mais rápido e com contexto | Evolução do modal existente para contato, indicadores, veículos e pedidos | P2 | Baixo | Build e contrato existente | DONE |
| OP-09 | SIMPLIFICAR | Cada painel fazia parte do carregamento inicial, mesmo sem ser acessado | Dividir o JavaScript por painel e carregar sob demanda | Download e processamento de telas fora da jornada atual | Entrada sensivelmente mais leve | Rotas principais com `React.lazy` e fallback unificado | P2 | Baixo | Build de produção | DONE |
| OP-10 | CORRIGIR | A suíte de Favoritos usava Jest e contratos antigos em um projeto Vitest | Reescrever a cobertura conforme o contexto e os endpoints atuais | Diagnóstico manual e testes inutilizáveis | Regressões detectadas automaticamente | Seis cenários de autenticação, carga, busca, disponibilidade, vazio e retry | P1 | Baixo | Suíte Vitest completa | DONE |
| OP-11 | SIMPLIFICAR / ANTECIPAR | O painel do cliente começava por métricas e benefícios antes de perguntar o objetivo | Priorizar três intenções frequentes e deixar informações secundárias sob demanda | Ler cards e procurar o módulo correto | Decisão imediata para comprar, acompanhar ou cuidar do veículo | Bloco orientado a objetivos e resumo progressivo recolhível | P1 | Baixo | Teste de interação, build e responsividade estrutural | DONE |
| OP-12 | SIMPLIFICAR | O dashboard lojista mostrava ações, oito métricas, atividades e notificações ao mesmo tempo | Manter pendências e criação no primeiro plano e recolher a visão analítica | Varredura visual de conteúdo não necessário para operar | Tela inicial mais limpa e focada no trabalho atual | Indicadores e atividades preservados em painel progressivo | P1 | Baixo | Build | DONE |
| OP-13 | ELIMINAR | Criar pedido e orçamento exigia navegar por quatro etapas | Consolidar os dados finais sem remover campos ou validações | Uma troca de etapa em cada criação | Fluxos principais concluídos em três etapas | Pedido: cliente → itens → entrega/pagamento; orçamento: cliente → serviços → preços/entrega | P1 | Médio | Build e suíte frontend | DONE |
| OP-14 | SIMPLIFICAR | Menus misturavam termos técnicos, descrições repetitivas e conta pessoal antes das tarefas | Usar linguagem comum, ordem orientada à jornada e navegação compacta | Leitura e interpretação desnecessárias | Menos poluição e localização mais rápida | “Dashboard” vira “Início/Visão geral”; perfil vai ao fim e menu cliente usa uma linha por destino | P2 | Baixo | Lint focado, build e suíte frontend | DONE |

## Plano de execução

| ID | PRIORIDADE | PROBLEMA | SOLUÇÃO | ARQUIVOS/ÁREAS | RISCO | TESTE | STATUS |
|---|---|---|---|---|---|---|---|
| UX-01 | P1 | CTAs do dashboard do cliente não funcionam | Injetar navegação da página e ligar todos os atalhos aos fluxos reais | `CustomerPanel.tsx`, `CustomerDashboard.tsx` | Baixo | Vitest/Testing Library e build | DONE |
| UX-02 | P1 | Dashboard do lojista informa, mas não orienta nem executa | Adicionar central de ações contextual e clicável reutilizando modais e tabs existentes | `AdminContent.tsx` | Baixo | Teste de render/navegação e build | DONE |
| UX-03 | P1 | Erros parciais aparecem como contagem zero | Manter dados disponíveis, exibir aviso e ação de recarga | `CustomerDashboard.tsx` | Baixo | Teste de falha parcial | DONE |
| UX-04 | P1 | Duas áreas do cliente e notificações sem navegação | Mover notificações para o painel principal e redirecionar a rota legada | navegação, `CustomerNotifications.tsx`, `App.tsx` | Baixo | Build e rota | DONE |
| QA-01 | P1 | Pouca cobertura dos fluxos modificados | Criar testes focados nos CTAs e estados de erro | testes do frontend | Baixo | `vitest run` focado | DONE |
| QA-02 | P1 | Teste de Favoritos incompatível com Vitest e com a implementação atual | Substituir expectativas obsoletas por cenários de comportamento atuais | `CustomerFavorites.test.tsx` | Baixo | Suíte Vitest completa | DONE |
| PERF-01 | P2 | Todos os painéis faziam parte do chunk inicial | Carregar painéis sob demanda por rota | `App.tsx` | Baixo | Build e inspeção dos chunks | DONE |
| UX-05 | P1 | Dashboards densos priorizam informação em vez da próxima ação | Aplicar divulgação progressiva e três objetivos principais | dashboards cliente e lojista | Baixo | Teste de interação e build | DONE |
| UX-06 | P1 | Assistentes comerciais ultrapassam três etapas | Unir fechamento e dados complementares na terceira etapa | `CreateOrderModal.tsx`, `CreateQuoteModal.tsx` | Médio | Build e suíte frontend | DONE |
| UX-07 | P2 | Navegação usa linguagem técnica e itens altos | Simplificar rótulos, ordem e densidade sem remover destinos | navegação do cliente e lojista | Baixo | Lint focado e build | DONE |
| TD-01 | P1 | Frontend acumulava 278 erros de lint, principalmente `any` explícito e tratamento inseguro de falhas | Normalizar erros desconhecidos, substituir `any`, corrigir colisões e falhas sintáticas | APIs, hooks, componentes e utilitários do frontend | Médio | Lint completo, build e testes | DONE |
| TD-02 | P1 | 54 efeitos possuem dependências incompletas e podem usar closures antigas | Estabilizar callbacks e corrigir dependências por fluxo | hooks, contextos e componentes React | Médio | Lint com zero avisos, build e testes | DOING |
| TD-03 | P1 | Backend possuía script Jest, mas nenhuma configuração ou teste | Configurar Jest/ESM e iniciar cobertura dos contratos fundamentais | backend, scripts raiz | Baixo | Jest backend e teste raiz | DONE |
| TD-04 | P1 | Frontend compila via Vite sem gate TypeScript e possui contratos divergentes | Corrigir contratos e adicionar typecheck obrigatório | frontend | Alto | `tsc -b` | TODO |
| TD-05 | P2 | Chunk sob demanda do lojista permanece com cerca de 1,87 MB | Dividir módulos administrativos internos sob demanda | painel lojista | Médio | Build e inspeção dos chunks | TODO |
| DOC-01 | P2 | Evidências e limites precisam refletir o estado final | Atualizar este plano e criar relatório final | `docs/` | Baixo | Revisão final | DONE |

## Ordem de implementação

1. Corrigir navegação e recuperação de erro do dashboard do cliente.
2. Criar central de ações no dashboard do lojista, sem remover módulos existentes.
3. Adicionar testes focados e executar lint/build/testes aplicáveis.
4. Corrigir regressões, validar responsividade por inspeção/execução e finalizar documentação.

## Itens que não serão alterados

- Nenhuma tela, entidade, integração ou permissão existente será removida.
- A central visual preserva os contratos especialistas; uma timeline transacional cruzada não será simulada no navegador sem um contrato agregado e paginado no backend.
- Banco, migrations, Docker e configurações externas serão preservados porque as melhorias executáveis desta etapa são de fluxo e navegação.
- Alterações preexistentes em `.claude/settings.local.json` e `docker-compose.production.yml` não serão modificadas.

## Bloqueios reais

Nenhum para as melhorias seguras executadas. Uma futura timeline transacional cruzada exige contrato agregado e validação das regras operacionais, mas não impede a Central de Atendimentos entregue nesta rodada.
