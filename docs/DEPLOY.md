# Deploy — procedimento reproduzível

**Stack:** `m2centerauto` · **Host:** VPS compartilhada com outros projetos
**Última revisão:** 2026-09-15

> 🔴 **Leia antes de rodar qualquer comando:** esta VPS hospeda **outros projetos**
> (`digiurban`, `aprenderia`, `ultrazend`). Todo comando aqui tem escopo restrito ao projeto
> `m2centerauto`. Nenhum comando global (`docker system prune -a`, `docker volume prune` sem
> filtro) deve ser executado — eles apagam artefatos das outras aplicações.

---

## 1. Pré-requisitos

| Item | Valor | Verificar com |
|---|---|---|
| Docker | ≥ 24 (a VPS roda **29.8.0**) | `docker --version` |
| Docker Compose | v2+ (a VPS roda **v5.5.1**) | `docker compose version` |
| nginx no host | serve como proxy 443 → porta local | `nginx -v` |
| certbot | certificado de `m2centerauto.com.br` | `ls /etc/letsencrypt/live/` |
| Runner de CI | ver §7 | — |

**Portas:** o stack expõe **apenas** `127.0.0.1:${DEPLOY_PORT}` (padrão 3092). Nada escuta em
interface pública — o nginx do host é o único ponto de entrada externo.

---

## 2. Variáveis de ambiente

Vivem em `${APP_ROOT}/.env` (padrão `/opt/m2centerauto/.env`), com permissão `600`. O arquivo é
gerado e mantido por `scripts/prepare-env.sh`, que roda a cada deploy.

**Dois comportamentos distintos, e a diferença importa:**

- `ensure_env` / `ensure_hex` — grava **só se ainda não existir**. Preserva a escolha manual.
  Usado para segredos (`JWT_SECRET`, `POSTGRES_PASSWORD` — gerados com `openssl rand`) e para
  `SEED_DEMO_DATA`.
- `upsert_env` — **sobrescreve sempre**. Usado para o que deve seguir o workflow (domínios,
  `CORS_ORIGIN`, `DATABASE_URL`).

> ⚠️ **Armadilha já corrigida, registrada para não voltar:** `SEED_DEMO_DATA` usava `upsert_env`
> com valor `true`. Como o gerador roda a cada deploy, ele reescrevia `true` toda vez e anulava o
> opt-in implementado no código. **Ao adicionar variável nova, escolha `ensure_env` ou `upsert_env`
> conscientemente** — um `upsert` indevido desfaz silenciosamente uma configuração do operador.

Variáveis que exigem decisão:

| Variável | Padrão | Observação |
|---|---|---|
| `SEED_DEMO_DATA` | `false` | `true` semeia dados de demonstração. Não use em produção. |
| `AUDIT_LOG_RETENTION_DAYS` | `365` | `0` desliga a limpeza. Prazo é decisão de negócio. |
| `NOTIFICATION_RETENTION_DAYS` | `90` | `0` desliga. |
| `PLATE_LOOKUP_BEARER_TOKEN` | vazio | Sem ele, usa apenas a base própria de placas. |
| `MARKETPLACE_ENC_KEY` | gerado (`ensure_hex 32`) | Criptografa segredos de marketplace. Antes caía no `JWT_SECRET`. |
| `DEFAULT_ADMIN_PASSWORD` | gerado (`ensure_hex 16`) | Senha dos admins do seed. Leia no `.env` da VPS e **troque no primeiro login**. |

### 2.1 Seed: o que roda e quando

`bootstrap-production.ts` faz **duas** coisas, e a distinção importa:

- `ensureEssentialData()` — roda **sempre, em todo deploy**. Cria os três admins
  (`admin@`, `gerente@`, `mecanico@`), as categorias de relacionamento e a config da landing.
  É idempotente (`upsert`), então repetir não duplica nada.
- `ensureDemoData()` — só roda com `SEED_DEMO_DATA=true`. Clientes fictícios, pedidos, tickets.
  **Não use em produção.**

> ⚠️ **Corrigido nesta rodada:** `deploy-vps.sh` rodava o bootstrap com `|| true`. Se o seed
> essencial falhasse, o deploy terminava **verde** com o painel inacessível — nenhum admin criado.
> Agora a falha aborta o deploy.

**Para descobrir a senha inicial dos admins:**

```bash
grep DEFAULT_ADMIN_PASSWORD /opt/m2centerauto/.env
```

---

## 3. Volumes

Ambos são **externos**: sobrevivem a `compose down` e a remoção do stack — por isso o `down` é
seguro.

| Volume | Conteúdo | Perda significa |
|---|---|---|
| `m2centerauto-postgres-data` | Banco de produção | **Perda total dos dados** |
| `m2centerauto-uploads` | Fotos, anexos, documentos | Perda dos arquivos enviados |

Criados de forma idempotente pelo `deploy-vps.sh` (`docker volume create … || true`).

🔴 **Nunca** rode `docker volume rm` sobre eles sem backup verificado. Ver §8.

---

## 4. Deploy

### 4.1 Automático (o caminho normal)

`push` na `main` dispara o workflow `Deploy Production`, que executa, em ordem:

1. `bootstrap-runtime.sh` — garante docker/nginx/certbot no host
2. `prepare-env.sh` — gera/atualiza o `.env`
3. `deploy-vps.sh` — build, migrations, bootstrap, subida ordenada, healthchecks
4. `configure-nginx.sh` — vhost + certificado
5. `curl /health` — verificação final

A subida é **ordenada e verificada**, não um `up -d` em bloco: postgres → migrator → bootstrap →
alpr → plate-scraper → backend → frontend, cada um aguardando o anterior ficar saudável.

O `plate-scraper` é a exceção deliberada: se não ficar saudável, o deploy **continua** com um
aviso, porque a consulta de placa degrada para cadastro manual — indisponibilidade dele não
justifica derrubar o sistema inteiro.

### 4.2 Manual (a partir de uma release já enviada)

```bash
export APP_ROOT=/opt/m2centerauto
export RELEASE=<sha>-<timestamp>
export DEPLOY_PORT=3092
bash "$APP_ROOT/releases/$RELEASE/deploy-vps.sh"
```

### 4.3 Comportamento em falha

`deploy-vps.sh` instala um `trap` de saída: se o deploy falhar em qualquer ponto, ele executa
`compose down --remove-orphans` no stack parcial.

**Trade-off explícito:** um deploy falho deixa a aplicação **fora do ar**, em vez de deixar
containers reiniciando em loop. A escolha é deliberada — foi um stack meio-vivo em loop que
queimou CPU por semanas neste host. Os volumes são externos, então **nenhum dado se perde**.

---

## 5. Rollback

Cada release fica em `${APP_ROOT}/releases/<sha>-<timestamp>`, e as **3 mais recentes** são
mantidas (`deploy-vps.sh` remove as demais ao final de um deploy bem-sucedido).

```bash
ls -dt /opt/m2centerauto/releases/*/     # lista, mais recente primeiro
export RELEASE=<release-anterior>
bash "/opt/m2centerauto/releases/$RELEASE/deploy-vps.sh"
```

> ⚠️ **Limitação conhecida e não resolvida nesta rodada.** As imagens são construídas **na VPS** e
> não são publicadas em registry. Então o rollback **reconstrói a imagem**, em vez de apenas trocar
> uma tag — é lento e disputa CPU com os outros projetos, justamente no pior momento.
>
> A correção (build fora da produção + registry + tag imutável) é o **ITEM 4/7 do
> `PLANO-OTIMIZACAO-VPS.md`** e depende da decisão sobre o runner (§7). **Enquanto não for feita,
> este procedimento de rollback não foi testado de ponta a ponta** — não o descrevo como validado.

---

## 6. Diagnóstico

```bash
# Escopo do projeto apenas
docker compose -p m2centerauto -f <compose> ps
docker compose -p m2centerauto -f <compose> logs --tail=100 backend

# Recursos, e se algum serviço está encostando no teto
docker stats --no-stream $(docker ps -q --filter name=m2centerauto)

# Limites efetivamente aplicados pelo kernel (não só declarados no YAML)
docker inspect --format '{{.Name}} NanoCpus={{.HostConfig.NanoCpus}} Mem={{.HostConfig.Memory}} Pids={{.HostConfig.PidsLimit}}' \
  $(docker ps -q --filter name=m2centerauto)

# Saúde da aplicação
curl -fsS http://127.0.0.1:3092/health
curl -fsS http://127.0.0.1:3092/api/health
```

**Ler os limites do cgroup, de dentro do container** — é a prova de que o limite existe de fato:

```bash
docker exec <container> sh -c 'cat /sys/fs/cgroup/cpu.max /sys/fs/cgroup/memory.max /sys/fs/cgroup/pids.max'
```

### Sintomas comuns

| Sintoma | Causa provável | Verificação |
|---|---|---|
| Backend não fica `healthy` | `.env` inválido | `logs backend` — `validate-env.ts` imprime os erros |
| Backend sai com código 1 | Validação de ambiente ou falha no bootstrap | idem |
| `plate-scraper` `unhealthy` | Consulta externa bloqueada | Esperado degradar; não derruba o deploy |
| Container morto por OOM | `mem_limit` apertado | `docker inspect` → `.State.OOMKilled` |
| Serviço travado com CPU no teto | `cpus` apertado | `docker stats` — CPU% colado no limite |

---

## 7. Estado da esteira de CI ✅

**O deploy automático funciona.** O run `34996070968` (commit `73e771e`) concluiu os
**10 passos com sucesso** em 6min12s e colocou o sistema no ar. [MEDIDO]

> 🛑 **Correção de um diagnóstico errado meu.** Esta seção afirmava que o deploy
> "não está funcionando" por **cota de Actions esgotada**, e recomendava registrar um
> self-hosted runner. **Estava errado.** Eu li `duration_ms`/`updatedAt` de um run
> ainda **em andamento** e tratei isso como resultado final. Consultando
> `/actions/runs/<id>/jobs`, o que aparece é:
>
> ```
> runner_name = GitHub Actions 1000015787     (runner hospedado, alocado normalmente)
> started 17:05:16 -> completed 17:09:21      (4 minutos, não 3 segundos)
> passos 1..7 = success ; passo 8 = failure
> ```
>
> Não havia bloqueio de cota nenhum. **Não registre self-hosted runner** — o ITEM 1
> do plano foi cancelado.

**A falha real** do passo 8 na 2ª tentativa foi de rede, no build da imagem do backend:

```
#45 [backend prod-deps 2/2] RUN npm ci --omit=dev --ignore-scripts ...
#45 50.63 npm error code ECONNRESET
#45 50.63 npm error network aborted
```

Transitória. Resolvida com um rerun, que reaproveitou o cache do BuildKit:

```bash
gh run rerun <run-id> --failed
```

**Se um deploy falhar com `ECONNRESET`/`ETIMEDOUT` no `npm ci`, a ação correta é exatamente
essa** — não mexa no código, não é defeito do projeto.

### Como diagnosticar um run que falhou (do jeito certo)

```bash
# NAO olhe so o status do run: um run em andamento engana.
gh api repos/{owner}/{repo}/actions/runs/<run-id>/jobs   --jq '.jobs[-1] | "runner=\(.runner_name)", (.steps[] | "\(.number). \(.name) -> \(.conclusion)")'

# E baixe o log de verdade para achar a causa:
gh api repos/{owner}/{repo}/actions/runs/<run-id>/logs > run.zip && unzip -o run.zip
```

**Nota de fato [MEDIDO]:** existe um runner self-hosted no host, do `Digiurbanlite`
(`actions.runner.fernandinhomartins40-Digiurbanlite.digiurban-vps.service   active running`).
Isso continua verdadeiro — mas é **irrelevante para este projeto**, que usa `ubuntu-latest`.

---

## 8. Limpeza segura

🔴 **Em host compartilhado, comando de limpeza global atinge as outras aplicações.** Use sempre
filtro por nome ou label.

```bash
# Imagens do projeto sem container usando (seguro)
docker image prune -f --filter "label=com.docker.compose.project=m2centerauto"

# Releases antigas — o deploy já mantém as 3 mais recentes
ls -dt /opt/m2centerauto/releases/*/ | tail -n +4

# Ver o que ocuparia espaço, SEM apagar
docker system df -v
```

**Proibido neste host:**

```bash
docker system prune -a      # apaga imagens de digiurban, aprenderia, ultrazend
docker volume prune         # pode apagar volumes de outros projetos
docker image prune -a       # idem
```

> `deploy-vps.sh` executa `docker image prune -f` ao final. **Sem `-a`**, ele remove apenas imagens
> *dangling* (sem tag), o que não afeta imagens taggeadas de outros projetos. Ainda assim, restringir
> por label seria mais seguro — registrado como melhoria pendente.

---

## 9. Checklist do primeiro deploy pós-reinstalação — **CONCLUÍDO**

O deploy foi executado com sucesso em 2026-09-15 20:05 UTC (run `34996070968`, tentativa 3).
Estado verificado após o deploy [MEDIDO, via SSH e HTTPS público]:

- [x] **Banco** — não há dados a recuperar. O projeto **nunca esteve em produção**; a VPS foi
      reinstalada deliberadamente. O primeiro `up` cria um banco vazio, que é o desejado.
      *(Confirmado pelo responsável.)*
- [x] **DNS** — `m2centerauto.com.br` e `www` resolvem para `72.60.10.108`, o IP da VPS.
- [x] **Porta 3092 livre** — nada escutando.
- [x] **80/443** — servidas pelo nginx do host (1.18.0), com vhosts de `aprenderia` e `digiurban`.
      O vhost novo convive: nginx prefere `server_name` exato sobre o catch-all (`_`) do digiurban.
- [x] **certbot 1.21.0** presente, com `/var/www/certbot` já existente — o desafio webroot funciona.
- [x] **Disco** — 12 G de 194 G (7%).
- [x] `MARKETPLACE_ENC_KEY` e `DEFAULT_ADMIN_PASSWORD` — agora gerados pelo `prepare-env.sh` (§2).
- [x] **Esteira de CI** — não havia problema a resolver; o diagnóstico de cota estava errado (§7).
- [x] **Stack no ar** — 5/5 containers `healthy`; `/health` e `/api/health` respondem `200`.
- [x] **HTTPS** — certificado Let's Encrypt emitido para os 2 domínios, válido 89 dias;
      `https://www.m2centerauto.com.br/` responde `200` com TLS válido; `http://` e o domínio
      sem `www` redirecionam `301` para o canônico.
- [x] **Seed essencial** — 3 admins, 5 categorias de relacionamento, 1 config de landing.
- [x] **Seed demo não rodou** — `customers = 0`, como esperado com `SEED_DEMO_DATA=false`.
- [x] **Senha insegura eliminada** — login com a senha gerada retorna `200`; com `Test123!`, `401`.
- [x] **Vizinhos intactos** — os 11 containers dos outros 3 projetos seguem `healthy`; disco 8%.
- [ ] Decidir `AUDIT_LOG_RETENTION_DAYS` (ou deixar `0` para adiar)
- [ ] ⚠️ **Trocar a senha dos admins no primeiro login** — **pendência real e ativa**.
      A senha inicial (32 caracteres, gerada) está no `.env` da VPS:
      `grep DEFAULT_ADMIN_PASSWORD /opt/m2centerauto/.env`
      Login do painel: `POST /api/auth/admin/login` (campo `email`), usuário
      `admin@m2centerauto.com.br`.
