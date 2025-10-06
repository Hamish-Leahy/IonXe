#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
export RUST_LOG=info

(cd "$ROOT/services/backend-c" && make -s && IONXE_BACKEND_C_BIND=${IONXE_BACKEND_C_BIND:-127.0.0.1:8081} ./ionxe-backend-c) &
(cd "$ROOT" && IONXE_BACKEND_BIND=${IONXE_BACKEND_BIND:-127.0.0.1:8080} cargo run -q -p ionxe-backend) &
(cd "$ROOT" && BACKEND_RS=${BACKEND_RS:-http://127.0.0.1:8080} BACKEND_C=${BACKEND_C:-http://127.0.0.1:8081} IONXE_MIDDLEWARE_BIND=${IONXE_MIDDLEWARE_BIND:-127.0.0.1:8082} cargo run -q -p ionxe-middleware) &

echo "Services starting. Frontend: http://127.0.0.1:8082"
wait
