# Padrão para rodar muitas aplicações Docker numa VPS

**Origem:** derivado da auditoria do `m2-auto-hub` (2026-09-15) numa VPS Hostinger KVM 4
(4 vCPU, 16 GB, 194 GB) que hospeda `digiurban`, `aprenderia`, `ultrazend` e este projeto.

**Contexto que motivou este documento:** esta VPS **já foi reinstalada uma vez**, porque quebrou
sob o peso de muitas aplicações sem contenção. As regras abaixo existem para que isso não se
repita. Cada uma traz seu **status de validação** — regra comprovada por medição ou ainda não
verificada em produção.

---

## O princípio que organiza tudo

> **Uma aplicação não pode conseguir derrubar o host.**

Não "não deve": **não pode**. Boa intenção não contém vazamento — limite contém. Uma solução que
funciona isolada e quebra quando há 10, 20 ou 30 apps no mesmo host não serve.

Corolário prático: pense sempre em **capacidade acumulada**. A pergunta certa nunca é "esta app
cabe?", e sim "esta app cabe **junto com as outras 20**?".

---

## 1. Limites de recurso — a regra que não se negocia

**Todo container declara `mem_limit`, `cpus` e `pids_limit`. Sem exceção, inclusive efêmeros.**

Memória sozinha protege **um** de três vetores:

| Sem | O que acontece |
|---|---|
| `mem_limit` | Vazamento consome a RAM do host; o kernel mata processos **de outros projetos** |
| `cpus` | Laço infinito satura todos os vCPUs; todas as apps ficam lentas ao mesmo tempo |
| `pids_limit` | Fork bomb esgota a tabela de PIDs **do host**; nenhum limite de memória impede |

✅ **Validado por medição.** Verificado que o Docker aplica de fato, lendo o cgroup de dentro do
container (`cpu.max = 50000/100000`, `memory.max`, `pids.max`) — e não apenas que o YAML aceita a
diretiva. **Faça essa verificação ao adotar**: já houve versão de Compose que ignorava `cpus` em
silêncio.

### Como dimensionar (nesta ordem)

1. **Meça o pico**, não a ociosidade. `docker stats` durante o uso real.
2. **Defina o teto com folga larga** sobre o pico. Medido aqui: scraper usa 125 MiB no pico contra
   teto de 1 GiB — ~8x de margem. Parece exagero e não é: limite folgado que nunca ativa custa
   zero e protege contra catástrofe; limite apertado vira incidente às 3h da manhã.
3. **Ajuste a configuração interna do processo ao teto.** 🔴 **Este passo é o mais esquecido e o
   mais perigoso.**

Limite externo sem ajuste interno mata o processo **exatamente sob carga**:

| Runtime | Lê por padrão | Configure |
|---|---|---|
| Postgres | RAM do **host** | `shared_buffers` ~25% do `mem_limit`, `effective_cache_size`, `max_connections` |
| Node/Prisma | `num_cpus` do **host** | `connection_limit` na URL do banco |
| ONNX / OpenMP | cores do **host** | `OMP_NUM_THREADS=1` e afins |
| JVM | pré-JDK10: RAM do host | `-XX:MaxRAMPercentage` |

⚠️ **Nunca limite memória de banco sem ajustar a configuração dele junto.** É pior que não limitar.

### PIDs — valores de referência medidos

| Tipo | Sugerido | Por quê |
|---|---|---|
| nginx estático | 100 | Poucos workers |
| Node API simples | 100–300 | 300 se lança navegador (PDF) |
| **Qualquer coisa com Chromium** | **300** | Forka por aba, renderizador, GPU, utilitário. **Medido: 81 PIDs numa única consulta.** |
| Postgres | 200 | Cada conexão é um processo |

### A soma de `cpus` deve ultrapassar os vCPUs — de propósito

Somamos 5,5 `cpus` numa VPS de 4 vCPU. **Isso é correto.** `cpus` é teto por container, não
reserva. Somar exatamente 4 desperdiçaria capacidade ociosa. O objetivo é impedir que **um**
serviço monopolize o host, não subdividir a máquina.

---

## 2. Imagem: onde está o disco de verdade

### 2.1 ⚠️ `rm -rf` de arquivo da imagem base NÃO economiza disco

**A lição mais cara desta auditoria, aprendida errando.**

Removemos Firefox e WebKit (572 MB medidos) de uma imagem Playwright com `RUN rm -rf`. Dentro do
container, `du` mostrava 1,2 GB → 631 MB. **O disco não mudou.**

Camada do `rm -rf`: **8,19 kB**. Em Docker, remover arquivo vindo de camada anterior grava um
marcador de whiteout — os bytes continuam lá. Testamos também remover na mesma camada do
`apt-get`: **mesmo resultado**, porque os arquivos vêm da *base*, que nenhum `RUN` posterior
encolhe.

> **Regra:** para reduzir o que veio da base, **troque a base**. Não há como apagar por cima.
>
> **E meça com `docker system df -v` (UNIQUE SIZE), não com `du` dentro do container.** Os dois
> medem coisas diferentes, e só o primeiro corresponde ao disco.

✅ **Validado por medição.**

### 2.2 Base compartilhada vale mais que imagem pequena

O ganho maior não veio de encolher cada imagem, e sim de **duas imagens passarem a compartilhar a
mesma base**:

| | Antes | Depois |
|---|---|---|
| backend | base Playwright 3,2 GB | `node:20-slim` |
| scraper | base Playwright 3,32 GB (**outra versão**) | `node:20-slim` |
| Camada comum | **nenhuma** | 290 MB, **contados uma vez** |
| **Disco do stack** | **6,83 GB** | **3,02 GB (−56%)** |

> **Regra:** padronize a imagem base **entre as aplicações do host**. Dez apps sobre `node:20-slim`
> pagam a base uma vez. Dez apps sobre dez bases diferentes pagam dez vezes.

✅ **Validado por medição.**

### 2.3 Instale só o que o runtime usa

Imagens "completas" (Playwright, `*-devel`, `*-full`) trazem muito peso morto. Verifique **no
código** o que é usado, buscando a partir da raiz do projeto:

- backend: só `chromium.launch({ headless: true })` → `playwright install --only-shell chromium`
- scraper: `headless: false` → precisa do Chromium completo, `--only-shell` **não serve**

⚠️ Use o instalador oficial com `--with-deps`. Ele resolve as bibliotecas de sistema — montá-las à
mão é a armadilha clássica: economiza MB e quebra em runtime de forma difícil de diagnosticar.

✅ **Validado:** PDF real gerado (12.084 bytes, idênticos à base antiga) e scraper headful
navegando (`HTTP 200`).

### 2.4 Multi-stage com estágio só de produção

```dockerfile
FROM base AS deps        # dependências completas (build precisa de TypeScript)
FROM deps AS build       # compila
FROM base AS prod-deps   # npm ci --omit=dev --ignore-scripts
FROM base AS production  # copia de prod-deps + artefatos de build
```

Medido neste projeto: **627 → 193 pacotes** na árvore de produção.

⚠️ **Verifique antes de podar:** se o deploy invoca ferramenta de desenvolvimento dentro do
container (migrations, seeds, geradores), ela **não é** devDependency. Aqui, o CLI `prisma` roda
`migrate deploy` em produção e teve de ser movido para `dependencies`.

### 2.5 Build reprodutível — obrigatório

**Lockfile + `npm ci` (ou equivalente). Sempre.**

Este projeto teve o backend em crash-loop por **três semanas** porque o Dockerfile usava
`npm install` sem lockfile e 19 de 20 dependências tinham `^`. Uma release publicada no npm entrou
num build sem revisão e quebrou o boot — **sem que uma linha do código mudasse**.

`npm ci` falha explicitamente quando lock e manifesto divergem. É o comportamento desejado.

---

## 3. Quando criar um container separado

**Pergunte: isto tem ciclo de vida próprio?**

| Sim | Não |
|---|---|
| Processo diferente (banco, worker, navegador) | Um segundo nginx só para repassar tráfego |
| Escala independente | Um sidecar que só lê arquivo do principal |
| Runtime diferente (Python + Node) | Separação "por elegância de diagrama" |
| Falha isolada é aceitável | |

> Não junte tudo num container para reduzir números, nem separe por estética.

Exemplo real: este stack tinha `gateway` (nginx público) e `frontend` (nginx de estáticos) — o
primeiro **só repassava** ao segundo. Fundidos: um container e um salto de rede a menos.

⚠️ **Ocioso ≠ obsoleto.** Serviço com tráfego zero mas integrado ao código é **opcional**:
dimensione, não remova.

---

## 4. Deploy

| Regra | Por quê | Status |
|---|---|---|
| **Build fora da produção** | Compilar disputa CPU com usuários de **todas** as apps | ⏳ Identificado aqui, ainda não corrigido |
| **Tag imutável** (hash do commit) | Torna rollback uma troca de variável, não rebuild sob pressão | ⏳ Não implementado |
| **Registry** | Sem ele não existe rollback real | ⏳ Não implementado |
| **Idempotente** | Rodar duas vezes não acumula lixo | ✅ `volume create \|\| true`, retenção de 3 releases |
| **Remover órfãos** | Serviço retirado do compose não some sozinho | ✅ `--remove-orphans` |
| **Subida ordenada e verificada** | `up -d` em bloco esconde falha | ✅ Cada serviço aguarda o anterior ficar healthy |
| **Falha não deixa stack meio-vivo** | Foi o que queimou CPU por semanas aqui | ✅ Trap com `compose down` |

**Volumes sempre `external: true`** — sobrevivem a `compose down`, o que torna o `down` seguro.

⚠️ **Cuidado com geradores de configuração.** Se um script reescreve o `.env` a cada deploy, ele
**ressuscita configuração morta e desfaz correções**. Neste projeto, `prepare-env.sh` forçava
`SEED_DEMO_DATA=true` a cada deploy, anulando um opt-in implementado no código — e gravava
`DATABASE_URL` sem `connection_limit`, anulando o limite de pool. **Distinga:** "grava só se não
existir" (segredos, escolhas do operador) × "sobrescreve sempre" (o que deve seguir o workflow).

---

## 5. Logs, retenção e crescimento de disco

```yaml
x-logging: &default-logging
  driver: json-file
  options: { max-size: "10m", max-file: "3" }
```

O driver `json-file` é **ilimitado por padrão**: um serviço em loop escreve até encher o disco do
host. Aplique em **todos** os serviços via âncora YAML.

**Retenção de dados** (logs de auditoria, notificações, históricos):

- Implemente como **job configurável por variável**, com padrão conservador e valor `0` que desliga.
- 🔴 **Nunca apague dado de produção por iniciativa própria.** Prazo é decisão de negócio/jurídica.
- Arquive antes de apagar.

---

## 6. Limpeza segura em host compartilhado

🔴 **Comando global atinge as outras aplicações.**

| ❌ Proibido | Por quê |
|---|---|
| `docker system prune -a` | Apaga imagens de **todos** os projetos |
| `docker volume prune` | Pode apagar volumes de outros projetos |
| `docker image prune -a` | Idem |

| ✅ Seguro | Escopo |
|---|---|
| `docker image prune -f` | Só *dangling* (sem tag) — não afeta imagens taggeadas |
| `docker image prune -f --filter "label=com.docker.compose.project=<proj>"` | Filtrado por projeto |
| `docker builder prune -f --filter "until=24h"` | Cache antigo |
| `docker system df -v` | **Só lê** — sempre comece por aqui |

**Entenda exatamente o que cada comando apaga antes de executar.** Ao limpar cache de build,
confirme que nenhum outro projeto buildou recentemente — se todos rodam imagens de registry,
o cache é seguramente seu.

---

## 7. Monitorar e diagnosticar

```bash
# Visão do host
uptime; free -m; df -h /
docker system df

# ⚠️ Steal time ANTES de culpar a aplicação
top -bn1 | grep '%Cpu'
```

⚠️ **Steal time alto significa que o provedor não entrega a CPU contratada.** Nenhuma otimização
resolve isso. Nesta VPS mediu **1,4%** (saudável). Uma auditoria anterior deste mesmo projeto
registrou throttling de 20% e **descartou todas as medições por causa disso** — verifique antes de
atribuir à aplicação um problema de hospedagem.

```bash
# Por projeto
docker stats --no-stream $(docker ps -q --filter name=<projeto>)

# Limites REAIS aplicados (não só declarados)
docker inspect --format '{{.Name}} {{.HostConfig.NanoCpus}} {{.HostConfig.Memory}} {{.HostConfig.PidsLimit}}' <container>

# Morreu por OOM ou por erro da aplicação?
docker inspect --format '{{.State.OOMKilled}} {{.State.ExitCode}} {{.RestartCount}}' <container>
```

`OOMKilled=true` → limite apertado. `ExitCode=1` com `OOMKilled=false` → erro da aplicação, **não
mexa no limite**.

---

## 8. Checklists

### 8.1 Aplicação nova

- [ ] `mem_limit`, `cpus` e `pids_limit` em **todos** os serviços, efêmeros incluídos
- [ ] Configuração interna do runtime ajustada ao limite (§1)
- [ ] `logging` com `max-size`/`max-file` em todos
- [ ] Base padronizada com as outras apps do host (§2.2)
- [ ] Lockfile + `npm ci`
- [ ] Multi-stage com estágio de produção sem devDependencies
- [ ] Volumes `external: true`
- [ ] Portas em `127.0.0.1:` — nunca em interface pública
- [ ] Healthcheck com `start_period` cobrindo a subida (evita reinício durante o boot)
- [ ] Nenhum container com `restart: unless-stopped` que possa falhar para sempre — prefira
      `on-failure:N` no que pode quebrar no boot
- [ ] Deploy documentado com rollback **testado**

### 8.2 Revisão periódica

- [ ] `docker system df` — quanto é recuperável?
- [ ] Volumes órfãos (`docker volume ls` × volumes referenciados)
- [ ] Algum container encostando no teto? (`docker stats`)
- [ ] `RestartCount` crescendo em algum?
- [ ] Disco acima de 80%?
- [ ] Steal time?

### 8.3 Remover um serviço

Remoção pela metade deixa a aplicação **pior**: o custo da configuração morta, sem o benefício.

- [ ] Definição do serviço na orquestração
- [ ] Volumes e redes associados *(remover a chave e esquecer o resto invalida o arquivo)*
- [ ] Variáveis de ambiente
- [ ] **Geradores de configuração** — senão a config morta ressuscita no próximo deploy
- [ ] `depends_on` de outros serviços
- [ ] Pipeline de build e passos de deploy
- [ ] **Rotas/proxies que apontam para ele**
- [ ] **Clientes que chamam essas rotas**
- [ ] **Telas que usam esses clientes**
- [ ] Validações de build que exigem seus artefatos
- [ ] Volumes e containers órfãos no host
- [ ] Ajustes de sistema feitos por causa dele

> **Se a funcionalidade continua existindo no produto, não é remoção — é migração**, e precisa de
> destino definido antes de desligar o antigo.

---

## 9. Não faça

| ❌ | Por quê |
|---|---|
| Container sem limite "porque é pequeno" | Pequeno em operação normal; vazamento não pede licença |
| `mem_limit` sem ajustar a config interna | Pior que não limitar: mata o processo sob carga |
| Apertar limite sem medir o pico | Cria o incidente que o limite deveria evitar |
| `rm -rf` de arquivo da base para ganhar disco | **Não funciona** (§2.1). Troque a base |
| Medir imagem só com `du` dentro do container | Não corresponde ao disco (§2.1) |
| Build na máquina de produção | Disputa CPU com usuários de todas as apps |
| `docker system prune -a` em host compartilhado | Apaga o trabalho dos outros projetos |
| Remover serviço "sem uso" sem buscar da raiz | Busca na pasta errada já "provou" que código ativo era morto |
| Apagar dado de produção para economizar disco | Decisão de negócio, nunca de otimização |
| Desligar autovacuum do Postgres | Economiza CPU hoje, destrói o banco em meses |
| `restart: unless-stopped` no que pode falhar no boot | Falha permanente vira loop infinito queimando CPU |
| Concluir que "não tem uso" sem provar onde procurou | Considere baseURL, alias, DI, rota dinâmica, reflexão |

---

## 10. Status de validação

| Regra | Status |
|---|---|
| `cpus`/`pids_limit` são aplicados pelo Docker | ✅ Medido no cgroup |
| `rm -rf` da base não economiza disco | ✅ Medido (camada de 8,19 kB) |
| Base compartilhada reduz disco | ✅ Medido (−56%) |
| `--with-deps` evita falta de lib em runtime | ✅ PDF e headful validados |
| Dimensionamento de PIDs para Chromium | ✅ Medido (81 no pico) |
| Multi-stage sem devDeps | ✅ Medido (627 → 193 pacotes) |
| Logging com retenção | ✅ Configurado; efeito de longo prazo ⏳ |
| Tetos de memória propostos | ⏳ **Ainda não validados sob carga real** — folgados de propósito |
| Build fora da produção + registry + rollback | ⏳ **Não implementado** neste projeto |
| Subida ordenada evita stack meio-vivo | ⏳ Lógica no script; não exercitada desde a reinstalação |

**Nada marcado ⏳ deve ser citado como comprovado.**
