# Open IonXE OS

An open-source, from-scratch operating system and firmware stack inspired by the Eos IonXE lighting console, designed for modern hardware with an easier learning curve and extensible architecture.

This project aims to deliver BIOS/bootloader, kernel, drivers, and userland tailored to stage lighting control workflows, with a clean, approachable developer experience. No proprietary code or assets from ETC are used; this work is community-built and legally clean-room by design.

## Vision and Scope

* Build a complete boot-to-desk stack: firmware → bootloader → kernel → device drivers → services → UI.
* Target x86-64 initially; keep ARM64 in scope. Support common peripherals used in lighting consoles.
* Prioritize reliability, low-latency I/O, and predictable performance over raw throughput.
* Provide first-class developer tooling, documentation, and an approachable UX for new users.

## Repository Structure

```
bootloader/      # Early init, hardware bring-up, handoff to kernel
firmware/        # Platform firmware or coreboot configs (if applicable)
hardware/        # Public research notes, schematics (non-proprietary), BOMs
os/              # Kernel, drivers, HAL, subsystems, userland
  kernel/
  drivers/
  hal/
  fs/
  net/
  audio/
  graphics/
  lib/
  userland/
  config/
tools/           # Developer tools and utilities
scripts/         # Build and developer scripts
build/           # Build outputs and toolchain configs
ci/              # Continuous integration configs
docs/            # Documentation, ADRs, user guides, API refs
examples/        # Example apps, demos, reference configurations
specs/           # Public specifications and interface contracts
third_party/     # Third-party code and licenses
```

## Getting Started

1. See `docs/overview/` for the big picture and glossary.
2. Read `docs/architecture/` for the boot, kernel, and subsystem designs.
3. Follow `docs/build/` to set up your toolchains and build the project.
4. Explore `docs/development/` for contribution flow, code style, and testing.

## Contributing

Please read `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md` before contributing. We welcome issues, proposals, and pull requests. Architecture Decision Records (ADRs) live in `docs/adr/`.

## Legal and Ethics

This project is community-run and not affiliated with ETC. We do not accept or use proprietary code, confidential materials, or trademarks beyond fair use. Contributors must ensure compliance with licenses and applicable laws.

## Roadmap

High-level milestones are tracked in `ROADMAP.md`, with granular tasks in `TODO.md`.
