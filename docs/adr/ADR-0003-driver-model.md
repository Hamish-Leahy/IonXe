Title: Driver Model and HAL Boundaries
Date: 2025-10-02
Status: Proposed

Context
- We need a driver architecture that isolates hardware specifics and enables testability and portability across platforms.
- Requirements: simple HAL traits, interrupt model, DMA-safe buffers, async/event pathways, and userland exposure.

Decision
- Define a `hal/` crate exposing stable Rust traits for buses (PCI, USB, I2C, SPI), timers, interrupts, memory mapping, and storage.
- Implement drivers as separate crates that depend only on HAL traits, not concrete platform code.
- Provide a minimal kernel driver manager for probe/bind lifecycle and power/state transitions.

Consequences
- Positive: Testability via mock HALs; portability to ARM64 later; clearer safety boundaries.
- Positive: Easier community contributions (drivers live in their own crates with CI).
- Negative: Some indirection overhead; careful versioning of HAL traits required.
- Risk: Trait churn; mitigate with semver discipline and ADRs for breaking changes.

Alternatives Considered
- Monolithic drivers in kernel tree tightly coupled to platform code.
- Userspace-only drivers: simpler isolation but insufficient for many timing-critical devices.


