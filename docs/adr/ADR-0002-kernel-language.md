Title: Kernel Implementation Language
Date: 2025-10-02
Status: Proposed

Context
- We need a language for the kernel and core libraries balancing safety, performance, and ecosystem maturity.
- Candidates: C, C++, Rust, Zig.
- Constraints: Strong control over memory layout, no GC pauses, cross-compilation toolchain availability, active community.

Decision
- Use Rust for the kernel and most drivers, with small, carefully-audited `unsafe` regions and `no_std`.
- Allow C for select low-level pieces or third-party imports, behind FFI with strict boundaries.

Consequences
- Positive: Memory safety, modern tooling (Cargo), good x86-64 support, growing OSDev ecosystem.
- Positive: Strong abstraction without sacrificing performance; good inline assembly and `core::arch` support.
- Negative: Learning curve and occasional nightly features; build times.
- Risk: FFI boundary bugs; mitigated with clear HAL traits and integration tests.

Alternatives Considered
- C: maximal control and mature ecosystem but higher memory safety risk.
- C++: stronger abstractions than C, but complexity and ABI pitfalls.
- Zig: promising, simpler tooling, but smaller ecosystem today.


