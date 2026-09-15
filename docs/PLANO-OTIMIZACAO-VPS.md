# Plano de Otimização — preparar a aplicação ANTES de colocá-la na VPS

**Projeto:** m2-auto-hub
**Data:** 2026-09-15
**Base:** `docs/AUDITORIA-OTIMIZACAO-VPS.md` (2ª rodada, com acesso SSH e à API do GitHub)

---

## Enquadramento — por que este plano é diferente do anterior

A VPS foi **reinstalada pelo usuário**, porque quebrou sob o peso de muitas aplicações não otimizadas. A aplicação está fora do ar e ainda não voltou ao servidor.

Isso muda o objetivo de forma decisiva:

> **Não estamos resgatando uma aplicação doente em produção. Estamos preparando uma aplicação para entrar num host compartilhado sem repetir a história que derrubou o servidor.**

Três consequências práticas:

1. **Não há risco de quebrar produção** — não há produção. Toda a implementação pode ser feita e validada antes do deploy.
2. **A meta "consumir menos" não se mede contra um consumo atual** (que é zero), e sim contra **o que a aplicação consumiria se subisse como está hoje**.
3. **Contenção passa a ser o item mais importante**, não o mais opcional. A VPS caiu exatamente por ausência de limites. Uma aplicação sem `cpus` e `pids_limit` é candidata a repetir o incidente.

O critério de sucesso é o do prompt: **mesma capacidade funcional, menos recurso** — e nenhuma funcionalidade removida.

---

## Ordenação

Por **impacto ÷ risco**, respeitando dependências, na sequência recomendada da Parte 4:

```
1. Desbloquear          → ITEM 1 (deploy não executa)
2. Código, risco baixo  → ITEM 2 (gerador de .env)
3. Build e imagem       → ITEM 3 (navegadores), ITEM 4 (build fora da produção), ITEM 5 (lockfile scraper), ITEM 8 (tar)
4. Infraestrutura       → ITEM 6 (cpus/pids), ITEM 7 (rollback)
5. Após produção estável→ ITEM 9 (reapertar limites com medição real)
6. Autorização explícita→ ITEM 10 (banco), ITEM 11 (retenção)
```

---

## CRÍTICA

### ITEM 1 — Destravar o deploy (runner nunca alocado)

- **Problema:** os 3 últimos runs falharam com `duration_ms: 0`, sem runner, sem steps, log vazio. Repositório privado → cota paga de Actions. [MEDIDO / causa ESTIMADA]
- **Solução:** self-hosted runner na VPS, registrado para este repositório. Não consome cota mesmo em repo privado. A VPS já tem um runner funcionando (do `Digiurbanlite`), então o padrão é conhecido e comprovado neste host.
- **⚠️ Armadilha a evitar:** self-hosted runner roda **na própria VPS**. Se o build ficar como está, ele passa a rodar em produção *por definição*. Por isso o ITEM 1 **depende do ITEM 4**: o runner constrói e publica no registry; a VPS de produção só faz `pull`. Como aqui o runner e o host de produção são a mesma máquina, a separação é lógica (build com limite de CPU próprio, fora do horário crítico) — e isso está tratado no ITEM 4.
- **Impacto esperado:** deploy volta a executar. Sem isso, nada mais chega ao servidor. [ESTIMADO]
- **Risco:** baixo. Reversível removendo o runner.
- **Arquivos:** `.github/workflows/deploy-production.yml` (`runs-on`).
- **Como testar:** `workflow_dispatch` manual e observar o job ser alocado.
- **Como medir:** run com `duration_ms > 0` e steps executados.
- **Como reverter:** voltar `runs-on: ubuntu-latest`.
- **Depende de:** decisão do usuário (§Pendências) + ITEM 4.

### ITEM 2 — Corrigir o gerador de `.env` que anula otimizações

- **Problema:** `scripts/prepare-env.sh` usa `upsert_env` (sobrescreve sempre) e a cada deploy: (a) linha 42 força `SEED_DEMO_DATA=true`, anulando o opt-in implementado em `bootstrap-production.ts:19`; (b) linha 50 grava `DATABASE_URL` **sem** `connection_limit=10`, anulando o limite de pool do Prisma. O `.env` tem precedência sobre os defaults do compose. [CÓDIGO]
- **Solução:** (a) `upsert_env` → `ensure_env` para `SEED_DEMO_DATA`, com valor `false`; (b) incluir `connection_limit=10&pool_timeout=20` na `DATABASE_URL` gerada.
- **Impacto esperado:** duas otimizações já implementadas passam a **de fato** valer em produção. Evita semear dados de demonstração em produção a cada deploy e evita o Prisma abrir `2*4+1=9` conexões por instância dimensionadas pelo host em vez das 10 do pool controlado. [CÓDIGO]
- **Risco:** muito baixo. Duas linhas.
- **Arquivos:** `scripts/prepare-env.sh`.
- **Como testar:** executar o script contra um `.env` vazio e conferir as duas linhas geradas.
- **Como medir:** `grep SEED_DEMO_DATA .env` → `false`; `grep DATABASE_URL .env` contém `connection_limit`.
- **Como reverter:** `git revert`.

---

## ALTA

### ITEM 3 — Trocar a imagem base do Playwright por `node:20-slim` + só Chromium

> ⚠️ **Este item foi revisado durante a implementação.** A primeira tentativa (`rm -rf` dos
> navegadores) **não entregou o ganho previsto**, e a correção está registrada abaixo com o
> número real. O item está no **NÃO FAZER #4** do plano original — foi promovido a fazer por
> decisão explícita do usuário, e validado com o rigor que o risco exige.

**Problema:** a base `mcr.microsoft.com/playwright:*-jammy` pesa 3,2–3,39 GB e traz Chromium, Firefox, WebKit e o ferramental de teste. O código usa **somente Chromium**, verificado nos dois únicos consumidores, buscando a partir da raiz do projeto:

- `apps/backend/src/shared/services/pdf-generator.service.ts:58` → `chromium.launch({ headless: true })`
- `services/plate-scraper/server.js:2,56` → `import { chromium }` + `chromium.launch({ headless: false })`

Zero referências a Firefox/WebKit como engine (a única ocorrência de "webkit" é a propriedade CSS `-webkit-print-color-adjust`). [MEDIDO + CÓDIGO]

#### ⚠️ Correção: a primeira abordagem estava errada

Implementei primeiro `RUN rm -rf /ms-playwright/firefox-* /ms-playwright/webkit-*` e **afirmei economia de 1.080 MB. Estava errado.** Medição na VPS:

| Métrica | orig | com `rm -rf` | Δ |
|---|---|---|---|
| Tamanho da imagem | 3,39 GB | 3,35 GB | −40 MB |
| **UNIQUE SIZE** (o que ocupa disco) | 63,38 MB | 20,77 MB | −42 MB |
| Filesystem do container | 2,30 GB | 1,78 GB | −520 MB |

**Por quê:** em Docker, remover arquivos vindos de uma camada anterior não libera os bytes — grava um marcador de whiteout. A camada do `rm -rf` tem **8,19 kB** [MEDIDO via `docker history`]. E os 3,32 GB da base são `SHARED SIZE`: contados **uma vez só**, mesmo com várias imagens usando. Testei também remover na mesma camada do `apt-get` (`Dockerfile.flat`): **mesmo resultado**, porque os navegadores vêm da *base*, que nenhum `RUN` posterior encolhe.

**Lição:** `du` dentro do container e tamanho de imagem medem coisas diferentes. Medir só o primeiro produz um número que parece ótimo e não se materializa em disco.

#### Solução aplicada, com medição

`node:20-slim` + `playwright install --with-deps chromium`. O `--with-deps` instala as bibliotecas de sistema que o Chromium exige — é o que evita a armadilha de faltar `.so` em runtime.

| Imagem | Base anterior | Base nova | Redução |
|---|---|---|---|
| **backend** (real, construída) | 3,44 GB¹ | **1,37 GB** | **−2,07 GB (−60%)** |
| **plate-scraper** (real, construída) | 3,39 GB | **1,95 GB** | **−1,44 GB (−42%)** |

¹ valor registrado pela auditoria de 14/09 após a otimização de dependências; as demais medidas são desta sessão.

**O ganho real em disco é maior que a soma das imagens**, e por um motivo que só aparece olhando camadas compartilhadas:

| | Antes | Depois |
|---|---|---|
| backend | 3,44 GB (base própria) | 1,075 GB únicos |
| plate-scraper | 3,39 GB (base própria) | 1,659 GB únicos |
| Base comum | **nenhuma** — duas bases Playwright distintas (3,2 e 3,32 GB) | `node:20-slim`, **290 MB contados uma vez** |
| **Disco ocupado pelo stack** | **6,83 GB** | **3,02 GB** |

**−3,81 GB (−56%)** [MEDIDO via `docker system df -v`, coluna UNIQUE SIZE].

Antes, backend e scraper usavam bases Playwright de versões diferentes e **não compartilhavam camada nenhuma**. Agora ambos partem de `node:20-slim`, e essa base é contada uma única vez no disco — um ganho que a simples soma dos tamanhos de imagem não revela.

**Diferença importante entre os dois serviços:** o backend usa `--only-shell` (só o headless shell, 262 MB), porque gera PDF em modo headless. O scraper **não pode** usar `--only-shell`: roda `headless: false` e precisa do Chromium completo.

- **Risco:** médio — é troca de base, o cenário em que falta biblioteca de sistema em runtime.
- **Validação executada (não descrita — executada):**
  - **PDF real** gerado na base nova: `12.084 bytes, header %PDF-` — **os mesmos bytes** da base antiga.
  - **Scraper headful** sob Xvfb: `HTTP 200 | titulo: Example Domain`, UA sem "Headless".
  - **Serviço real** rodando com os limites de produção: `/health` → `{"status":"ok"}`, 38,57 MiB / 1 GiB, 14 PIDs / 300.
  - **`POST /lookup` real**: PIDs 14 → 81 e memória 38 → 125 MiB (o Chromium subiu de verdade); resposta `status=404` **vinda do site remoto** para placa fictícia — ou seja, navegou pela rede e recebeu resposta HTTP.
- **Como reverter:** restaurar `FROM mcr.microsoft.com/playwright:vX-jammy` e remover o bloco `playwright install`.
- **Atenção na manutenção:** a versão do pacote npm `playwright` e a do `playwright install` no Dockerfile **devem ser sempre a mesma** — o binário é casado com o cliente.

### ITEM 4 — Build fora da máquina de produção + registry

- **Problema:** `deploy-vps.sh:88` roda `compose build --parallel` **na VPS**. Compilar TypeScript, `npm ci` e montar 3 imagens (uma de 3,2 GB) disputa CPU com os outros projetos do host, a cada deploy. É a violação direta da regra de deploy limpo. [CÓDIGO]
- **Solução:** o workflow constrói e publica no GHCR com tag imutável (`sha`); a VPS faz `pull` + `up -d`. `deploy-vps.sh` deixa de construir.
- **Impacto esperado:** elimina o pico de CPU por deploy no host; deploy cai de minutos para segundos. **Pré-requisito do rollback (ITEM 7).** [ESTIMADO — base: substituir `npm ci`+`tsc`+3 builds por download de camadas]
- **Risco:** médio — muda a mecânica do deploy inteiro.
- **Arquivos:** `.github/workflows/deploy-production.yml`, `deploy-vps.sh`, `docker-compose.production.yml`.
- **Como testar:** deploy completo em uma stack de teste antes da definitiva.
- **Como medir:** `docker stats` do host durante o deploy; tempo total do run.
- **Como reverter:** restaurar `compose build` no script (as duas versões convivem).
- **Depende de:** ITEM 1 (decisão do runner).

### ITEM 6 — Limites de CPU e PIDs em todos os serviços

- **Problema:** 7 serviços têm `mem_limit`; **nenhum** tem `cpus` ou `pids_limit`. Memória é um de três vetores: sem `cpus`, um laço infinito satura os 4 vCPUs e degrada os outros 3 projetos; sem `pids_limit`, um vazamento de processos esgota a tabela de PIDs do host. [MEDIDO — `grep` no compose]
- **Relevância direta:** a VPS caiu por acúmulo de aplicações sem contenção. Este item é o que impede esta aplicação de participar do próximo incidente.
- **Solução:** `cpus` e `pids_limit` nos 7 serviços, valores da §5.5 da auditoria.
- **Impacto esperado:** nenhuma economia em operação normal — é **proteção**. Garante que esta aplicação não consegue derrubar o host. [ESTIMADO]
- **Risco:** baixo se folgado; **alto se apertado demais** — daí os valores conservadores e o ITEM 9.
- **Arquivos:** `docker-compose.production.yml`.
- **Como testar:** `docker compose config`; subir e conferir com `docker inspect` (`NanoCpus`, `PidsLimit`).
- **Como medir:** `docker stats` — nenhum serviço encostando no teto.
- **Como reverter:** remover as diretivas.

### ITEM 7 — Rollback por troca de tag

- **Problema:** imagens só existem na VPS, sem registry. Deploy falho executa `compose down` e deixa a aplicação **fora do ar**, sem volta. Recuperar exige rebuild sob pressão. [CÓDIGO]
- **Solução:** com o ITEM 4, cada release fica no GHCR por `sha`. Rollback = apontar `RELEASE_VERSION` para a tag anterior e `up -d`.
- **Impacto esperado:** recuperação em segundos em vez de rebuild. [ESTIMADO]
- **Risco:** baixo.
- **Arquivos:** `deploy-vps.sh`, `docs/DEPLOY.md`.
- **Como testar:** **testar o rollback de verdade** — subir v1, subir v2, voltar para v1 e confirmar que responde.
- **Depende de:** ITEM 4.

---

## MÉDIA

### ITEM 5 — Lockfile no plate-scraper

- **Problema:** `services/plate-scraper/Dockerfile:18` usa `npm install` sem lockfile. `playwright` está fixo em `1.49.1`, mas as transitivas resolvem do zero a cada build. É o mesmo mecanismo que quebrou o backend em agosto — em escala menor. [CÓDIGO]
- **Solução:** gerar `package-lock.json`, copiar no Dockerfile, trocar por `npm ci --omit=dev`.
- **Impacto esperado:** build reprodutível. Sem economia direta; elimina classe de falha. [CÓDIGO]
- **Risco:** baixo.
- **Como testar:** `npm ci` isolado + build da imagem.

### ITEM 8 — `--exclude=apps/mobile` no tar do deploy

- **Problema:** `apps/mobile` = **1,3 GB** local e o tar não o exclui. [MEDIDO]
- **⚠️ Nota honesta:** a auditoria de 14/09 **refutou corretamente** este item — com `ubuntu-latest`, o checkout é limpo e o diretório pesado não existe. **Mas o ITEM 1 muda isso:** no self-hosted runner o `_work` persiste entre execuções, e artefatos de build passam a acumular. O item volta a ser real por causa da nossa própria mudança.
- **Solução:** uma linha no tar.
- **Impacto esperado:** evita enviar até 1,3 GB por deploy no cenário pós-ITEM 1. [ESTIMADO]
- **Risco:** nenhum — `apps/mobile` não é servido pela VPS.

### ITEM 9 — Reapertar limites com medição real (⏳ após produção estável)

- **Problema:** os valores do ITEM 6 são [ESTIMADO] — não há consumo do m2centerauto para medir (§2.3 da auditoria).
- **Solução:** após 48h no ar, coletar `docker stats` sob carga real e ajustar ao pico + folga.
- **Por que depois:** apertar limite sem medir cria OOM sob carga — o erro que a §1.6 do prompt adverte.
- **Como medir:** `docker stats` amostrado em pico, não em ociosidade.

---

## BAIXA

### ITEM 12 — Substituir os 18 `console.log` pelo logger

- **Problema:** [MEDIDO] 18 ocorrências escrevem fora do logger e do `LOG_LEVEL`.
- **Impacto:** consistência e ruído. Com `max-size: 10m` já configurado, não há risco de disco.
- **Risco:** baixo, mas toca 18 pontos — fica por último, e fora desta rodada se o tempo apertar.

---

## NÃO FAZER

Considerado e **recusado**, com justificativa. Tão importante quanto a lista do que fazer — evita que a próxima rodada refaça a análise.

| # | Considerado | Por que NÃO |
|---|---|---|
| 1 | **Reduzir mais o número de containers** | Os 5 contínuos têm ciclo de vida próprio (§3.1 da auditoria). A consolidação 6→5 já foi feita. Juntar mais seria reduzir números destruindo isolamento. |
| 2 | **Remover o `plate-scraper` por ser ocioso** | **Ocioso ≠ obsoleto.** Tem consumidor ativo no código; o deploy trata falha dele como não-fatal *por design*. Dimensionar, não remover. |
| 3 | **Alinhar as versões de Playwright (1.59.1 vs 1.49.1)** | Já analisado e recusado na rodada anterior: imagens de serviços distintos, cada uma baixada uma vez. Forçar versão única obrigaria revalidar o scraper — headful sobre Xvfb, o componente mais frágil — **sem economia comprovada**. |
| 4 | ~~**Trocar a base Playwright por uma imagem menor**~~ → **REVISADO, virou o ITEM 3** | Eu havia recusado isto pelo risco de faltar biblioteca de sistema. **Estava certo sobre o risco e errado sobre a alternativa:** o `rm -rf` que eu propunha no lugar **não economiza disco** (ver a correção no ITEM 3). O usuário decidiu pela troca de base, e ela foi feita com `--with-deps`, que resolve exatamente o risco que motivou a recusa — o Playwright instala as libs que o Chromium exige, em vez de montá-las à mão. Validado com PDF real e scraper headful de verdade. **Ganho medido: −1,44 GB na imagem do scraper.** |
| 5 | **Adicionar `take:` nos ~100 `findMany` restantes** | A maioria é lookup por chave ou agregação interna, onde limite não faz sentido. O catálogo — única listagem exposta por rota sem teto — já foi tratado. Invasivo e arriscado sem ganho comprovado. |
| 6 | **Apagar `AuditLog` antigo para reduzir o banco** | 🔴 Dado de produção. Retenção é proposta separada, com prazo definido pelo usuário. Já implementada de forma **não destrutiva e configurável** (365/90 dias, `0` desliga). Nunca por iniciativa própria. |
| 7 | **`docker system prune -a` para limpar a VPS** | 🔴 Host **compartilhado**. Comando global apaga imagens de `digiurban`, `aprenderia` e `ultrazend`. Além disso `docker system df` mostra **0% recuperável** — não há o que limpar. Só remoção com escopo restrito. |
| 8 | **Remover as policies RLS do banco** | Estão inertes (o Prisma conecta como owner), mas derrubá-las é mudança destrutiva de schema, fora do escopo. O **custo** já foi eliminado (middleware removido); a policy parada não consome nada. |
| 9 | **Reduzir `mem_limit` do Postgres abaixo de 768m** | O `command:` foi dimensionado para esse teto (`shared_buffers=192MB`). Baixar sem reajustar a configuração interna causa OOM sob carga — exatamente o erro da §1.6 do prompt. |
| 10 | **Desligar o autovacuum do Postgres** | Economiza CPU e destrói o banco a médio prazo (bloat, wraparound). Já está **contido** a 1 worker, que é o correto. |
| 11 | **Fixar as 17 dependências restantes no `package.json`** | O lockfile já as congela. Fixar no manifesto só acrescenta atrito a cada atualização, sem ganho. |
| 12 | **Reinstalar o Docker da distro (`bootstrap-runtime.sh`)** | A VPS roda Docker 29.8.0 / Compose v5.5.1; o script instalaria a versão do Ubuntu. Há guarda (`command -v docker`), então não dispara hoje — mas o script deve ser revisto antes de rodar num host novo. Registrado como risco latente, sem ação nesta rodada. |

---

## Pendências que dependem de você

1. **Como resolver a cota de Actions (ITEM 1)** — self-hosted runner (recomendado: grátis, padrão já usado no host), repo público, ou pagar.
2. **Banco de produção** — o volume não existe no servidor. Se havia dados de clientes, **preciso saber se há backup antes de subir o stack**: o primeiro `up` cria um banco vazio. Não executarei nada que toque o banco sem essa resposta.
3. **Prazo de retenção de `AuditLog`** — decisão de negócio; padrões conservadores já implementados.

---

## RESULTADOS — antes × depois

Medições feitas **com o mesmo método** nos dois lados, na VPS, na mesma sessão.

### RESULTADO MEDIDO

| Métrica | Antes | Depois | Δ | Método |
|---|---|---|---|---|
| Imagem do backend | 3,44 GB¹ | **1,37 GB** | **−60%** | `docker images` |
| Imagem do plate-scraper | 3,39 GB | **1,95 GB** | **−42%** | `docker images` |
| **Disco ocupado pelo stack** | **6,83 GB** | **3,02 GB** | **−3,81 GB (−56%)** | `docker system df -v`, UNIQUE + SHARED |
| `/ms-playwright` no backend | 1,2 GB | **262 MB** | −78% | `du -sh` no container |
| `/ms-playwright` no scraper | 1,4 GB | **863 MB** | −38% | `du -sh` no container |
| Serviços com `mem_limit` | 7/7 | 7/7 | = | `yaml.safe_load` |
| Serviços com **`cpus`** | **0/7** | **7/7** | **+7** | idem |
| Serviços com **`pids_limit`** | **0/7** | **7/7** | **+7** | idem |
| Build reprodutível (lockfile + `npm ci`) | backend | backend **+ scraper** | +1 | leitura dos Dockerfiles |
| `apps/mobile` no tar de deploy | incluído (1,3 GB) | **excluído** | — | `tar -tzf` em teste real |

¹ registrado pela auditoria de 14/09; as demais são desta sessão.

**Consumo em execução, medido com os limites de produção aplicados** (plate-scraper real):

| Estado | Memória | PIDs |
|---|---|---|
| Ocioso | 38,57 MiB / 1 GiB (3,8%) | 14 / 300 |
| Durante consulta (Chromium ativo) | 125 MiB / 1 GiB (12%) | 81 / 300 |

Os limites do ITEM 6 estão **folgados na proporção certa**: ~8x de margem sobre o pico observado.

### RESULTADO ESTIMADO

| Item | Estimativa | Base |
|---|---|---|
| Tempo de `pull` por deploy | −56% | Proporcional ao volume de camadas |
| Pico de CPU no host por deploy | inalterado nesta rodada | ITEM 4 não implementado |

### PENDENTE — só produção responde

| Item | Por que |
|---|---|
| Consumo real de CPU/RAM do stack completo sob carga | Requer o stack no ar com usuários |
| Tempo de deploy fim a fim | Requer a esteira de CI funcionando (ITEM 1) |
| Tamanho do banco e maiores tabelas | Banco não existe no servidor |
| Estabilidade em 48h | Requer deploy |

**Nenhum destes foi preenchido com estimativa disfarçada.**

---

## Critério de conclusão

Nenhum item é "feito" porque compilou. Para esta rodada, considerando que **não há suíte de testes** (§6 da auditoria):

- [ ] Imagem do backend construída **e** PDF real gerado com ela (ITEM 3)
- [ ] `docker compose config` válido e `docker inspect` confirmando `NanoCpus` e `PidsLimit` (ITEM 6)
- [ ] `prepare-env.sh` executado contra `.env` vazio, com as duas linhas conferidas (ITEM 2)
- [ ] Rollback **testado de verdade**, não descrito (ITEM 7)
- [ ] `tsc --noEmit` limpo contra a linha de base (exit 0, já medido antes das mudanças)
- [ ] O que não pôde ser validado está **escrito como não validado**, não omitido
