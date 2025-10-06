# Services Architecture

- Backend (Rust): HTTP API for patch, routing, scenes, filesystem. In-memory state with JSON persistence at `IONXE_STATE_DIR`.
- Backend-C: Low-latency dimmer engine with binary endpoints for levels/LUT/frame and JSON for configs.
- Middleware (Rust): Serves static frontend and proxies API requests to backends; provides scene recall with fades.
- Frontend: Static HTML/CSS/JS, EOS-inspired UI; hash router; console, desk, magic, patch, dimmers, command center, files.

## Ports and Env
- Backend RS: `IONXE_BACKEND_BIND` (default 127.0.0.1:8080)
- Backend C: `IONXE_BACKEND_C_BIND` (default 127.0.0.1:8081)
- Middleware: `IONXE_MIDDLEWARE_BIND` (default 127.0.0.1:8082)
- State dir: `IONXE_STATE_DIR` (default build/state)
- Files root: `IONXE_FILES_ROOT` (default build)

## Data
- Patch: universes, fixtures, channel_map
- Routing: output targets
- Scenes: id, label, 512 levels

## Security Notes
- Middleware sanitizes and proxies; avoid exposing internal ports externally
- Filesystem APIs sanitize relative subpaths only under `IONXE_FILES_ROOT`
