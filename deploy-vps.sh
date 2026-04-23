#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/m2centerauto"
COMPOSE_FILE="$APP_DIR/docker-compose.production.yml"
ENV_FILE="$APP_DIR/.env"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

cd "$APP_DIR"

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
export BUILDKIT_PROGRESS=plain

set -a
. "$ENV_FILE"
set +a

COMPOSE=(docker compose -p m2centerauto -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

compose() { "${COMPOSE[@]}" "$@"; }

service_health() {
  local id
  id="$(compose ps -q "$1" 2>/dev/null || true)"
  [ -z "$id" ] && echo "not_found" && return
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no_healthcheck{{end}}' "$id" 2>/dev/null || echo "not_found"
}

service_state() {
  local id
  id="$(compose ps -q "$1" 2>/dev/null || true)"
  [ -z "$id" ] && echo "not_found" && return
  docker inspect --format '{{.State.Status}}' "$id" 2>/dev/null || echo "not_found"
}

wait_healthy() {
  local svc="$1" attempts="$2" delay="$3" i state health
  for i in $(seq 1 "$attempts"); do
    state="$(service_state "$svc")"
    health="$(service_health "$svc")"
    log "  $svc [$i/$attempts]: state=$state health=$health"
    [ "$state" = "exited" ] || [ "$state" = "dead" ] && compose logs --no-color --tail=80 "$svc" >&2 && return 1
    [ "$health" = "healthy" ] || [ "$health" = "no_healthcheck" ] && return 0
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

# Volumes
docker volume create m2centerauto-postgres-data >/dev/null 2>&1 || true
docker volume create m2centerauto-uploads >/dev/null 2>&1 || true

# Build — Docker layer cache on VPS means only changed layers rebuild
log "Building images (using local Docker cache)"
compose build --parallel

# Start infra
log "Starting postgres"
compose up -d --no-build --no-deps postgres
wait_healthy postgres 12 5

# Clean up failed migrations on empty DB
APP_TABLES="$(compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name<>'_prisma_migrations';" 2>/dev/null || echo 0)"
if [ "${APP_TABLES:-0}" = "0" ]; then
  FAILED_MIGRATIONS="$(compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations';" 2>/dev/null || echo 0)"
  if [ "${FAILED_MIGRATIONS:-0}" = "1" ]; then
    compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
      'DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL;' 2>/dev/null || true
  fi
fi

log "Running migrations"
timeout 10m compose run --rm --no-build migrator

log "Bootstrapping data"
timeout 4m compose run --rm --no-build bootstrap || true

log "Starting alpr"
compose up -d --no-build --no-deps alpr
wait_healthy alpr 18 5

log "Starting backend"
compose up -d --no-build --no-deps backend
wait_healthy backend 18 5

log "Starting frontend"
compose up -d --no-build --no-deps frontend
wait_healthy frontend 15 5

log "Starting gateway"
compose up -d --no-build --no-deps gateway
wait_healthy gateway 12 5

# Smoke tests
wait_http "http://127.0.0.1:7001/health"   8 5 || (compose logs --no-color --tail=40 gateway >&2; exit 1)
wait_http "http://127.0.0.1:7001/api/health" 8 5 || (compose logs --no-color --tail=40 backend >&2; exit 1)
curl -fsS --max-time 10 -o /dev/null "http://127.0.0.1:7001/" || (compose logs --no-color --tail=40 frontend >&2; exit 1)

log "Pruning dangling images"
docker image prune -f >/dev/null 2>&1 || true

log "Deploy complete"
