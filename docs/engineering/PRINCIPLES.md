# Engineering Principles

- Clarity over cleverness; readability first
- Small, composable modules; prefer pure functions where possible
- Strong typing, no panics in services; explicit error handling
- Backwards-compatible APIs; versioned endpoints under /api/v1
- Persistence paths configurable via env; no hard-coded absolute paths
- Tests for critical paths; smoke tests for endpoints
- Observability: tracing logs, health checks, structured errors
- Security: input validation, path sanitization, least privilege
- Docs and changelog updated with each feature
- Avoid dead code and TODOs; file issues instead
