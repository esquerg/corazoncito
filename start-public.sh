#!/usr/bin/env bash
#
# Corazoncito — levanta la app en UN solo proceso (UI + API en :3001)
# y la expone con un túnel público de Cloudflare (URL https temporal).
#
# Uso:   ./start-public.sh
# Corta: Ctrl+C  (apaga túnel y servidor)
#
set -euo pipefail
cd "$(dirname "$0")"

PORT=3001

echo "▶ 1/3  Compilando el frontend…"
corepack pnpm -C frontend build >/dev/null

echo "▶ 2/3  Iniciando el servidor en :$PORT (UI + API)…"
corepack pnpm -C backend exec tsx src/server.ts &
SERVER_PID=$!

cleanup() {
  echo "⏹  Apagando…"
  kill "$SERVER_PID" 2>/dev/null || true
  [ -n "${TUNNEL_PID:-}" ] && kill "$TUNNEL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Esperar a que el servidor responda
until curl -fsS "http://localhost:$PORT/api/v1/health" >/dev/null 2>&1; do
  sleep 1
done
echo "   Servidor arriba."

echo "▶ 3/3  Abriendo túnel público (la URL aparece abajo)…"
echo "        Comparte la URL https://...trycloudflare.com"
echo "        Déjalo corriendo mientras hagas QA. Ctrl+C para cerrar."
echo
cloudflared tunnel --url "http://localhost:$PORT"
