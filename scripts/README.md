Scripts

Automation for setup, build, lint, test, and release tasks.

Setup
- macOS: run `bash scripts/setup_macos.sh` from the repo root.
- The script installs Homebrew packages, Rust toolchain, and prepares a Python 3.11 venv.
- Safe to re-run; non-interactive. If Rust is new, `source "$HOME/.cargo/env"`.

