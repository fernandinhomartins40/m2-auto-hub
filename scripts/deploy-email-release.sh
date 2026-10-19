#!/usr/bin/env bash
# Executar na VPS, depois dos builds/testes locais, com o pacote em /tmp.
set -euo pipefail
ROOT=/opt/m2centerauto
RELEASE=email-20261018
DEST="$ROOT/releases/$RELEASE"
test ! -e "$DEST"
test -s "$ROOT/.velomail.env.pending"
PREVIOUS=$(readlink -f "$ROOT/current")
BACKEND=$(docker inspect m2centerauto-backend-1 --format '{{.Config.Image}}')
FRONTEND=$(docker inspect m2centerauto-frontend-1 --format '{{.Config.Image}}')
mkdir -p "$DEST" "$ROOT/backups"
chmod 700 "$DEST"
tar -xzf /tmp/m2-transactional-email.tar.gz -C "$DEST"
printf '%s\n' "$PREVIOUS" > "$DEST/previous-release"
cp "$ROOT/.env" "$DEST/env.before"
chmod 600 "$DEST/env.before"
docker exec m2centerauto-postgres-1 sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$ROOT/backups/before-$RELEASE.sql.gz"
test -s "$ROOT/backups/before-$RELEASE.sql.gz"
chmod 600 "$ROOT/backups/before-$RELEASE.sql.gz"
printf 'FROM %s\nCOPY backend/dist /app/dist\nCOPY backend/prisma /app/prisma\nRUN ./node_modules/.bin/prisma generate\n' "$BACKEND" > "$DEST/Dockerfile.backend"
printf 'FROM %s\nCOPY frontend/dist /usr/share/nginx/html\n' "$FRONTEND" > "$DEST/Dockerfile.frontend"
docker build -f "$DEST/Dockerfile.backend" -t "m2centerauto-backend:$RELEASE" "$DEST"
docker build -f "$DEST/Dockerfile.frontend" -t "m2centerauto-frontend:$RELEASE" "$DEST"
for svc in alpr plate-scraper; do
  docker tag "$(docker inspect "m2centerauto-$svc-1" --format '{{.Image}}')" "m2centerauto-$svc:$RELEASE"
done
python3 - "$ROOT/.env" "$ROOT/.velomail.env.pending" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
updates = dict(line.split('=', 1) for line in pathlib.Path(sys.argv[2]).read_text().splitlines() if '=' in line)
lines = [line for line in path.read_text().splitlines() if line.split('=', 1)[0] not in updates]
path.write_text('\n'.join(lines + [f'{k}={v}' for k,v in updates.items()]) + '\n')
path.chmod(0o600)
PY
cp "$ROOT/.env" "$DEST/.env"
printf 'IMAGE_PREFIX=m2centerauto\nIMAGE_TAG=%s\nRELEASE_VERSION=%s\n' "$RELEASE" "$RELEASE" >> "$DEST/.env"
chmod 600 "$DEST/.env"
COMPOSE=(docker compose -p m2centerauto -f "$DEST/docker-compose.production.yml" --env-file "$DEST/.env")
"${COMPOSE[@]}" run --rm --no-deps migrator
"${COMPOSE[@]}" up -d --no-deps backend
for attempt in $(seq 1 30); do
  if [ "$(docker inspect m2centerauto-backend-1 --format '{{.State.Health.Status}}')" = healthy ]; then break; fi
  sleep 2
done
test "$(docker inspect m2centerauto-backend-1 --format '{{.State.Health.Status}}')" = healthy
"${COMPOSE[@]}" up -d --no-deps frontend
curl --retry 5 --retry-delay 2 --retry-all-errors -fsS http://127.0.0.1:3092/api/health >/dev/null
ln -sfn "$DEST" "$ROOT/current"
rm "$ROOT/.velomail.env.pending"
echo "Release $RELEASE healthy; previous release: $PREVIOUS"
