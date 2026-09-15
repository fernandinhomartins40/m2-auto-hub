# Auditoria de Otimização — VPS e Aplicação (2ª rodada, com acesso real)

**Projeto:** m2-auto-hub (stack `m2centerauto`)
**Data:** 2026-09-15
**Escopo:** diagnóstico. As alterações estão no `PLANO-OTIMIZACAO-VPS.md` e foram implementadas depois desta leitura.
**VPS:** Hostinger KVM 4 — 4 vCPUs, 16 GB RAM, 194 GB disco, Ubuntu
**Relação com a auditoria anterior:** a de 14/09 (`AUDITORIA-OTIMIZACAO-VPS.md` na raiz) foi feita **sem acesso à VPS e sob throttling de CPU**. Esta rodada teve acesso SSH e à API do GitHub, o que permitiu medir o que antes era hipótese — e **invalidou várias conclusões daquele documento**. As correções estão marcadas com ⚠️ **CORREÇÃO** ao longo do texto.

---

## Nota metodológica

Marcação de evidência usada em todo o documento:

- **[MEDIDO]** — comando executado nesta sessão, com resultado observado. O comando está citado.
- **[CÓDIGO]** — lido no código-fonte. Determinístico, mas o efeito em produção é dedução.
- **[ESTIMADO]** — raciocínio a partir de medições. A base do cálculo está explícita.
- **[NÃO MEDIDO]** — desconhecido. Registrado como tal, nunca preenchido com chute.

**Acesso desta rodada:** SSH root na VPS (paramiko) e API do GitHub com token pessoal. Ao contrário da rodada anterior, a VPS respondeu normalmente a todos os comandos — load 0.28, sem throttling. As medições de runtime aqui são confiáveis.

---

## 1. Resumo executivo

### ⚠️ A descoberta que muda tudo: a aplicação não está na VPS

**[MEDIDO]** — `docker ps -a`, `ls /opt`, `docker volume ls`, `ls /etc/nginx/sites-available`:

O stack `m2centerauto` **não existe mais no servidor**. Não é um caso de "está lento" ou "consome demais". Não há:

- nenhum container do projeto (só rodam `digiurban`, `ultrazend` e `aprenderia`);
- nenhuma imagem `m2centerauto-*`;
- o diretório `/opt/m2centerauto` (`No such file or directory`);
- os volumes `m2centerauto-postgres-data` e `m2centerauto-uploads` — **o banco de produção não está no servidor**;
- configuração nginx ou certificado SSL para `m2centerauto.com.br`.

A VPS foi reinstalada ou limpa, e o m2centerauto não voltou. **A aplicação está fora do ar** e o consumo dela na VPS hoje é **zero**.

### ⚠️ CORREÇÃO da auditoria anterior — três afirmações que não se sustentam mais

O documento de 14/09 descreveu um cenário que **não corresponde ao estado atual**. Registro explicitamente porque ele orientaria decisões erradas:

| Afirmado em 14/09 | Estado real medido em 15/09 | Comando |
|---|---|---|
| "load average 293 → 272 → 203" | **0.28, 0.12, 0.03** | `uptime` |
| "Disco: 162 GB de 194 GB usados (84%)" | **12 GB de 194 GB (7%)** | `df -h /` |
| "backend em crash-loop há 3 semanas queimando CPU" | **Não existe container do projeto** | `docker ps -a` |
| "87 containers de 9 projetos" | **11 containers de 3 projetos** | `docker ps -a` |
| "VPS sob throttling de CPU a 20% pela Hostinger" | **Sem throttling; steal time 1,4%** | `top -bn1` |

**O que isso significa na prática:** o problema de consumo descrito naquela auditoria **foi resolvido pelo reset da VPS**, não pelas otimizações. E o trabalho de otimização feito em 14/09 (que é bom e deve ser mantido) **nunca chegou a rodar em produção** — os três deploys que o levariam falharam.

**Isto não invalida o trabalho anterior.** As correções de código (build reprodutível, retry limitado, imagem enxuta, limites de memória) continuam corretas e valiosas. O que muda é a **prioridade**: não há incêndio a apagar; há uma aplicação a reimplantar de forma sustentável.

### O bloqueio real: a esteira de deploy está quebrada

**[MEDIDO]** — API do GitHub Actions:

```
34897171077  failure  4s   perf: corta 69% da arvore de dependencias   2026-09-14
34890791879  failure  4s   perf: consolida o stack de 6 para 5         2026-09-14
34884689028  failure  3s   perf: torna o build do backend reproduzivel 2026-09-14
32976429155  success  2m1s fix: paginas de OS ocupam a tela inteira    2026-08-26
```

Os três últimos deploys falharam, e com uma assinatura muito específica:

- `run_duration_ms: 4000`, mas **`billable.UBUNTU.total_ms: 0`** e `duration_ms: 0` para o job;
- `runner_name` **vazio**;
- **zero steps executados** (`.jobs[].steps == []`);
- o arquivo de log do run vem como **ZIP vazio** (22 bytes).

Um job que falha sem consumir tempo faturável, sem runner atribuído e sem executar nenhum passo **não falhou no workflow — nunca foi alocado**. O workflow em si está íntegro: o secret `VPS_PASSWORD` existe, o environment `production` não tem regra de proteção (`protection_rules: []`), e o mesmo arquivo funcionou 9 vezes seguidas até 26/08.

**Causa [ESTIMADO, confiança alta]:** o repositório é **privado** (`"private": true`, `"visibility": "private"` — [MEDIDO]). Repositório privado consome a cota de minutos pagos de GitHub Actions; repositório público não consome nada. O padrão — funcionando até 26/08, falha instantânea a partir de 14/09, sem runner — é o comportamento de **cota de Actions esgotada ou pagamento pendente na conta**.

Marco como [ESTIMADO] e não [MEDIDO] porque a API de billing que confirmaria foi movida (`HTTP 410`) e o endpoint de annotations negou acesso ao token (`HTTP 403`). **Isso se confirma em 10 segundos** em `github.com/settings/billing`. A alternativa técnica não depende dessa confirmação e está no plano.

**A saída é boa e já existe na própria VPS [MEDIDO]:** há um self-hosted runner instalado e ativo em `/opt/actions-runner` (`actions.runner.fernandinhomartins40-Digiurbanlite.digiurban-vps.service`, `active running`). Ele está registrado em **outro** repositório (`Digiurbanlite`), então não atende este projeto hoje. Self-hosted runner **não consome cota**, nem em repositório privado. Registrar um runner para o m2-auto-hub destrava o deploy sem custo — com uma ressalva importante tratada na §4.

### O que esta auditoria encontrou de novo, que a anterior não podia ver

Com acesso ao workflow e ao servidor, apareceram **quatro defeitos estruturais** que nenhuma leitura de código isolada pegaria:

1. **O build roda na máquina de produção** (§4.1) — viola o princípio de não disputar CPU com usuários, e é a causa de o deploy levar minutos.
2. **O gerador de `.env` neutraliza duas otimizações já implementadas** (§4.2) — `prepare-env.sh` reescreve o `.env` a cada deploy e desfaz o `SEED_DEMO_DATA` opt-in e o `connection_limit` do pool do Prisma. É exatamente a armadilha do "gerador de configuração ressuscita config morta".
3. **Não há limite de CPU nem de PIDs em nenhum serviço** (§4.3) — só `mem_limit`. Um laço infinito ou fork bomb derruba os outros 3 projetos do host.
4. **O deploy não é reversível** (§4.4) — não existe rollback; a recuperação é rebuild sob pressão.

E um ganho de disco agora **medido, não estimado**: **572 MB de navegadores nunca usados por imagem** (§5.1).

---

## 2. Linha de base medida

Tudo abaixo é **[MEDIDO]** em 2026-09-15, das 13:53 às 14:10 UTC.

### 2.1 Sistema

```
$ uptime
 13:53:32 up 17:02,  0 users,  load average: 0.28, 0.12, 0.03

$ free -m
               total        used        free      shared  buff/cache   available
Mem:           15988        1020        5551          90        9416       14547
Swap:           2047           0        2047

$ df -h /
/dev/sda1       194G   12G  182G   7% /

$ nproc → 4
$ top -bn1 → %Cpu(s): 0.0 us, 2.9 sy, 95.7 id, 0.0 wa, 1.4 st
```

**Steal time de 1,4%** — o provedor está entregando a CPU contratada. ⚠️ **CORREÇÃO:** a auditoria anterior registrou "throttling de CPU a 20% imposto pela Hostinger" e descartou todas as medições por causa disso. Hoje não há throttling. Se existiu, acabou.

**Leitura:** a VPS está com **95,7% de CPU ociosa, 14,5 GB de RAM disponível e 182 GB de disco livre**. Há folga abundante para reimplantar o m2centerauto.

### 2.2 Docker — estado atual do host

```
$ docker system df
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          12        11        6.588GB   25.87kB (0%)
Containers      11        10        67.3MB    4.096kB (0%)
Local Volumes   13        13        163.8MB   0B (0%)
Build Cache      0         0        0B        0B
```

**Nada a recuperar: 0% reclaimable, nenhum volume órfão, build cache zerado.** O host está limpo. ⚠️ **CORREÇÃO:** a hipótese anterior de "volumes órfãos e imagens acumuladas ocupando dezenas de GB" **não se sustenta** — medida diretamente, e o resultado é zero.

Containers em execução (nenhum do m2centerauto):

| Container | Memória usada / limite | CPU |
|---|---|---|
| digiurban-vps | 186,6 MiB / 1 GiB | 0,02% |
| digiurban-postgres | 84,2 MiB / 512 MiB | 0,04% |
| aprenderia-web | 80,6 MiB / 512 MiB | 0,00% |
| ultrazend-messages | 60,2 MiB / 384 MiB | 0,00% |
| ultrazend-smtp | 37,1 MiB / 384 MiB | 0,00% |
| ultrazend-face | 26,8 MiB / 384 MiB | 0,00% |
| aprenderia-postgres | 47,2 MiB / 512 MiB | 0,00% |
| aprenderia-nginx | 4,5 MiB / 128 MiB | 4,11% |
| digiurban-redis | 3,6 MiB / 192 MiB | 0,40% |
| aprenderia-scheduler | 0,5 MiB / 32 MiB | 0,00% |

**Referência útil para dimensionar o nosso stack:** os vizinhos somam **~531 MiB em uso** com tetos somados de ~4 GiB. Todos usam `mem_limit` — o padrão já é praticado no host. Nenhum passa de 20% do próprio teto, o que sugere tetos folgados, não apertados.

### 2.3 Consumo do m2centerauto hoje

| Recurso | Valor | Observação |
|---|---|---|
| Containers | **0** | Não implantado |
| Imagens | **0** | Nenhuma `m2centerauto-*` |
| Volumes | **0** | Banco de produção **ausente do servidor** |
| CPU / RAM / disco | **0** | Nada em execução |

**Consequência para a meta "consumir menos recursos":** não há consumo atual para reduzir. A meta correta desta rodada é **reimplantar com um padrão que consuma pouco desde o primeiro dia** — e é assim que o plano está estruturado.

### 2.4 Repositório

**[MEDIDO]** — `du -sh` local:

```
1.3G  apps/mobile      ← 93% do repositório
 88M  apps/backend
8.1M  apps/frontend
 71K  packages/ui
 18K  services/plate-scraper
 18K  services/alpr-service
```

### 2.5 Imagem base do Playwright — medição nova

**[MEDIDO]** — executado na VPS:

```
$ docker images mcr.microsoft.com/playwright:v1.59.1-jammy --format "{{.Size}}"
3.2GB

$ docker run --rm --entrypoint sh ... -c "du -sh /ms-playwright/*"
369M  /ms-playwright/chromium-1217
257M  /ms-playwright/chromium_headless_shell-1217
4.9M  /ms-playwright/ffmpeg-1011
287M  /ms-playwright/firefox-1511
285M  /ms-playwright/webkit-2272
```

Este é o número que a auditoria anterior marcou como [A VALIDAR] e não conseguiu medir. **1,2 GB de navegadores numa imagem de 3,2 GB**, e **572 MB deles (Firefox + WebKit) nunca são usados** — ver §5.1.

### 2.6 Linha de base de build/código

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` (backend) | ✅ exit 0, sem erros |
| Suíte de testes | ⚠️ ver §6 — **não existe rede de segurança** |

---

## 3. Arquitetura atual

### 3.1 Inventário de serviços, com a classificação do §1.4

| Serviço | Papel | Ciclo de vida próprio? | Classificação |
|---|---|---|---|
| `postgres` | Banco (Postgres 16-alpine), volume externo | Sim — dados persistentes | **Necessário** |
| `backend` | API Node/Express + Prisma; gera PDF via Playwright | Sim | **Necessário mas otimizável** (§5.1) |
| `frontend` | nginx: serve o SPA **e** faz proxy de `/api` e `/uploads` | Sim — único ponto de entrada | **Necessário** |
| `alpr` | Reconhecimento de placa por imagem (ONNX) | Sim — modelo próprio, runtime Python | **Necessário** |
| `plate-scraper` | Consulta de placa em Chrome headful sobre Xvfb | Sim — navegador isolado do backend | **Opcional** — degrada para cadastro manual; **dimensionar, não remover** |
| `migrator` | `prisma migrate deploy` e sai | Efêmero (`restart: "no"`) | **Necessário** |
| `bootstrap` | Dados essenciais e sai | Efêmero (`restart: "no"`) | **Necessário** |

**5 containers em execução contínua + 2 efêmeros.** Cada um tem justificativa de ciclo de vida próprio. ✅ **Não há container a eliminar** — a consolidação de 6→5 (gateway absorvido pelo frontend) já foi feita na rodada anterior e está correta.

O `plate-scraper` é o caso-limite do §1.4: **ocioso não é obsoleto**. Ele tem consumidor ativo no código (`plate-lookup`), e o próprio deploy trata falha dele como não-fatal. Dimensionar, jamais remover.

### 3.2 Fluxo de deploy atual

```
push main → GitHub Actions (ubuntu-latest)
  → tar do código-fonte → scp para /opt/m2centerauto/releases/<sha>-<ts>
  → bootstrap-runtime.sh   (instala docker/nginx se faltar)
  → prepare-env.sh         (gera/atualiza o .env)     ⚠️ §4.2
  → deploy-vps.sh          (docker compose build)     ⚠️ §4.1 build em produção
  → configure-nginx.sh     (vhost + certbot)
  → curl /health
```

---

## 4. Problemas encontrados, por severidade

### 🔴 CRÍTICO

#### 4.0 — Deploy não executa: runner nunca alocado

Descrito em §1. **Bloqueia todo o resto**: sem deploy, nenhuma otimização chega a produção.

- **Evidência [MEDIDO]:** 3 runs, `duration_ms: 0`, sem runner, sem steps, log vazio.
- **Causa [ESTIMADO]:** cota de Actions esgotada em repositório privado.
- **Impacto:** aplicação fora do ar; nenhuma correção de 14/09 em produção.

#### 4.1 — O build de imagens roda na máquina de produção

**[CÓDIGO]** — `deploy-vps.sh:88` (`compose build --parallel`), invocado pelo workflow via SSH.

O GitHub Actions **não constrói imagem alguma**: ele empacota o código-fonte, envia por `tar`, e manda a VPS construir. Isso significa que **compilar TypeScript, rodar `npm ci`, gerar o cliente Prisma e montar uma imagem de 3,2 GB disputa CPU com os usuários dos outros 3 projetos do host**, a cada deploy.

É a violação direta de "build fora da máquina de produção". Também explica por que os deploys bem-sucedidos levavam 2-3 minutos.

- **Impacto [ESTIMADO]:** pico de 4 vCPUs saturadas por alguns minutos por deploy, afetando `digiurban`, `aprenderia` e `ultrazend`. Base: `npm ci` + `tsc` + build de 3 imagens.
- **Agravante:** sem registry, a imagem só existe na VPS — **por isso não há rollback** (§4.4).

#### 4.2 — O gerador de `.env` desfaz duas otimizações já implementadas

**[CÓDIGO]** — `scripts/prepare-env.sh`. Este é o achado mais insidioso da rodada, e é exatamente o item "geradores de configuração" do checklist §8.1 do prompt.

O script usa `upsert_env`, que **sobrescreve incondicionalmente** a cada deploy (diferente de `ensure_env`, que só preenche se vazio). Duas linhas anulam trabalho feito:

**(a) `prepare-env.sh:42` — `upsert_env SEED_DEMO_DATA true`**

A Etapa 5 de 14/09 inverteu o seed de demonstração para opt-in, alterando `bootstrap-production.ts:19` para `if (process.env.SEED_DEMO_DATA === 'true')`. Mas o gerador grava literalmente `SEED_DEMO_DATA=true` no `.env` a cada deploy. **A condição passa a ser verdadeira sempre.** A correção foi neutralizada — dados de demonstração continuariam sendo semeados em produção a cada deploy.

**(b) `prepare-env.sh:50` — `DATABASE_URL` sem `connection_limit`**

```bash
upsert_env DATABASE_URL "postgresql://...@postgres:5432/${PG_DB}?schema=public"
```

O compose define `DATABASE_URL` com `connection_limit=10&pool_timeout=20` (§7-b da rodada anterior), mas o `.env` tem precedência sobre os defaults `${VAR:-...}` do compose. Na prática, **o Prisma volta a abrir `num_cpus*2+1` conexões dimensionadas pelos 4 cores do host**, contra um `max_connections=50` — o limite de pool nunca entrou em vigor em produção.

- **Impacto:** as duas otimizações existem no código e **não teriam efeito nenhum** no deploy.
- **Severidade:** crítica não pelo consumo, mas porque **torna invisível o fracasso de uma correção** — o código diz uma coisa, o runtime faz outra.

#### 4.3 — Nenhum limite de CPU ou PIDs em nenhum serviço

**[MEDIDO]** — `grep -cE "cpus|pids_limit" docker-compose.production.yml` → **1 ocorrência** (e é a palavra `num_cpus` dentro de um comentário; nenhuma diretiva real).

Todos os 7 serviços têm `mem_limit`. **Nenhum tem `cpus` ou `pids_limit`.**

Memória é apenas um dos três vetores de esgotamento:

- Sem `cpus`: um laço infinito no backend consome os 4 vCPUs e **degrada os outros 3 projetos** — que é precisamente o cenário que a auditoria de 14/09 descreveu (load 293).
- Sem `pids_limit`: um fork bomb ou vazamento de processos esgota a tabela de PIDs **do host inteiro**, e nenhum `mem_limit` impede isso.

Numa VPS compartilhada, isso é proteção ausente, não configuração ausente.

#### 4.4 — Deploy não é reversível

**[CÓDIGO]** — `deploy-vps.sh`.

- As imagens são construídas na VPS e **não são publicadas em registry algum**.
- O trap de falha (`on_exit`) executa `compose down` — ou seja, um deploy falho **deixa a aplicação fora do ar**, sem voltar para a versão anterior.
- `deploy-vps.sh:~150` mantém as 3 releases mais recentes (`tail -n +4 | xargs rm -rf`), mas isso é **código-fonte**, não imagem. Voltar à release anterior exige **reconstruir a imagem sob pressão**, em produção.

A rodada anterior reconheceu isso ("o ideal seria rollback para a release anterior — fora do escopo"). Com o build movido para fora da VPS (§4.1), o rollback passa a ser quase de graça — é a mesma mudança.

### 🟠 ALTO

#### 4.5 — `apps/mobile` (1,3 GB) não é excluído do tar de deploy

**[MEDIDO]** — `du -sh apps/mobile` = 1,3 GB; `.github/workflows/deploy-production.yml:46-66` não tem `--exclude=apps/mobile`.

⚠️ **CORREÇÃO da correção.** A auditoria de 14/09 **refutou** este item, e estava certa *para o contexto de então*: o runner `ubuntu-latest` faz checkout limpo, `apps/mobile/build` está no `.gitignore`, logo o diretório pesado não existe no runner. As releases medidas na VPS davam 8,1 MB cada — prova de que não havia problema.

**Mas o contexto muda com a solução do §4.0.** Se o deploy migrar para **self-hosted runner** — que é a saída recomendada para a cota —, o diretório `_work` **persiste entre execuções**. Artefatos de build do Flutter passam a acumular no runner, e o tar passa a ter o que empacotar.

Ou seja: o item era inofensivo e **volta a ser real** justamente por causa da mudança que vamos fazer. Custo de prevenir: uma linha.

#### 4.6 — Firefox e WebKit na imagem: 572 MB de peso morto por imagem

Tratado em §5.1 como oportunidade, com medição e autorização.

### 🟡 MÉDIO

#### 4.7 — `bootstrap-runtime.sh` instala `docker.io` da distro

**[CÓDIGO]** — `scripts/bootstrap-runtime.sh:11`. Se o Docker faltasse, instalaria a versão do Ubuntu. A VPS roda **Docker 29.8.0 / Compose v5.5.1** [MEDIDO], muito mais novos. O script tem guarda (`command -v docker`), então hoje não dispara — mas em uma VPS nova geraria uma instalação divergente. Risco latente, não ativo.

#### 4.8 — 18 `console.log` no backend

**[MEDIDO]** — `grep -rn "console\.log" apps/backend/src --include=*.ts | wc -l` → 18. Escrevem direto no stdout, fora do logger e do `LOG_LEVEL`. Com `max-size: 10m / max-file: 3` já configurado, não há risco de encher disco; é questão de consistência e ruído.

### 🟢 BAIXO

#### 4.9 — Timers permanentes

**[CÓDIGO]** — 4 timers de execução contínua, todos justificados: `marketplace.jobs.ts:27,33,39` (30s / 5min / 1h), `upload.middleware.ts:181` (1h), `retention.jobs.ts:67,71`. O retry infinito de marketplace **já foi corrigido** na rodada anterior (contador `attempts`, limite 5). Sem ação.

---

## 5. Oportunidades de otimização

### 5.1 Remover Firefox e WebKit das imagens — **572 MB por imagem, MEDIDO**

**Prova de que só o Chromium é usado [CÓDIGO], buscando a partir da raiz do projeto:**

```
$ grep -rn "chromium\|firefox\|webkit" apps/backend/src --include=*.ts
pdf-generator.service.ts:30:  chromium: {
pdf-generator.service.ts:58:  const browser = await playwrightModule.chromium.launch({
pdf-generator.service.ts:157:  -webkit-print-color-adjust: exact;   ← propriedade CSS, não o navegador

$ grep -rn "chromium\|firefox\|webkit" services/plate-scraper/server.js
server.js:2:  import { chromium } from 'playwright';
server.js:56:  browser = await chromium.launch({
```

**Zero referências a `firefox` ou `webkit` como navegador** nos dois únicos consumidores de Playwright do projeto. A única ocorrência de "webkit" é o prefixo CSS `-webkit-print-color-adjust`, que não tem relação com o browser engine.

**Tamanho [MEDIDO] na VPS:** Firefox 287M + WebKit 285M = **572 MB por imagem**. Como backend e plate-scraper usam imagens base distintas (v1.59.1 e v1.49.1), o total é **~1,1 GB**.

**Autorizado pelo usuário nesta sessão**, com a condição de validar a geração de PDF depois da mudança.

**Risco e mitigação:** a imagem base traz os navegadores pré-instalados em `/ms-playwright`; removê-los é um `rm -rf` de diretório em uma camada nova. O `chromium_headless_shell` (257M) **deve ser preservado** — é o que o modo headless usa. Validação obrigatória: gerar um PDF real com a imagem construída.

### 5.2 Mover o build para fora da produção + registry + rollback

Resolve §4.1 e §4.4 de uma vez. Com as imagens em registry (GHCR, já usado pelos vizinhos [MEDIDO]), o deploy vira `pull` + `up -d`, e o rollback vira trocar uma tag.

**Impacto [ESTIMADO]:** elimina o pico de CPU por deploy na VPS; deploy cai de minutos para segundos. Base: substituir `npm ci` + `tsc` + build de 3 imagens por download de camadas.

### 5.3 Limites de CPU e PIDs

Resolve §4.3. Dimensionamento em §5.5.

### 5.4 Corrigir o gerador de `.env`

Resolve §4.2. Custo: duas linhas.

### 5.5 Dimensionamento proposto

**Método:** `mem_limit` mantém os valores da rodada anterior (já dimensionados e comentados). `cpus` e `pids_limit` são novos. Como **não há consumo do m2centerauto para medir** (§2.3), o dimensionamento parte de: (a) comportamento conhecido do serviço, (b) referência dos vizinhos medidos em §2.2, (c) soma que caiba em 4 vCPUs com folga.

**Isto é [ESTIMADO], e assumidamente conservador.** Limite folgado que nunca ativa é proteção contra catástrofe; limite apertado sem medição vira incidente. Os valores devem ser reapertados depois de 48h de `docker stats` real — o plano registra isso como pendência explícita, não como concluído.

| Serviço | mem_limit | cpus | pids_limit | Base |
|---|---|---|---|---|
| postgres | 768m | 1.5 | 200 | `max_connections=50`, cada conexão é um processo; +overhead |
| backend | 1g | 1.5 | 300 | Node + Chromium do PDF (que forka vários processos) |
| frontend | 128m | 0.5 | 100 | nginx estático; vizinho mede 4,5 MiB [MEDIDO] |
| alpr | 1g | 1.0 | 100 | ONNX já contido a 1 thread |
| plate-scraper | 1g | 1.0 | 300 | Chrome headful + Xvfb; Chrome forka por aba/processo |
| migrator | 512m | 1.0 | 100 | Efêmero |
| bootstrap | 512m | 1.0 | 100 | Efêmero |

**Soma dos contínuos: 3,9 GB de RAM e 5,5 vCPU.** A soma de CPU excede 4 vCPUs **de propósito**: `cpus` é teto por container, não reserva. Somar exatamente 4 desperdiçaria capacidade ociosa — o objetivo é impedir que **um** serviço monopolize o host, não subdividir a máquina.

---

## 6. Suíte de testes — não existe rede de segurança

**[MEDIDO]:** `apps/backend/package.json:20` declara `"test": "jest"`, mas **não existe diretório de testes** (`apps/backend/tests` ausente, nenhum `*.test.ts`).

É exatamente o caso que a Parte 5 do prompt manda declarar com todas as letras:

> **Não há teste automatizado neste projeto. O script `npm test` aponta para uma suíte inexistente.**

**Consequência:** a validação disponível é compilação (`tsc --noEmit`), build de imagem, subida de container e exercício manual dos fluxos. **O primeiro deploy é o primeiro teste funcional real.** Isso eleva a exigência de cuidado e é a razão de o plano validar cada bloco com o stack de fato no ar, não só com sintaxe — o princípio que já pegou um bug real na rodada anterior (o `proxy_pass` que descartava o nome do arquivo).

---

## 7. O que está correto e NÃO deve ser mexido

Registro explícito para evitar que a próxima rodada refaça ou desfaça:

| Item | Por quê |
|---|---|
| **Consolidação 6→5 containers** | O `gateway` era um nginx que só repassava ao `frontend`. Unificação correta, validada com o stack no ar. |
| **`npm ci` + lockfile + Prisma 5.22.0 exato** | Corrige a causa-raiz do crash-loop de agosto. É a melhor correção do projeto. |
| **Estágio `prod-deps` (`--omit=dev`)** | 627 → 193 pacotes. Correto e já validado. |
| **Tuning do Postgres para o container** | `shared_buffers=192MB` etc. dimensionado para o `mem_limit`, não para o host. Exemplar. |
| **`restart: on-failure:5` no backend** | Impede que falha permanente vire loop infinito. |
| **`logging` com `max-size: 10m / max-file: 3`** | Retenção em todos os serviços. |
| **Chrome do scraper fecha por ociosidade** | Devolve centenas de MB entre consultas. |
| **`attempts` + limite 5 no marketplace** | Corrige o retry infinito a cada 30s. |
| **Remoção do middleware RLS** | Verificado: a autorização por mecânico está na camada de aplicação (`revisions.controller.ts:39-40` → `revisions.service.ts:37-38`). Era custo sem efeito. |
| **Os 5 containers atuais** | Cada um tem ciclo de vida próprio. Não consolidar mais. |
| **Alinhar Playwright entre backend e scraper** | Já analisado e recusado: imagens de serviços distintos, risco sem retorno. |

---

## 8. Pendências que dependem de decisão sua

1. **Confirmar a cota de Actions** (`github.com/settings/billing`) — 10 segundos, e confirma a causa do §4.0.
2. **Escolher a saída do deploy:** self-hosted runner na VPS (grátis, mas o build volta para a máquina de produção se mal configurado) **ou** tornar o repositório público (Actions grátis, mas expõe o código) **ou** pagar a cota. Tratado no plano com recomendação.
3. **Restaurar o banco de produção** — o volume `m2centerauto-postgres-data` **não existe no servidor**. Se havia dados de clientes, eles não estão na VPS. **Preciso saber se existe backup antes de qualquer reimplantação**, porque subir o stack cria um banco vazio e isso é irreversível se o volume antigo estivesse em outro lugar.
4. **Prazo de retenção de `AuditLog`** — segue pendente da rodada anterior (padrões conservadores já implementados: 365 e 90 dias, `0` desliga).

---

## 9. Métricas para comparação (Parte 6)

O antes está em §2. O depois usa **exatamente os mesmos comandos**, para os números serem comparáveis.

| Métrica | Comando | Antes [MEDIDO] |
|---|---|---|
| Load average | `uptime` | 0.28, 0.12, 0.03 |
| RAM do host | `free -m` | 1.020 MB usados de 15.988 |
| Disco | `df -h /` | 12 G de 194 G (7%) |
| Imagens Docker | `docker system df` | 12 imagens, 6,588 GB |
| Recuperável | `docker system df` | 25,87 kB (0%) |
| Containers do projeto | `docker ps -a` | **0** |
| Navegadores por imagem | `du -sh /ms-playwright/*` | 1,2 GB (572 MB não usados) |
| Tamanho da imagem backend | `docker images` | **[NÃO MEDIDO]** — não existe na VPS |
| Tempo de deploy | Actions | 2m1s (último bem-sucedido, 26/08) |
| Tamanho do banco | `psql pg_total_relation_size` | **[NÃO MEDIDO]** — banco ausente |

Os dois `[NÃO MEDIDO]` só podem ser preenchidos **depois** que a aplicação voltar ao ar. Não serão estimados.

---

*Auditoria feita com acesso SSH à VPS e à API do GitHub. Nenhuma alteração foi feita no servidor nesta etapa: todos os comandos executados foram de leitura, exceto o `docker pull` da imagem pública do Playwright (necessário para medir os navegadores) e os `docker run --rm` efêmeros que o inspecionaram. Nenhum dado de produção foi tocado — e, de fato, não havia nenhum no servidor.*
