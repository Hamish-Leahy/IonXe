Build Instructions

Will detail toolchains, build steps, and supported hosts.

Supported Host Environments
- macOS 14+ (Apple Silicon or Intel) with Homebrew
- Linux (Ubuntu 22.04+) – TBD

Required Toolchains (MVP)
- Homebrew packages: git, cmake, ninja, qemu, llvm, nasm, python@3.11, pkg-config, ccache
- Rust: rustup (stable), target `x86_64-unknown-none`
- Python: venv for build tooling

Quick Start (macOS)
1. Run the setup script from repo root:
   - `bash scripts/setup_macos.sh`
2. Ensure Rust and target are available:
   - `rustc --version` and `rustup target list --installed`
3. Activate the Python venv (if desired):
   - `source .venv/bin/activate`

Building (placeholders until code is added)
- Firmware/Bootloader: TBD
- Kernel: TBD
- QEMU run: TBD

Version Pins (initial recommendations)
- Rust toolchain: stable (auto-updated via rustup)
- LLVM via Homebrew: latest (recorded in `build/.host.env`)
- Python: 3.11.x

Notes
- QEMU + OVMF recommended for UEFI testing.
- Prefer reproducible builds; we will introduce lockfiles and container images later.

