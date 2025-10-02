Boot Architecture (Draft)

Goals
- Reliable, debuggable boot path on commodity x86-64 hardware.

Options
- Coreboot + Tianocore: Faster iteration, reuses mature components.
- Custom stage-2 loader: Maximum control, more engineering effort.

Handoff
- See `specs/boot_handoff.md` for contract.

