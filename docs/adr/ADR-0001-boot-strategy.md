Title: Boot Strategy for x86-64 Reference Platform
Date: 2025-10-02
Status: Proposed

Context
- We need a reproducible, debuggable boot path for x86-64 SFF PCs and similar hardware.
- Options include: (1) coreboot + Tianocore (EDK II), (2) vendor firmware (UEFI) with custom stage-2 loader, (3) fully custom firmware.
- Constraints: clean-room implementation, strong community tooling, ability to chainload, logging/serial, and secure boot later.

Decision
- Use vendor UEFI firmware initially and implement a custom stage-2 loader that hands off to our kernel via a simple Boot Protocol.
- Keep a parallel track to evaluate coreboot + Tianocore for later reproducibility and faster boot, but not required for MVP.

Consequences
- Positive: Fastest path to bring-up on widely available PCs; rich UEFI services (GOP framebuffer, disk, input) simplify early I/O.
- Positive: Can run in QEMU with OVMF and on bare metal without flashing firmware.
- Negative: Less control vs. coreboot; variability across UEFI implementations.
- Risk: UEFI quirks; must design a minimal dependency layer so kernel does not rely on runtime UEFI.

Alternatives Considered
- coreboot + Tianocore: great control and reproducibility, but higher upfront complexity and hardware porting cost.
- Pure custom firmware: maximal control, but non-viable short-term and high maintenance burden.


