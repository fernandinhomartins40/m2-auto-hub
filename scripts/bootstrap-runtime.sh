#!/usr/bin/env bash
set -euo pipefail

need=0
for b in curl nginx docker; do command -v "$b" >/dev/null 2>&1 || { need=1; break; }; done
docker compose version >/dev/null 2>&1 || need=1

if [ "$need" -eq 1 ]; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get -qq update
  apt-get -qq install -y --no-install-recommends \
    ca-certificates curl nginx certbot openssl tar docker.io
  apt-get -qq install -y --no-install-recommends docker-compose-v2 2>/dev/null || \
  apt-get -qq install -y --no-install-recommends docker-compose-plugin || true
fi

systemctl enable --now docker nginx 2>/dev/null || true
echo "Runtime OK"
