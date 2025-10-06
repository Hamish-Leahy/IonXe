IonXE Backend (C)

Build

```
make -C services/backend-c
```

Run

```
services/backend-c/ionxe-backend-c
```

By default it listens on `127.0.0.1:8081`.

API

- GET /health
- GET /api/v1/patch
- PUT /api/v1/patch
- GET /api/v1/routing
- PUT /api/v1/routing
- GET /api/v1/dimmers/racks
- PUT /api/v1/dimmers/racks
- GET /api/v1/dimmers/config
- PUT /api/v1/dimmers/config

State persists under `build/state/` as JSON files compatible with the Rust backend.


