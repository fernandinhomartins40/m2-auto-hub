#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/m2centerauto}"
DEPLOY_PORT="${DEPLOY_PORT:-3092}"
PRIMARY_DOMAIN="${PRIMARY_DOMAIN:-m2centerauto.com.br}"
SECONDARY_DOMAIN="${SECONDARY_DOMAIN:-www.m2centerauto.com.br}"
CANONICAL_URL="${CANONICAL_URL:-https://www.m2centerauto.com.br}"

ENV_FILE="$APP_ROOT/.env"
mkdir -p "$APP_ROOT"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

get_env()    { awk -F= -v k="$1" '$1==k{sub(/^[^=]*=/,"",$0);print $0;exit}' "$ENV_FILE"; }
upsert_env() {
  local k="$1" v="$2" tmp; tmp="$(mktemp)"
  awk -v k="$k" -v v="$v" 'BEGIN{u=0} index($0,k"=")==1{print k"="v;u=1;next}{print} END{if(!u)print k"="v}' "$ENV_FILE" > "$tmp"
  mv "$tmp" "$ENV_FILE"
}
ensure_env() { local c; c="$(get_env "$1"|tr -d '\r')"; if [ -z "$c" ]; then upsert_env "$1" "$2"; fi; }
ensure_hex() { local c; c="$(get_env "$1"|tr -d '\r')"; if [ -z "$c" ]; then upsert_env "$1" "$(openssl rand -hex "$2")"; fi; }

ensure_env  POSTGRES_USER     m2
ensure_env  POSTGRES_DB       m2_auto_hub
ensure_hex  POSTGRES_PASSWORD 32
ensure_hex  JWT_SECRET        32
ensure_env  JWT_EXPIRES_IN    7d
ensure_env  BCRYPT_ROUNDS     10
ensure_env  LOG_LEVEL         info

upsert_env NODE_ENV         production
upsert_env PORT             3001
upsert_env DEPLOY_PORT      "$DEPLOY_PORT"
upsert_env PRIMARY_DOMAIN   "$PRIMARY_DOMAIN"
upsert_env SECONDARY_DOMAIN "$SECONDARY_DOMAIN"
upsert_env CANONICAL_URL    "$CANONICAL_URL"
upsert_env CORS_ORIGIN      "https://${PRIMARY_DOMAIN},https://${SECONDARY_DOMAIN},http://${PRIMARY_DOMAIN},http://${SECONDARY_DOMAIN}"
upsert_env COOKIE_SECURE    true
upsert_env COOKIE_SAME_SITE lax
upsert_env COOKIE_DOMAIN    ".m2centerauto.com.br"
# PLANO ITEM 2: era `upsert_env ... true`, que sobrescreve a cada deploy. O
# bootstrap so semeia dados de demonstracao com SEED_DEMO_DATA === 'true'
# (bootstrap-production.ts), mas o upsert reescrevia `true` toda vez e anulava
# esse opt-in. Com `ensure_env` o valor so e gravado se ainda nao existir, e
# quem quiser semear troca para `true` no .env da VPS uma unica vez.
ensure_env  SEED_DEMO_DATA  false

# O seed essencial (ensureEssentialData) cria tres admins e roda SEMPRE, em todo
# deploy. A senha vem de DEFAULT_ADMIN_PASSWORD, e tanto o compose quanto
# essential-data.ts tinham o fallback literal `Test123!` - ou seja, sem esta
# linha o site sobe publico com tres contas SUPER_ADMIN/MANAGER/STAFF de senha
# conhecida. `ensure_env` gera uma vez e preserva; a senha fica no .env da VPS
# (chmod 600) e deve ser trocada no primeiro login.
ensure_hex  DEFAULT_ADMIN_PASSWORD 16

# MARKETPLACE_ENC_KEY e opcional no schema e cai no JWT_SECRET (environment.ts).
# Esse fallback faz a MESMA chave assinar tokens e cifrar segredos de marketplace:
# vazar uma comprometeria as duas coisas, e rotacionar o JWT tornaria os segredos
# ilegiveis. Uma chave propria, gerada uma unica vez, desacopla os dois.
ensure_hex  MARKETPLACE_ENC_KEY 32

PG_USER="$(get_env POSTGRES_USER|tr -d '\r')"
PG_PASS="$(get_env POSTGRES_PASSWORD|tr -d '\r')"
PG_DB="$(get_env POSTGRES_DB|tr -d '\r')"
# PLANO ITEM 2: o .env tem precedencia sobre os defaults `${VAR:-...}` do
# compose, entao esta linha sobrescrevia a DATABASE_URL que o compose define com
# connection_limit=10. Sem ele o Prisma dimensiona o pool por num_cpus*2+1 lendo
# os cores do HOST, e nao a fatia do container. Os parametros vao aqui para que
# o valor efetivo em producao seja o pretendido.
upsert_env DATABASE_URL "postgresql://${PG_USER}:${PG_PASS}@postgres:5432/${PG_DB}?schema=public&connection_limit=10&pool_timeout=20"

chmod 600 "$ENV_FILE"
echo ".env OK"
