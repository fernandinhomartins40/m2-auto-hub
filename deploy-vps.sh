#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/m2centerauto}"
RELEASE="${RELEASE:-}"
DEPLOY_PORT="${DEPLOY_PORT:-3092}"

APP_DIR="$APP_ROOT/releases/$RELEASE"
COMPOSE_FILE="$APP_DIR/docker-compose.production.yml"
ROOT_ENV="$APP_ROOT/.env"
ENV_FILE="$APP_DIR/.env"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

COMPOSE=(docker compose -p m2centerauto -f "$COMPOSE_FILE" --env-file "$ENV_FILE")
compose() { "${COMPOSE[@]}" "$@"; }
compose_timeout() { local duration="$1"; shift; timeout "$duration" "${COMPOSE[@]}" "$@"; }

service_health() {
  local id; id="$(compose ps -q "$1" 2>/dev/null || true)"
  if [ -z "$id" ]; then echo "not_found"; return; fi
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no_healthcheck{{end}}' "$id" 2>/dev/null || echo "not_found"
}

service_state() {
  local id; id="$(compose ps -q "$1" 2>/dev/null || true)"
  if [ -z "$id" ]; then echo "not_found"; return; fi
  docker inspect --format '{{.State.Status}}' "$id" 2>/dev/null || echo "not_found"
}

wait_healthy() {
  local svc="$1" attempts="$2" delay="$3" i state health
  for i in $(seq 1 "$attempts"); do
    state="$(service_state "$svc")"
    health="$(service_health "$svc")"
    log "  $svc [$i/$attempts]: state=$state health=$health"
    if [ "$state" = "exited" ] || [ "$state" = "dead" ]; then
      compose logs --no-color --tail=80 "$svc" >&2
      return 1
    fi
    if [ "$health" = "healthy" ] || [ "$health" = "no_healthcheck" ]; then
      return 0
    fi
    sleep "$delay"
  done
  compose logs --no-color --tail=80 "$svc" >&2
  return 1
}

wait_http() {
  local url="$1" attempts="$2" delay="$3" i
  for i in $(seq 1 "$attempts"); do
    curl -fsS --max-time 10 "$url" >/dev/null && echo "HTTP OK: $url" && return 0
    log "  http [$i/$attempts]: waiting for $url"
    sleep "$delay"
  done
  return 1
}

docker volume create m2centerauto-postgres-data >/dev/null 2>&1 || true
docker volume create m2centerauto-uploads >/dev/null 2>&1 || true

cp "$ROOT_ENV" "$ENV_FILE"
printf 'RELEASE_VERSION=%s\n' "$RELEASE" >> "$ENV_FILE"
chmod 600 "$ENV_FILE"
set -a; . "$ENV_FILE"; set +a

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

cd "$APP_DIR"

log "Building images"
compose build --parallel

log "Starting postgres"
compose up -d --no-build --no-deps postgres
wait_healthy postgres 12 5

APP_TABLES="$(compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name<>'_prisma_migrations';" 2>/dev/null || echo 0)"
if [ "${APP_TABLES:-0}" = "0" ]; then
  FAILED="$(compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations';" 2>/dev/null || echo 0)"
  if [ "${FAILED:-0}" = "1" ]; then
    compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
      'DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL;' 2>/dev/null || true
  fi
fi

log "Running migrations"
compose_timeout 10m run --rm migrator

log "Bootstrapping data"
compose_timeout 4m run --rm bootstrap || true

log "Starting alpr"
compose up -d --no-build --no-deps alpr
wait_healthy alpr 18 5

log "Starting plate-scraper"
compose up -d --no-build --no-deps plate-scraper
# A consulta de placa degrada para o cadastro manual se este servico cair,
# entao um scraper doente nao deve abortar o deploy inteiro.
wait_healthy plate-scraper 24 5 || log "AVISO: plate-scraper nao ficou saudavel; consulta de placa cai no cadastro manual"

log "Starting backend"
compose up -d --no-build --no-deps backend
wait_healthy backend 18 5

log "Starting frontend"
compose up -d --no-build --no-deps frontend
wait_healthy frontend 15 5

log "Starting gateway"
compose up -d --no-build --no-deps gateway
wait_healthy gateway 12 5

wait_http "http://127.0.0.1:${DEPLOY_PORT}/health"     8 5 || { compose logs --no-color --tail=40 gateway  >&2; exit 1; }
wait_http "http://127.0.0.1:${DEPLOY_PORT}/api/health" 8 5 || { compose logs --no-color --tail=40 backend  >&2; exit 1; }
curl -fsS --max-time 10 -o /dev/null "http://127.0.0.1:${DEPLOY_PORT}/" || { compose logs --no-color --tail=40 frontend >&2; exit 1; }

ln -sfn "$APP_DIR" "$APP_ROOT/current"
ls -dt "$APP_ROOT/releases"/*/ 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
docker image prune -f >/dev/null 2>&1 || true
log "Deploy complete"
