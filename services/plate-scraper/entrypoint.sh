#!/bin/sh
set -e

# Sobe o display virtual no mesmo numero que o DISPLAY aponta e espera ele
# ficar pronto antes de iniciar o servidor - o Chrome headful nao sobe sem tela.
Xvfb "$DISPLAY" -screen 0 1366x768x24 -nolisten tcp &
XVFB_PID=$!

for _ in $(seq 1 30); do
  if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

trap 'kill $XVFB_PID 2>/dev/null' TERM INT

exec node server.js
