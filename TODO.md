Master TODO

This is the canonical backlog. Keep items small and actionable. An AI assistant and maintainers will curate and update this list.

Contributing to this list
- Add new items under the appropriate section with unchecked boxes.
- Reference issues/PRs when possible.
- Larger decisions should link to ADRs in `docs/adr/`.

Now / Next
- [ ] Define initial hardware reference platform(s) (x86-64 SFF PC, specific boards)
- [ ] Choose boot path (coreboot + Tianocore, or custom stage-2) and document tradeoffs
- [ ] Define kernel MVP scope (scheduler, memory, IPC, drivers skeleton)
- [ ] Create device driver HAL boundaries and interfaces
- [ ] UX prototype for desk UI (mockups, layouts, input model)

Foundation
- [ ] Toolchain setup scripts for macOS/Linux
- [ ] CI smoke pipeline (lint/build/docs) once code exists
- [ ] Coding standards and formatting configs

Documentation
- [ ] Fill out build docs with exact toolchain versions
- [ ] Author first ADRs: boot strategy, kernel language choice, driver model

Stretch
- [ ] ARM64 enablement plan
- [ ] Real-time audio/MIDI subsystem design
- [ ] Networked console session protocol draft

