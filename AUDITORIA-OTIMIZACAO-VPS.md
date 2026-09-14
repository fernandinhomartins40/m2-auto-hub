# Auditoria de Otimização — VPS e Aplicação

**Projeto:** m2-auto-hub (stack `m2centerauto` na VPS)
**Data:** 2026-09-14
**Escopo:** diagnóstico apenas — nenhuma implementação realizada
**VPS:** Hostinger KVM 4 — 4 vCPUs, 16 GB RAM, Ubuntu 22.04, disco 194 GB

---

## Nota metodológica — leia antes

Cada achado está marcado com a origem da evidência:

- **[MEDIDO]** — verificado por acesso direto à VPS ou ao repositório nesta auditoria.
- **[CÓDIGO]** — confirmado por leitura do código-fonte; o efeito em produção é dedução técnica sólida, mas o número exato não foi medido.
- **[A VALIDAR]** — hipótese que exige medição antes de virar decisão.

**Limitação relevante desta auditoria — e por que o peso está no código:**

A VPS está sob **limitação de CPU a 20% imposta pela Hostinger**. Isso contamina toda medição de runtime: um `du` que dá timeout não prova que o diretório é grande nem pequeno, prova apenas que a máquina está lenta. O daemon do Docker esteve travado para operações de container durante toda a análise (`docker logs` e `docker inspect` sem retorno após 10+ minutos).

Por isso esta auditoria **baseia-se primariamente no código-fonte**, onde a evidência é determinística e não depende do estado da máquina. As medições de runtime aparecem apenas como apoio, e **apenas quando são leituras instantâneas de metadados** — não varreduras:

- **Confiáveis mesmo sob throttling:** `free -m` (leitura de `/proc`), estado de containers (`docker ps`), `du` em 3 diretórios pequenos que retornou completo.
- **NÃO confiáveis, descartadas:** `du -sh /var/lib/docker` (timeout duplo), `find` por logs grandes (varredura longa que pode ter sido interrompida sem aviso). **Não trato o resultado vazio desse `find` como prova de ausência.**

Onde só a medição responderia, o item fica **[A VALIDAR]** — a ser refeito quando o throttling sair.

**Alterações já feitas nesta sessão (antes deste pedido de auditoria):** dois arquivos foram modificados ao investigar o crash-loop — `docker-compose.production.yml` (limites de memória + política de restart) e `deploy-vps.sh` (trap de limpeza). Estão descritos na Etapa 1 do plano. Não foram commitados. Se preferir a auditoria com a base intocada, basta reverter os dois.

---

## 1. Resumo executivo

A aplicação não consome muitos recursos por ser pesada em si. Ela consome porque **quatro mecanismos de contenção que deveriam existir não existem** — e, na ausência deles, falhas normais viram consumo permanente.

**Causa imediata do consumo atual (não é desperdício estrutural, é um incidente em curso):**

O container `m2centerauto-backend-1` está em crash-loop desde aproximadamente 26 de agosto — cerca de **três semanas**. Ele sobe, falha no bootstrap, sai com código 1, e o Docker o relança imediatamente, para sempre. Cada ciclo paga o custo de inicializar um processo Node completo. O serviço está 100% fora do ar esse tempo todo e mesmo assim queimando CPU continuamente.

Importante corrigir um diagnóstico anterior que circulou: **isto não é OOM (falta de memória)**. A medição na VPS mostra exit code **1** (que é o `process.exit(1)` do tratamento de erro da própria aplicação) e **7,4 GB de RAM livres de 16 GB**. Não há pressão de memória.

**A causa-raiz, identificada pelo código (§2.2):** a release em produção (`eaa925f`) alterou **apenas arquivos de frontend** — nenhum arquivo do backend. O backend quebrou sem que seu código mudasse. O motivo é que o build do backend **não é reprodutível**: `apps/backend/Dockerfile:13` usa `npm install` sem lockfile (o lock do monorepo está na raiz e nunca é copiado), e **19 das 20 dependências usam `^`**. Cada build resolve versões do zero — alguma release publicada no npm entre 19/08 e 26/08 entrou sem revisão e quebrou o boot.

Isso é corrigível de forma definitiva com lockfile + `npm ci` + Prisma em versão exata. **Sem essa correção, o próximo deploy pode repetir o mesmo incidente.**

**Por que um deploy falho virou três semanas de queima de CPU** — as quatro ausências:

| Ausência | Consequência |
|---|---|
| Nenhum limite de memória em nenhum dos 8 serviços | Um vazamento aqui consome RAM da VPS inteira; o kernel pode matar containers **de outros projetos** |
| `restart: unless-stopped` no backend | Falha permanente vira loop infinito; o Docker nunca desiste |
| Deploy falho não derruba o que subiu | Stack meio-vivo fica semanas rodando sem ninguém notar |
| Nenhuma retenção de log nos containers | Driver `json-file` é ilimitado por padrão; o crash-loop escreve stack traces sem teto |

A quarta ausência combinada com a primeira é a explicação mais provável para o disco em 84%: um processo falhando a cada poucos segundos, por três semanas, gravando log sem limite.

**Desperdício estrutural permanente — os dois achados de maior valor, ambos no código:**

Além do incidente, a auditoria encontrou dois mecanismos que consomem recursos continuamente, por projeto, e que continuariam consumindo mesmo depois do crash-loop resolvido:

1. **Middleware RLS que paga uma query extra ao banco por operação de revisão — sem obter nada em troca** (§3.2-b). São 64 pontos de código afetados. O parâmetro configurado se perde antes de ser lido, e as policies que o leriam nunca executam (o Prisma conecta como owner das tabelas, e owner ignora RLS). **Isto também significa que as policies RLS não estão protegendo nada — é uma questão de segurança, não só de desempenho.**

2. **Eventos de marketplace em retry infinito a cada 30 segundos** (§3.2-c). Sem contador de tentativas no schema, um evento que falha de forma permanente é reprocessado 2.880 vezes por dia, indefinidamente — cada ciclo com query no banco e chamada HTTP externa.

Os dois são verificáveis inteiramente no código-fonte, sem depender de medição na VPS.

**Sobre gordura estrutural, a notícia é boa:** a hipótese mais promissora (1,2 GB de build Flutter enviado a cada deploy) foi **refutada** (§3.1). No mais, a aplicação está razoavelmente enxuta — 20 dependências de produção, frontend com multi-stage exemplar, sem cache/filas/WebSockets desnecessários, e os 6 containers são todos justificados por uso real. **Não há containers a eliminar.**

---

## 2. Diagnóstico atual

### 2.1 Estado medido da VPS **[MEDIDO]**

Coletado em 2026-09-14, 17:43 e 18:04:

```
load average: 293 → 272 → 203      (4 vCPUs)
RAM:   15.988 MB total, 7.767 usados, 7.431 disponíveis
Disco: 162 GB de 194 GB usados (84%)
uptime: 144 dias
```

Estado dos containers do nosso stack:

```
m2centerauto-backend-1        Restarting (1)          ← crash-loop, exit 1
m2centerauto-gateway-1        Up 2 weeks (unhealthy)
m2centerauto-frontend-1       Up 2 weeks (unhealthy)
m2centerauto-plate-scraper-1  Up 2 weeks (unhealthy)
m2centerauto-alpr-1           Up 2 weeks (unhealthy)
m2centerauto-postgres-1       Up 4 months (unhealthy)
```

Todas as imagens na tag `eaa925f-20260826135333` — **26 de agosto**.

**Leitura destes dados:**

- **RAM sobrando (7,4 GB livres)** descarta OOM como causa do crash-loop. Este é o dado que contradiz o diagnóstico anterior.
- **Load 203–293 com RAM sobrando** indica saturação de CPU e/ou I/O, não de memória. Coerente com crash-loop (CPU) + daemon Docker travado (I/O).
- **Todos os serviços `unhealthy`, um há 4 meses.** O `frontend` e o `gateway` declaram `depends_on: backend condition: service_healthy` — como o backend nunca ficou saudável, o stack inteiro está degradado desde o deploy de 26/08.
- **O daemon Docker travado** enquanto o resto do sistema responde é sintoma clássico de pressão de I/O em `/var/lib/docker` — consistente com disco em 84% e logs sem limite.

### 2.2 Causa do crash-loop — análise pelo código **[CÓDIGO — confiança ALTA]**

Como o log do container está inacessível (daemon travado + throttling), rastreei a causa pelo código e pelo histórico do git. O resultado é conclusivo o bastante para agir.

#### A pista decisiva: o backend quebrou sem que seu código mudasse

As três releases presentes na VPS são todas de 26/08. Inspecionando o que cada commit alterou:

| Release | Commit | Arquivos alterados |
|---|---|---|
| `16c03b4` | fix: consulta online de placas… | frontend + backend |
| `914d8e0` | refactor: substitui modais de OS… | **5 arquivos, 100% frontend** |
| `eaa925f` | fix: paginas de OS ocupam a tela… | **5 arquivos, 100% frontend** |

A release em produção (`eaa925f`) **não alterou um único arquivo do backend**. Ainda assim o backend está em crash-loop desde então. Um serviço que quebra sem que seu código mude aponta para o **ambiente de build**, não para a lógica da aplicação.

#### A causa: build do backend não é reprodutível

**Evidência [CÓDIGO] — dois defeitos que se combinam:**

**1. O lockfile nunca chega ao build do backend.**

`apps/backend/Dockerfile:12-13`:
```dockerfile
COPY package*.json ./
RUN npm install --prefer-offline --no-audit --no-fund
```

Não existe `apps/backend/package-lock.json` — confirmado, o arquivo não está no disco. O lockfile do monorepo está na **raiz**, e o build do backend usa `context: ./apps/backend` (`docker-compose.production.yml`), que não enxerga a raiz. Logo o `COPY package*.json` copia apenas o `package.json`, sem lock algum.

**2. `npm install` em vez de `npm ci`, com 19 de 20 dependências flutuantes.**

`npm install` sem lockfile **resolve as versões do zero a cada build**. E as dependências usam caret:

```
@prisma/client ^5.19.0    express ^4.19.2      sharp ^0.33.5
zod ^3.23.8               helmet ^7.1.0        multer ^1.4.5-lts.1
... 19 de 20 com ^, apenas playwright está fixa em 1.59.1
```

**Prova de que a flutuação é real:** `^5.19.0` de `@prisma/client` já resolveu para **5.22.0** no ambiente local desta auditoria.

**Consequência:** dois builds do mesmo commit produzem imagens diferentes. Qualquer release publicada no npm entre 19/08 e 26/08 entrou no build de 26/08 sem passar por nenhuma revisão — e uma delas provavelmente quebrou o boot.

#### Agravante específico do Prisma

`@prisma/client` (dependency) e `prisma` CLI (devDependency) são **ambos** `^5.19.0`, resolvidos de forma independente. O Dockerfile roda `npx prisma generate` no estágio de build e `node dist/server.js` em produção. Se o CLI e o client resolverem para versões diferentes, o cliente gerado diverge do runtime — e a falha aparece **no boot**, com exceção capturada pelo `catch` de `server.ts:74` → `process.exit(1)`. É exatamente o exit code medido.

#### Hipóteses ordenadas por probabilidade

1. **Dependência flutuante quebrou o boot** — 🔴 mais provável. Explica quebrar sem mudança de código.
2. **Divergência entre `prisma` CLI e `@prisma/client`** — 🔴 caso particular da anterior, com mecanismo conhecido.
3. **Variável de ambiente inválida no `.env` da VPS** — 🟠 plausível: `validate-env.ts:50` faz `process.exit(1)` se `JWT_SECRET` tiver menos de 32 caracteres ou contiver `dev_2026`. Mas não explica por que quebrou no deploy de 26/08 sem alguém ter editado o `.env`.
4. **Falha de conexão ao banco** — 🟢 improvável: o postgres está de pé e o compose só sobe o backend com `condition: service_healthy`.

#### Correção proposta

**Imediata (diagnóstico):** ler o log do container. As mensagens são distintivas — `validate-env.ts` imprime `Configuration errors detected:` com a lista; uma falha de dependência aparece como stack trace de módulo.

**Estrutural (impede a reincidência) — esta é a correção de verdade:**

1. Gerar `package-lock.json` para o backend e **copiá-lo no Dockerfile**.
2. Trocar `npm install` por **`npm ci`** — falha explicitamente se lock e `package.json` divergirem, em vez de silenciosamente instalar outra coisa.
3. Fixar `@prisma/client` e `prisma` na **mesma versão exata**, sem caret.

Sem isso, o próximo deploy pode quebrar pelo mesmo motivo, e o anterior teria como se comportar de forma idêntica. **Esta é a correção de maior valor desta auditoria** — não economiza recurso diretamente, mas elimina a classe de falha que gerou três semanas de crash-loop.

---

### 2.2-b Referência: os dois pontos que produzem exit 1 **[CÓDIGO]**

O exit code 1 medido corresponde a exatamente dois pontos no código:

1. `apps/backend/src/config/validate-env.ts:50` — `process.exit(1)` quando a validação de ambiente encontra erro.
2. `apps/backend/src/server.ts:74-76` — o `catch` do bootstrap, que também sai com 1.

As validações que disparam saída em `validate-env.ts` são: `DATABASE_URL` ausente, `JWT_SECRET` ausente ou com menos de 32 caracteres, `PORT` ausente, `JWT_SECRET` contendo `dev_2024`/`dev_2026` em produção, ou credenciais padrão de banco em produção.

Note que `docker-compose.production.yml:11` fornece um default de `JWT_SECRET` com 42 caracteres que **passaria** na validação. Ou seja: se o `.env` da VPS define um `JWT_SECRET` curto ou de desenvolvimento, ele **sobrescreve** o default e causa exit 1 em loop. Esta é a hipótese mais provável, mas **exige leitura do log do container para confirmar** — o que o daemon travado impediu.

Os demais passos do bootstrap que podem lançar exceção e cair no `catch`: `connectDatabase()`, `ensureEssentialData()`, `setupPrismaRLS()`.

### 2.3 Consumo de disco — hipótese principal **[A VALIDAR]**

**O que foi descartado por medição [MEDIDO]:**

- **Releases da aplicação:** 25 MB no total. Irrelevante (§3.1).
- **Logs de container gigantes:** `find /var/lib/docker/containers -name '*-json.log' -size +100M` retornou **vazio**. Nenhum log de container passa de 100 MB — incluindo o do backend em crash-loop. A hipótese de "log sem retenção encheu o disco" **não se sustenta** para o nosso stack.

**O que resta como hipótese [A VALIDAR]:**

Os 162 GB estão em algum lugar que não é a nossa aplicação. `du -sh /var/lib/docker` deu timeout duas vezes, então não pude quantificar. Candidatos, em ordem:

1. **Imagens Docker acumuladas** — a VPS tem 87 containers de 9 projetos. Três versões distintas de Playwright só no nosso stack (§3.2), cada uma com Chromium+Firefox+WebKit sem compartilhar camadas. Multiplicado por 9 projetos com práticas semelhantes, é o candidato mais forte.
2. **Volumes órfãos e build cache** — `docker system df` responderia, mas o daemon está travado.
3. **Outros projetos da VPS** — fora do escopo desta auditoria, mas provavelmente a maior fatia.

**Conclusão honesta:** a contribuição do m2centerauto para os 162 GB é, pelo que consegui medir, **pequena em releases e logs**. A parte relevante seria em imagens — e é justamente o que não pude medir. Ainda assim, mesmo sem limite de retenção configurado, o volume de log observado é baixo; a recomendação de configurar `logging` segue válida como prevenção, não como correção de um problema já materializado.

### 2.4 Consumo de CPU

| Fonte | Evidência | Natureza |
|---|---|---|
| Crash-loop do backend | **[MEDIDO]** — `Restarting (1)` | Incidente — some ao corrigir |
| Healthchecks em 5 containers doentes | **[CÓDIGO]** — intervalos de 5s a 15s | Permanente, baixo, mas inútil no estado atual |
| 3 timers de marketplace | **[CÓDIGO]** — `marketplace.jobs.ts:27,33,39` | Permanente (30s / 5min / 1h) |
| 1 timer de limpeza de temporários | **[CÓDIGO]** — `upload.middleware.ts:181` | Permanente (1h) — barato e útil |

O healthcheck do postgres roda a cada **5 segundos** (`docker-compose.production.yml:48`) — o mais agressivo do stack, para um serviço que raramente muda de estado.

---

## 3. Recursos desnecessários

Cada item traz a evidência e o nível de confiança. **Nada aqui é recomendação de deletar sem verificação.**

### 3.1 Build Flutter — ❌ **HIPÓTESE REFUTADA POR MEDIÇÃO**

Registro este item porque a hipótese era forte e foi derrubada por medição — e porque ela ilustra o risco de auditar só pelo código.

**A hipótese era:** `apps/mobile/build` ocupa **1,2 GB** (97% do repositório local, medido) e o tar do deploy (`.github/workflows/deploy-production.yml:54-66`) não tem `--exclude=apps/mobile`. Logo, 1,2 GB seriam enviados a cada deploy e mantidos em 3 releases — ~3,6 GB na VPS.

**A medição na VPS refuta [MEDIDO]:**

```
8.1M  /opt/m2centerauto/releases/16c03b4-20260826123257
8.1M  /opt/m2centerauto/releases/914d8e0-20260826133626
8.1M  /opt/m2centerauto/releases/eaa925f-20260826135333
25M   /opt/m2centerauto   (total)
```

**Por que a hipótese falhou:** `apps/mobile/build` está listado em `apps/mobile/.gitignore:34`. O deploy roda no GitHub Actions, que faz checkout limpo do repositório — o diretório `build/` nunca existe no runner, então o tar não tem o que empacotar. O 1,2 GB existe **apenas na máquina de desenvolvimento local**.

**Conclusão:** as releases na VPS ocupam 25 MB no total. **Não há nada a otimizar aqui.** O `--exclude=apps/mobile` no tar continua sendo boa prática defensiva (custo zero), mas o ganho é nulo, não 3,6 GB.

**Lição para o resto desta auditoria:** todo item marcado [CÓDIGO] carrega este mesmo risco. Foi por isso que separei origem das evidências.

### 3.2 Três versões de Playwright — 🔴 **Confiança: ALTA no diagnóstico, [A VALIDAR] no tamanho**

**Evidência [MEDIDO no código]:**

| Arquivo | Versão base | Usado? |
|---|---|---|
| `apps/backend/Dockerfile:1` | `playwright:v1.59.1-jammy` | Sim |
| `services/plate-scraper/Dockerfile:1` | `playwright:v1.49.1-jammy` | Sim |
| `apps/backend/Dockerfile.base:1` | `playwright:v1.58.2-jammy` | **Não — órfão** |

`Dockerfile.base` tem **zero referências** em todo o repositório (busca recursiva confirmada). É arquivo morto.

Cada imagem `mcr.microsoft.com/playwright:*-jammy` traz Chromium, Firefox e WebKit completos. Versões diferentes **não compartilham camadas** — cada uma ocupa espaço integral.

**Duas oportunidades distintas:**
- **Alinhar as versões** de backend e plate-scraper faz as duas imagens compartilharem a camada base. Ganho real em disco, risco baixo.
- **Remover os navegadores não usados.** O backend usa apenas `chromium` (`pdf-generator.service.ts:58`); o plate-scraper também. Firefox e WebKit são peso morto nas duas imagens.

**Importante — o que NÃO fazer:** trocar a base Playwright por uma imagem magra quebraria a geração de PDF e a consulta de placas. Ambos os usos são reais e verificados.

### 3.2-b Middleware RLS: uma query extra por operação, sem efeito algum — 🔴 **Confiança: ALTA**

**Este é o achado de maior valor da auditoria.** É desperdício permanente, independe do incidente atual e é 100% verificável no código.

**Evidência [CÓDIGO]:**

`apps/backend/src/middlewares/prisma-rls.middleware.ts:22-35` registra um middleware Prisma que, a cada operação sobre o modelo `Revision`, executa **uma query adicional** ao banco:

```ts
if (params.model === 'Revision' && context) {
  await prisma.$executeRaw`
    SELECT set_config('app.current_user_id', ${context.adminId}, true),
           set_config('app.current_role', ${context.adminRole}, true)
  `;
}
return next(params);
```

Há **64 operações `prisma.revision.*`** no código. Cada uma, em rota autenticada, custa **duas idas ao banco** em vez de uma.

**Por que o custo não compra nada — dois defeitos independentes, cada um suficiente:**

1. **O parâmetro se perde antes de ser usado.** O terceiro argumento `true` em `set_config` torna o valor **local à transação**. O `$executeRaw` roda em sua própria transação implícita e a encerra imediatamente. A query seguinte (`next(params)`) é outra transação, e o Prisma usa **pool de conexões** (`database.ts:12`) — pode nem ser a mesma conexão. Quando a policy avalia `current_setting('app.current_user_id', true)`, recebe **NULL**.

2. **As policies nunca são avaliadas.** O Prisma conecta como o usuário `m2` (`docker-compose.production.yml:10`), que é o **owner** das tabelas. No PostgreSQL, o owner **ignora RLS** por padrão; só `FORCE ROW LEVEL SECURITY` mudaria isso, e a migration (`20260421000000_init/migration.sql:1039`) usa apenas `ENABLE`.

**Conclusão:** paga-se uma query extra por operação de revisão para configurar um parâmetro que se perde, destinado a policies que nunca executam.

**Implicação de segurança que precisa ser dita:** as policies RLS de `revisions` **não estão protegendo nada hoje**. Se a intenção era restringir mecânicos às próprias revisões, essa restrição precisa existir na camada de aplicação — vale verificar se já existe em paralelo. **Isto não é um problema de performance; é uma expectativa de segurança não cumprida.**

**Recomendação:** decidir entre (a) remover o middleware e manter a autorização na aplicação, ou (b) fazer o RLS funcionar de verdade (conectar com role não-owner + `set_config` dentro da mesma transação via `$transaction`). A opção (a) é muito mais simples; a (b) só se houver requisito real de defesa em profundidade no banco. **Não implemente (a) sem antes confirmar que a autorização equivalente existe na aplicação.**

### 3.2-c Eventos de marketplace: retry infinito a cada 30 segundos — 🔴 **Confiança: ALTA**

**Evidência [CÓDIGO]:**

`event-processor.service.ts:17-45` roda a cada 30s (`marketplace.jobs.ts:27`). No caminho de falha:

```ts
} catch (err) {
  await prisma.marketplaceEvent.update({
    where: { id: event.id },
    data: { error: String(err) },     // grava o erro...
  });                                  // ...mas NÃO marca processed: true
}
```

O schema de `MarketplaceEvent` (`schema.prisma:629`) **não possui campo `attempts` ou `retryCount`** — confirmado por leitura completa do modelo. Nada limita as tentativas.

**Consequência:** um evento que falha de forma permanente (pedido removido no marketplace, conexão revogada, payload inválido) é reprocessado **a cada 30 segundos, para sempre**. Cada ciclo custa: uma query de busca, uma chamada HTTP à API externa do marketplace, e um `UPDATE` no banco.

Com N eventos permanentemente falhos, são N chamadas externas + 2N queries a cada 30s — **2.880 ciclos por dia, por evento**, indefinidamente. É consumo de CPU, rede e I/O que cresce monotonicamente e nunca se resolve sozinho.

**Correção proposta:** adicionar contador de tentativas e mover para estado morto (dead-letter) após um limite (ex.: 5), com backoff exponencial entre tentativas. **Nenhuma funcionalidade é perdida** — eventos válidos continuam processando normalmente; apenas os irrecuperáveis param de consumir recursos e ficam visíveis para inspeção.

### 3.3 Seed de dados de demonstração em produção — 🟠 **Confiança: ALTA**

**Evidência [CÓDIGO]:**
- `apps/backend/src/scripts/bootstrap-production.ts:17` — `if (process.env.SEED_DEMO_DATA !== 'false')` executa `ensureDemoData()`.
- `apps/backend/src/bootstrap/demo-data.ts` tem **934 linhas** de seed.
- `SEED_DEMO_DATA` **não é definida** no workflow de deploy — confirmado por busca.

**Conclusão:** dados de demonstração são semeados no banco do cliente a cada deploy, por default. O padrão está invertido: demo deveria exigir opt-in, não opt-out.

**[A VALIDAR]:** quanto do banco atual é dado de demo. Exige inspeção do banco em produção. **Não proponho apagar nada** — a proposta é inverter o default para deploys futuros e, separadamente, avaliar o que já existe.

### 3.4 Código morto: limpeza de notificações — 🟢 **Confiança: ALTA**

**Evidência [CÓDIGO]:** `notifications.service.ts:595` define `deleteOldNotifications(daysOld = 30)`. Busca recursiva confirma: **nenhuma chamada em todo o repositório**.

A função está correta — só nunca é executada. A tabela `Notification` cresce indefinidamente. Aqui a correção não é remover código, é **passar a chamá-lo**.

### 3.5 `console.log` em produção — 🟢 **Confiança: MÉDIA**

**Evidência [MEDIDO]:** 18 ocorrências de `console.log` em `apps/backend/src`, convivendo com o logger Winston configurado. Contribuem para o volume de log de container (que não tem retenção). Impacto individual pequeno.

### 3.6 O que foi verificado e **NÃO** deve ser removido

Registro explícito, porque a pergunta "dá para reduzir containers?" tem resposta negativa aqui:

| Componente | Veredito | Evidência |
|---|---|---|
| `alpr` (reconhecimento de placa) | **Manter** | Usado por 5 arquivos, incl. `alpr.service.ts` e `license-plate.util.ts` |
| `plate-scraper` (consulta de placa) | **Manter** | Usado por `plate-lookup.service.ts`; é fallback do fluxo assistido |
| `playwright` no backend | **Manter** | Geração de PDF — `pdf-generator.service.ts:57` |
| `postgres` | **Manter** | Banco da aplicação |
| `frontend` + `gateway` | **Fundidos** (14/09) | Eram dois nginx: o `gateway` só repassava o tráfego ao `frontend`. Unificados em um container — menos um serviço e menos um salto de rede por request, sem perder função. O `infra/nginx` segue em uso pelo compose de desenvolvimento |
| `sharp` | **Manter** | 3 usos reais de processamento de imagem |
| 20 dependências de produção do backend | **Manter** | Lista enxuta, sem gordura aparente |

**Sobre consolidar containers:** a arquitetura tem 6 serviços em execução, o que é proporcional ao que a aplicação faz. `alpr` é Python/ONNX e `plate-scraper` precisa de Chrome headful sobre Xvfb — são runtimes incompatíveis com o backend Node. Consolidá-los criaria uma imagem monolítica maior e mais frágil, sem ganho real. **Não recomendo redução de containers.**

---

## 4. Oportunidades de otimização

### 🔴 Alto impacto

| # | Otimização | Efeito | Risco |
|---|---|---|---|
| 0 | **Build reprodutível do backend** (§2.2): lockfile + `npm ci` + Prisma em versão exata | **Elimina a classe de falha que causou 3 semanas de crash-loop.** Sem isso, o próximo deploy pode repetir | Baixo |
| 1 | **Corrigir o crash-loop do backend** | Elimina a queima contínua de CPU e devolve o serviço ao ar | Baixo — ler o log ajuda, mas o item 0 ataca a raiz |
| 2 | **Remover ou consertar o middleware RLS** (§3.2-b) | Elimina **1 query extra por operação** em 64 pontos de código. Puro desperdício hoje | Médio — exige verificar autorização na aplicação |
| 3 | **Limitar retries de eventos de marketplace** (§3.2-c) | Estanca retry infinito a cada 30s: 2.880 ciclos/dia por evento falho | Baixo |
| 4 | **Limites de memória por serviço** | Impede que um vazamento afete outros projetos da VPS | Baixo — requer dimensionar |
| 5 | **`restart: on-failure:5` no backend** | Falha permanente para de virar loop infinito | Baixo |
| 6 | **Trap de limpeza no deploy falho** | Impede stack meio-vivo por semanas | Baixo |
| 7 | **Retenção de logs nos containers** (`max-size`/`max-file`) | Prevenção — driver `json-file` é ilimitado por padrão | Muito baixo |

Os itens 4, 5 e 6 **já foram aplicados** nesta sessão (ver Etapa 1). **Os itens 2 e 3 são os de maior valor ainda não implementados** — são desperdício permanente, verificável no código, e independem do estado da VPS.

> ~~Excluir `apps/mobile` do tar de deploy~~ — hipótese **refutada** (§3.1). Mantida no documento como registro.

### 🟠 Médio impacto

| # | Otimização | Efeito | Risco |
|---|---|---|---|
| 7 | **Retenção de `AuditLog`** | Tabela grava body **e** resposta em JSON, sem limite (`audit-log.middleware.ts:49`) | Médio — é trilha de auditoria; exige definir prazo legal |
| 8 | **Ativar `deleteOldNotifications`** | Função pronta, nunca chamada | Baixo |
| 9 | **Alinhar versões do Playwright** | Camada base compartilhada entre duas imagens | Baixo |
| 10 | **Remover Firefox/WebKit das imagens** | Só Chromium é usado | Baixo-médio — validar PDF e scraper |
| 11 | **Inverter default de `SEED_DEMO_DATA`** | Para de semear demo em produção | Baixo |
| 12 | **Corrigir N+1 em lembretes de revisão** | `customer-revisions.service.ts:176-186` — um `findFirst` por veículo | Baixo |

### 🟢 Baixo impacto

| # | Otimização | Efeito |
|---|---|---|
| 13 | Healthcheck do postgres de 5s → 30s | Reduz ruído e I/O constante |
| 14 | Substituir os 18 `console.log` pelo logger | Volume de log e consistência |
| 15 | Remover `apps/backend/Dockerfile.base` órfão | Higiene; evita build acidental de 3ª imagem Playwright |
| 16 | Revisar paginação | 121 `findMany`, 33 com `take:` — a maioria restante é legítima, mas vale varredura |
| 17 | Adicionar `apps/mobile/build` ao `.gitignore`/`.dockerignore` | Evita reincidência |

---

## 5. Estimativa de economia

**Honestidade sobre números:** com o daemon Docker travado, não pude medir imagens, banco nem consumo por container. Os números abaixo separam o que é aritmética verificável do que precisa de medição.

### Calculável a partir de dados medidos

| Recurso | Situação | Após | Base |
|---|---|---|---|
| **CPU — crash-loop** | Bootstrap Node em loop contínuo há 3 semanas | 0 | Eliminação do loop **[MEDIDO]** |
| **RAM — teto do stack** | Ilimitado (8 serviços) | 7,4 GB máx. | Soma dos `mem_limit` propostos |
| **Disco — releases** | 25 MB total | 25 MB | **Nada a ganhar** — medido |
| **Disco — logs do stack** | Nenhum acima de 100 MB | Teto de 30 MB/container | Prevenção, não correção |

**Correção importante sobre economia de disco:** a auditoria **não encontrou economia significativa de disco atribuível a esta aplicação**. Releases (25 MB) e logs (<100 MB cada) foram medidos e são pequenos. O único ganho potencialmente relevante está nas imagens Docker (§3.2), que não pude medir. Se você esperava recuperar dezenas de GB mexendo nesta aplicação, o dado medido não sustenta essa expectativa — os 162 GB estão majoritariamente fora dela.

### Requer medição — **[A VALIDAR]**

| Recurso | Por que não estimo |
|---|---|
| Tamanho das imagens Docker | `docker images` indisponível |
| Ganho ao alinhar Playwright | Depende do tamanho real das camadas |
| Tamanho do banco / proporção de demo | Requer acesso ao postgres |
| Volume de log acumulado | `du` em `/var/lib/docker` não retornou |
| Tempo de build/deploy | Sem baseline registrada |

**Não vou inventar percentuais.** E, com a VPS sob throttling de CPU a 20%, não arrisco estimativa agregada de disco: das fontes possíveis, só releases (25 MB) foi medida de forma confiável; a varredura de logs pode ter sido truncada pela lentidão e **não trato seu resultado como conclusivo**; e imagens Docker — o candidato mais forte — o daemon travado impediu de quantificar.

**Onde está o ganho real e verificável desta auditoria, e ele não depende de medição alguma:**

| Ganho | Base | Natureza |
|---|---|---|
| Fim do crash-loop | §2.2 — build não reprodutível | CPU contínua, mensurável pelo load average |
| Query extra eliminada em 64 operações | §3.2-b — middleware RLS inócuo | Carga permanente no banco |
| Fim do retry infinito a cada 30s | §3.2-c — sem limite de tentativas | CPU + rede + I/O permanentes |

Os três são defeitos de código, comprovados por leitura do código-fonte. Corrigi-los reduz consumo **independentemente** do que a medição de disco viesse a mostrar.

**O ganho concreto e verificável desta auditoria é em CPU, não em disco** — eliminar um crash-loop de 3 semanas em uma VPS de 4 vCPUs. Isso é medível de imediato pelo load average.

---

## 6. Riscos

### Risco 1 — Corrigir o crash-loop sem ler o log (⚠️ o mais importante)

- **Risco:** mexer no que não é a causa e deixar o problema de pé.
- **Mitigação obrigatória:** ler `docker logs m2centerauto-backend-1` **antes** de qualquer alteração. Sem isso, qualquer correção é chute.
- **Bloqueio atual:** daemon Docker não responde. Pode exigir reiniciar o daemon — o que afeta **todos os 9 projetos da VPS** e precisa da sua autorização.
- **Validação:** container em `Up (healthy)` e `/api/health` respondendo 200.
- **Rollback:** imagem anterior por tag.

### Risco 1-b — Gerar o lockfile a partir do estado errado

- **Risco:** se o `package-lock.json` for gerado agora, ele congela as versões **atuais** — que podem incluir justamente a dependência que quebrou o boot. O build vira reprodutivelmente quebrado.
- **Mitigação:** gerar o lock a partir do commit que sabidamente funcionava (`16c03b4`, anterior a 26/08), **ou** validar o conjunto atual em staging antes de ir a produção.
- **Validação:** backend sobe `healthy` com o lock aplicado; geração de PDF e consulta de placa funcionam.
- **Rollback:** remover o lock e voltar ao Dockerfile anterior.

### Risco 1-c — Remover o middleware RLS sem verificar a autorização

- **Risco:** se a restrição "mecânico vê apenas as próprias revisões" existir **somente** via RLS (ainda que hoje inoperante), removê-lo torna explícita uma exposição que hoje já existe de fato, mas sem registro.
- **Ponto importante:** a exposição **já existe hoje** — as policies não são avaliadas (§3.2-b). Remover o middleware não cria o problema, apenas para de fingir que há proteção.
- **Mitigação obrigatória:** auditar a camada de aplicação **antes** de mexer. Se a autorização não existir lá, implementá-la é prioridade de segurança — independente desta auditoria de performance.
- **Validação:** teste funcional com dois mecânicos distintos.

### Risco 2 — Limites de memória mal dimensionados

- **Risco:** teto baixo demais transforma funcionamento normal em OOM real — criando o problema que não existe hoje.
- **Afetado:** qualquer serviço; o `plate-scraper` (Chrome) é o mais sensível, por isso recebeu 2 GB.
- **Validação:** `docker stats` sob carga real por 24-48h antes de apertar qualquer teto.
- **Rollback:** remover `mem_limit` e `docker compose up -d`.

### Risco 3 — Retenção de `AuditLog`

- **Risco:** perda de trilha de auditoria pode ter implicação legal/contratual.
- **Afetado:** rastreabilidade de ações administrativas.
- **Recomendação:** **não implementar sem decisão explícita do cliente sobre o prazo.** Arquivar antes de apagar.
- **Rollback:** impossível após exclusão — por isso exige backup prévio.

### Risco 4 — Remover navegadores da imagem Playwright

- **Risco:** quebrar geração de PDF ou consulta de placas.
- **Validação:** gerar um PDF real e fazer uma consulta de placa real em staging.
- **Rollback:** reverter o Dockerfile e rebuildar.

### Risco 5 — `restart: on-failure:5`

- **Risco:** após 5 falhas o container fica parado até intervenção humana. Se ninguém monitora, uma falha transitória vira indisponibilidade prolongada.
- **Contrapartida:** é exatamente o comportamento desejado — hoje o loop infinito também é indisponibilidade, só que queimando CPU e sem sinal visível.
- **Mitigação:** um alerta simples de container parado.

### Risco 6 — Trap que derruba o stack em deploy falho

- **Risco:** um deploy que falha por motivo transitório (rede) derruba o que estava no ar.
- **Ressalva honesta:** com `compose down`, um deploy falho deixa o serviço **fora do ar** até alguém agir, em vez de deixar containers em loop. É um trade-off deliberado. O ideal seria rollback para a release anterior — mais complexo, fora do escopo desta auditoria.

---

## 7. Plano de implementação

> **Status da implementação (14/09/2026).** As Etapas 1, 2, 3, 4 e 5 foram implementadas
> e validadas localmente (`tsc --noEmit` limpo, `npm run build` OK, `npm ci` contra o novo
> lockfile OK, YAML e `bash -n` válidos). As duas etapas que dependem da VPS — Etapa 0 (ler
> o log) e Etapa 2-b (confirmar em produção) — continuam abertas, porque exigem autorização
> para mexer no servidor. O status de cada etapa está anotado abaixo.

### Etapa 0 — Desbloquear o diagnóstico ⚠️ **PRÉ-REQUISITO** — ❌ **NÃO FEITA**

- **Objetivo:** ler o log do backend e descobrir a causa real do crash.
- **Ações:** ler `/var/lib/docker/containers/e4bdca00.../` direto do disco; se falhar, reiniciar o daemon Docker (**requer sua autorização** — afeta todos os projetos).
- **Sucesso:** mensagem de erro do bootstrap identificada.
- **Sem esta etapa, a Etapa 2 não pode começar.**

### Etapa 1 — Contenção (alto impacto, baixo risco) — ✅ **IMPLEMENTADA**

> **Feito:** `mem_limit` nos 8 serviços, `restart: on-failure:5` no backend, trap de deploy
> falho em `deploy-vps.sh`, e o bloco `logging` (`max-size: 10m`, `max-file: 3`) aplicado aos
> 8 serviços via âncora `x-logging`. YAML revalidado: 8/8 com `logging`, 8/8 com `mem_limit`.
> **Não feito:** parar o stack em crash-loop na VPS (requer sua autorização) e o
> `--exclude=apps/mobile` no workflow — este último ficou sem efeito prático depois que §3.1
> refutou a hipótese do build Flutter.

- **Objetivo:** impedir que o problema se repita e devolver CPU imediatamente.
- **Já aplicado nesta sessão (não commitado):**
  - `docker-compose.production.yml` — `mem_limit` nos 8 serviços (total 7,4 GB de 16 GB)
  - `docker-compose.production.yml:114` — backend para `restart: on-failure:5`
  - `deploy-vps.sh:74-88` — trap que derruba stack parcial em deploy falho
- **Falta aplicar:**
  - Bloco `logging` com `max-size: 10m`, `max-file: 3` em todos os serviços
  - `--exclude=apps/mobile` no tar do workflow
  - Parar o stack em crash-loop na VPS (**requer sua autorização**)
- **Testes:** `docker compose config` valida; YAML já validado nesta auditoria.
- **Sucesso:** load average da VPS cai de forma sustentada.
- **Rollback:** `git revert` — os dois arquivos estão versionados.

### Etapa 2 — Build reprodutível do backend ⭐ **maior valor estrutural** — ✅ **IMPLEMENTADA**

> **Feito:** `apps/backend/package-lock.json` gerado (lockfileVersion 3, 580 pacotes),
> `COPY package.json package-lock.json` + `npm ci` no Dockerfile, e `@prisma/client` e `prisma`
> fixados ambos em **5.22.0** exato. Validado com `npm ci` real em diretório isolado: exit 0,
> cliente e CLI instalados na mesma versão.
>
> **Sobre o Risco 1-b (gerar o lock a partir do estado errado):** ele não se materializou.
> `git diff 16c03b4 HEAD -- apps/backend/package.json` é **vazio** — o `package.json` é
> idêntico entre o último release saudável e o HEAD. Não havia "estado quebrado" a evitar:
> a quebra veio da resolução em tempo de build, não do manifesto. O lock foi gerado a partir
> do manifesto atual, que é o mesmo de `16c03b4`.
>
> **Não feito (decisão consciente):** fixar as outras 17 dependências flutuantes. O lockfile
> já congela todas elas; fixar no `package.json` só acrescentaria atrito a cada atualização.

- **Objetivo:** eliminar a classe de falha que causou 3 semanas de crash-loop (§2.2).
- **Arquivos:** `apps/backend/Dockerfile`, `apps/backend/package.json`, possivelmente `docker-compose.production.yml` (contexto de build).
- **Alterações:**
  1. Gerar `apps/backend/package-lock.json` e garantir que o `COPY` do Dockerfile o inclua.
  2. `npm install` → **`npm ci`**.
  3. Fixar `@prisma/client` e `prisma` na **mesma versão exata** (sem `^`).
  4. Avaliar fixar as demais 17 dependências flutuantes.
- **Cuidados:** gerar o lock **a partir do estado que sabidamente funcionava** (release `16c03b4`, anterior à quebra) ou validar o conjunto atual em staging antes de produção. Se o contexto de build precisar mudar para a raiz do monorepo, revisar o `.dockerignore`.
- **Testes:** build local; subir o stack completo; exercitar geração de PDF e consulta de placa.
- **Sucesso:** dois builds do mesmo commit produzem imagens equivalentes; backend sobe `healthy`.
- **Rollback:** reverter Dockerfile e `package.json`; a imagem anterior permanece por tag.

### Etapa 2-b — Confirmar a causa pontual do crash atual — ❌ **NÃO FEITA** (depende da Etapa 0)

- **Depende da Etapa 0** (acesso ao log).
- **Objetivo:** confirmar qual das hipóteses de §2.2 se materializou. A Etapa 2 provavelmente já resolve; esta etapa fecha o diagnóstico.
- **Sucesso:** 6/6 containers `healthy`; `/api/health` em 200.

### Etapa 3 — Eliminar desperdício permanente no código ⭐ — ✅ **IMPLEMENTADA**

Os dois itens de maior economia contínua. Independem do estado da VPS.

> **A ordem obrigatória foi cumprida — e a resposta veio do próprio código.**
> O Risco 1-c exigia auditar a autorização por mecânico **antes** de remover o middleware.
> A verificação foi feita e a restrição **existe na camada de aplicação**:
> - `revisions.controller.ts:39-40` — para o papel `STAFF`, força `filters.mechanicId = req.admin.adminId`
> - `revisions.service.ts:37-38` — traduz esse filtro em `where.assignedMechanicId`
> - `getRevisionById`, `updateRevision` e `exportRevisionPdf` recebem `role` + `adminId` e
>   validam o acesso no service (o próprio código marca o trecho como `✅ SECURITY FIX`)
>
> Ou seja: a autorização **não** dependia do RLS — o que se removeu foi apenas o custo.
> As policies continuam no banco, inertes; nenhuma foi derrubada (isso seria mudança
> destrutiva de schema, fora do escopo autorizado). Se um dia se quiser RLS de verdade,
> será preciso `FORCE ROW LEVEL SECURITY` e um usuário de conexão que não seja o dono das
> tabelas — decisão de arquitetura, não de otimização.

**3.1 — Middleware RLS (§3.2-b)** — ✅ feito: `$use` removido, contexto `AsyncLocalStorage` preservado
- **Objetivo:** eliminar 1 query extra por operação em 64 pontos.
- **Arquivos:** `prisma-rls.middleware.ts`, `admin-auth.middleware.ts`.
- **⚠️ Ordem obrigatória:** **primeiro** auditar se a autorização por mecânico existe na camada de aplicação. Só depois decidir entre remover o middleware ou fazer o RLS funcionar de fato. **Nunca remover antes dessa verificação** — as policies hoje não protegem, mas a intenção de proteger era real.
- **Testes:** um mecânico não deve acessar revisões de outro. Teste funcional, não só unitário.
- **Sucesso:** metade das queries em rotas de revisão; comportamento de autorização inalterado.
- **Rollback:** `git revert`.

**3.2 — Retry infinito de eventos de marketplace (§3.2-c)** — ✅ feito: `attempts` + limite de 5 tentativas
- **Objetivo:** parar o reprocessamento perpétuo a cada 30s.
- **Arquivos:** `schema.prisma` (migration para `attempts`), `event-processor.service.ts`.
- **Alterações:** contador de tentativas; dead-letter após limite (ex.: 5); backoff entre tentativas.
- **Cuidados:** eventos válidos devem continuar processando. A migration adiciona coluna com default — não destrutiva.
- **Testes:** um evento que falha sempre deve parar após N tentativas e ficar visível.
- **Sucesso:** nenhum evento reprocessado indefinidamente.
- **Rollback:** reverter código; a coluna pode permanecer sem efeito.

### Etapa 4 — Higiene de imagens e build — ✅ **PARCIALMENTE IMPLEMENTADA**

- **Feito:** `apps/backend/Dockerfile.base` removido (grep confirmou **zero** referências em
  todo o repositório — era a terceira versão de Playwright, órfã).
- **Alinhamento de versões do Playwright — ✅ VERIFICADO, sem ação necessária.** O achado
  original falava em *três* versões. A verificação final mostra que restam duas, e que cada
  uma está corretamente casada com sua própria imagem base:

  | Serviço | Pacote npm | Imagem base | Situação |
  |---|---|---|---|
  | `apps/backend` | `playwright` **1.59.1** (já fixo, sem `^`) | `mcr.microsoft.com/playwright:v1.59.1-jammy` | ✅ casado |
  | `services/plate-scraper` | `playwright` **1.49.1** (já fixo) | `mcr.microsoft.com/playwright:v1.49.1-jammy` | ✅ casado |
  | ~~`apps/backend/Dockerfile.base`~~ | ~~1.58.2~~ | ~~`v1.58.2-jammy`~~ | 🗑️ removido |

  A terceira versão — a que de fato constituía o problema — era o `Dockerfile.base` órfão, e
  ela saiu. Forçar backend e scraper para uma versão única obrigaria revalidar o scraper, que
  é um navegador *headful* sobre Xvfb e o componente mais frágil do stack, **sem economia
  comprovada**: são imagens de serviços distintos, cada uma baixada uma vez. Alinhar por
  simetria, aqui, seria risco sem retorno.
- **Não feito:** excluir Firefox/WebKit da imagem. Precisa de medição do tamanho real da
  imagem na VPS (Etapa 0) para saber se compensa o risco.

### Etapa 5 — Banco de dados — ✅ **IMPLEMENTADA**

- **Feito:**
  - `SEED_DEMO_DATA` invertido para **opt-in** (`=== 'true'`): o seed de demonstração não roda
    mais a cada boot em produção sem alguém pedir.
  - `deleteOldNotifications` — que existia mas **nunca era chamada** — ligada a um job diário
    em `src/jobs/retention.jobs.ts`.
  - N+1 de `customer-revisions.service.ts` corrigido: o `findFirst` por veículo dentro do laço
    virou **uma** consulta `findMany` com `vehicleId: { in: [...] }`, indexada por data
    decrescente e reduzida a um `Map`. Mesmo resultado, 1 query em vez de N.
  - Retenção de `AuditLog` implementada como **limpeza configurável, não destrutiva por
    padrão**: `AUDIT_LOG_RETENTION_DAYS` (padrão **365 dias**) e
    `NOTIFICATION_RETENTION_DAYS` (padrão **90 dias**). Definir `0` desliga a limpeza.
- **Cuidado respeitado:** nenhum dado de produção foi apagado nesta implementação. O job só
  roda quando o backend subir, 5 minutos após o boot, dentro da janela configurada — e a
  janela pode ser zerada antes do primeiro deploy se você preferir decidir o prazo depois.
  **A escolha do prazo legal/contábil continua sendo sua** (§9, pendência 3).

### Etapa 6 — Ajuste fino — ❌ **NÃO FEITA**

- Healthcheck do postgres para 30s; `console.log` → logger; varredura de paginação.

---

## 7-b. Consolidação do stack (14/09/2026) — ✅ IMPLEMENTADA

Trabalho posterior ao plano original, pedido depois que a VPS foi reiniciada e
todos os containers foram parados: **reduzir o número de containers e o consumo,
sem perder desempenho nem funcionalidade.**

### Resultado

| | Antes | Depois |
|---|---|---|
| Containers de execução contínua | **6** | **5** |
| Teto de memória somado | **7,4 GB** | **3,88 GB** (−48%) |
| Saltos de rede por request HTTP | 2 (gateway → frontend) | **1** |

### O que mudou, e por quê

**1. Dois nginx viraram um.** O stack tinha o `gateway` (porta pública) e o
`frontend` (estáticos na 3000) — o primeiro existia apenas para repassar tudo ao
segundo. Agora o container do frontend serve o SPA **e** faz o proxy de `/api/` e
`/uploads/` ao backend. Um container a menos e um salto de rede a menos por
request. Servir estático continua sendo trabalho do nginx, não do Node — o que
mudou foi unir as duas camadas de nginx, não mover estáticos para o Express.

**2. Postgres dimensionado para o container, não para o host.** Sem `command:`,
o Postgres assume que os 16 GB da VPS são dele. Agora: `shared_buffers=192MB`
(~25% do limite), `effective_cache_size=512MB`, `work_mem=8MB`,
`max_connections=50`, autovacuum contido a 1 worker (nunca desligado) e paralelismo
zerado — numa VPS de 4 vCPUs compartilhadas, worker paralelo é disputa, não ganho.
`mem_limit` de 1g → 768m.

**3. Pool do Prisma limitado.** Sem `connection_limit`, o Prisma abre
`num_cpus*2+1` conexões dimensionadas pelos cores do **host**. Fixado em 10,
coerente com o `max_connections=50` do banco.

**4. Threads do ONNX contidas no ALPR.** O ONNX Runtime dimensiona seu pool pelo
número de cores do host, não pela fatia do container. Com o backend e o Postgres
disputando os mesmos núcleos, isso vira troca de contexto, não paralelismo.
`OMP_NUM_THREADS=1` e afins — uma placa por vez não precisa de paralelismo interno.

**5. Chrome do plate-scraper fecha por ociosidade.** O navegador ficava aberto
para sempre após a primeira consulta, segurando centenas de MB. Agora encerra após
`BROWSER_IDLE_MS` (5 min) e relança na próxima — custo de alguns segundos numa
chamada que já leva dezenas. `mem_limit` 2g → 1g, `shm_size` 1gb → 512m.

### Validação — com o stack no ar

Não bastou validar sintaxe: o stack foi **subido de verdade** (nginx unificado +
backend de teste na mesma rede Docker) e as rotas foram exercitadas com `curl`.

| Rota | Resultado |
|---|---|
| `/health` | 200, servido pelo nginx |
| `/api/health` | 200, `{"ok":true,"from":"backend"}` — proxy + rewrite |
| `/api/revisions` | 200, `path=/revisions` — rewrite preserva o path |
| `/uploads/sub/dir/arquivo.png` | 200, path completo preservado |
| `/` e `/dashboard/x` | 200 `text/html` — `try_files` do SPA |
| gzip | `Content-Encoding: gzip` ativo |
| `/assets/*.js` | `Cache-Control: public, immutable` |

**O teste integrado pegou um bug que a validação de sintaxe não pegaria:** com
variável no `proxy_pass` (necessária para o nginx não morrer se o backend ainda
não subiu), `proxy_pass .../uploads/;` **descartava o nome do arquivo** —
`/uploads/foto.jpg` chegava como `/uploads/`. Todas as fotos quebrariam em
produção. Corrigido com `$request_uri` e reconferido.

---

## 8. Estratégia de validação

### 8.0 O que já foi validado (14/09/2026) — ✅

Tudo o que podia ser verificado **sem acesso à VPS** foi verificado, e passou:

| Verificação | Comando | Resultado |
|---|---|---|
| Tipagem do backend | `npx tsc --noEmit` | ✅ exit 0, zero erros |
| Build completo | `npm run build` | ✅ exit 0 (`prisma generate` + `tsc` + `tsc-alias`) |
| **Lockfile instalável** | `npm ci` real, em diretório isolado | ✅ exit 0, 580 pacotes |
| Versões do Prisma casadas | inspeção do `node_modules` resultante | ✅ `@prisma/client` 5.22.0 = CLI `prisma` 5.22.0 |
| Sintaxe do compose | `yaml.safe_load` | ✅ 8 serviços, 8/8 com `logging`, 8/8 com `mem_limit` |
| Sintaxe do deploy | `bash -n deploy-vps.sh` | ✅ OK |
| Nenhuma referência órfã | `grep setupPrismaRLS` | ✅ nenhuma sobrou |
| Policies RLS sem dependência em código | `grep current_setting\|app.current_` | ✅ nada no código |

O `npm ci` isolado é a validação mais importante aqui: ela prova que o lockfile gerado é
efetivamente instalável e produz as versões pretendidas — isto é, que a correção da causa
do crash-loop funciona, e não apenas que o arquivo existe.

### 8.1 O que **ainda não** foi validado — ⏳ depende da VPS

Nada disto pôde ser feito porque o daemon Docker do servidor está travado e não houve
autorização para mexer nele (§9, pendências 1 e 2):

- Baseline de recursos (nunca existiu — é em si uma lacuna, ver abaixo)
- 6/6 containers `healthy` com o build novo
- Queda sustentada do *load average*
- Tamanho real das imagens antes/depois
- As 48 horas do critério de estabilidade

**Consequência honesta:** as Etapas 1 a 5 estão validadas *como código*, não *como
comportamento em produção*. O `npm ci` prova que a imagem vai ser construída de forma
reprodutível; ele não prova que o backend sobe saudável nesta VPS — isso só o deploy dirá.

---

**Antes de qualquer alteração**, capturar baseline — hoje ela não existe, o que é em si uma lacuna:

```bash
# Sistema
uptime; free -m; df -h /
# Docker
docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
docker system df
docker images --format '{{.Repository}}:{{.Tag}}\t{{.Size}}'
# Aplicação
du -sh /opt/m2centerauto/releases/*
docker exec m2centerauto-postgres-1 psql -U m2 -d m2_auto_hub -c \
  "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 15;"
```

### Métricas objetivas

| Métrica | Como medir | Alvo |
|---|---|---|
| Load average | `uptime` | Queda sustentada |
| RAM por container | `docker stats` | Nenhum no teto do `mem_limit` |
| Disco | `df -h /` | Abaixo de 80% |
| Containers saudáveis | `docker ps` | **6/6 healthy** |
| Tamanho das imagens | `docker images` | Redução após Etapa 3 |
| Maiores tabelas | query acima | Crescimento controlado |
| Tempo de resposta | `curl -w %{time_total}` em `/api/health` | Sem regressão |
| Erros | log do backend | Sem novos padrões |

### Critério de estabilidade

Nenhuma etapa é considerada concluída antes de **48 horas** com: 6/6 containers healthy, nenhum `RestartCount` crescendo, nenhum container no teto de memória, e disco estável ou em queda.

**Princípio de verificação:** teste isolado não pega problema de integração. Toda validação deve ser feita com o stack completo no ar, medindo a tela real — não apenas conferindo que um comando retornou sem erro.

---

## 9. Pendências que dependem de você

### Ainda abertas

1. **Autorizar parar o stack em crash-loop** (`docker compose -p m2centerauto down`). O backend está fora do ar há 3 semanas — parar não tira nada do ar, e devolve CPU imediatamente. **Esta é a única ação que falta para a VPS parar de queimar CPU hoje.**
2. **Autorizar (se necessário) reiniciar o daemon Docker** para desbloquear a leitura dos logs (Etapa 0). Afeta todos os 9 projetos da VPS por alguns minutos. Só é necessário para *confirmar* a causa pontual — a correção estrutural (Etapa 2) já está aplicada e não depende disso.
3. **Definir prazo de retenção do `AuditLog` e das notificações** — decisão de negócio/jurídica. Implementei com padrões conservadores (**365 dias** para auditoria, **90 dias** para notificações lidas), configuráveis por `AUDIT_LOG_RETENTION_DAYS` e `NOTIFICATION_RETENTION_DAYS`. **Definir `0` desliga a limpeza** — use isso se quiser adiar a decisão sem bloquear o resto do deploy.
4. **Confirmar que `apps/mobile` não é servido pela VPS** — a auditoria não encontrou nenhuma referência, mas você conhece o contexto de distribuição do app.

### Resolvidas durante a implementação

5. ~~**Decidir sobre os dois arquivos já alterados** — manter ou reverter.~~
   **Mantidos.** Ambos faziam parte da Etapa 1 do próprio plano e foram commitados junto com o resto.
6. ~~**⚠️ Decidir sobre o RLS (§3.2-b)**~~
   **Respondida pelo código, sem necessidade de decisão sua.** A restrição por mecânico
   **existe na camada de aplicação** (`revisions.controller.ts:39-40` →
   `revisions.service.ts:37-38`, mais `role`/`adminId` propagados em `getRevisionById`,
   `updateRevision` e `exportRevisionPdf`). Não havia brecha de segurança aberta: o RLS era
   custo sem efeito, e removê-lo não mexeu em quem enxerga o quê. As policies seguem no banco,
   inertes. **O que permanece como decisão futura, e não é urgente:** se você quiser RLS de
   fato como segunda camada, será preciso `FORCE ROW LEVEL SECURITY` e um usuário de conexão
   que não seja o dono das tabelas.

---

## 10. Se for para fazer só três coisas

Em ordem de retorno sobre esforço:

1. **Build reprodutível do backend** (§2.2 / Etapa 2) — lockfile + `npm ci` + Prisma em versão exata. Ataca a raiz das 3 semanas de crash-loop e impede a reincidência. É a correção mais importante do documento.
2. **Limitar retries de eventos de marketplace** (§3.2-c / Etapa 3.2) — estanca consumo permanente de CPU, rede e banco, com risco baixo e escopo pequeno.
3. **Resolver o middleware RLS** (§3.2-b / Etapa 3.1) — elimina uma query desperdiçada por operação em 64 pontos **e** esclarece uma expectativa de segurança hoje não cumprida.

As três são correções de código, verificáveis sem depender do estado da VPS — o que importa enquanto o throttling distorce qualquer medição de runtime.

---

*Auditoria realizada sem alterações de código além das duas já registradas na Etapa 1. Nenhum dado de produção foi modificado ou removido.*
