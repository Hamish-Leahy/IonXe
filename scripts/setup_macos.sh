#!/usr/bin/env bash
set -euo pipefail

# IonXE macOS developer setup script
# Non-interactive: safe to run multiple times. Requires macOS with Homebrew.

function log() { echo "[setup] $*"; }

if [[ "${CI:-}" == "true" ]]; then
  export NONINTERACTIVE=1
fi

if ! command -v brew >/dev/null 2>&1; then
  log "Homebrew not found. Please install from https://brew.sh and rerun."
  exit 1
fi

log "Updating Homebrew..."
brew update

PACKAGES=(
  git
  cmake
  ninja
  qemu
  llvm
  nasm
  qpdf
  python@3.11
  pkg-config
  ccache
)

log "Installing packages: ${PACKAGES[*]}"
brew install ${PACKAGES[@]} || true

# Rust toolchain
if ! command -v rustup >/dev/null 2>&1; then
  log "Installing rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
  export PATH="$HOME/.cargo/bin:$PATH"
else
  export PATH="$HOME/.cargo/bin:$PATH"
  log "Updating Rust toolchain..."
  rustup update stable
fi

log "Adding Rust targets: x86_64-unknown-none and x86_64-unknown-uefi"
rustup target add x86_64-unknown-none || true
rustup target add x86_64-unknown-uefi || true

# Python venv for build tooling
PYBIN=$(brew --prefix)/opt/python@3.11/bin/python3.11
if [[ -x "$PYBIN" ]]; then
  log "Ensuring Python venv at .venv"
  $PYBIN -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip wheel
  # Placeholder: add build tools as they are introduced
fi

# LLVM and NASM path hints
LLVM_PREFIX=$(brew --prefix llvm)
echo "LLVM_PATH=$LLVM_PREFIX" > build/.host.env 2>/dev/null || true

log "Setup complete. Restart your shell or 'source "$HOME/.cargo/env"' if Rust is new."


