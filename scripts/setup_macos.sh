#!/usr/bin/env bash
set -euo pipefail

PREFIX=${PREFIX:-/usr/local}
BIN_DIR="$PREFIX/bin"
VAR_DIR="$PREFIX/var/ionxe"
LOG_DIR="$VAR_DIR/log"
STATE_DIR="$VAR_DIR/state"

echo "[ionxe] Building release binaries..."
cargo build -p ionxe-backend -p ionxe-middleware --release
make -C "$(dirname "$0")/../services/backend-c"

echo "[ionxe] Installing binaries to $BIN_DIR"
install -d "$BIN_DIR" "$LOG_DIR" "$STATE_DIR"
install -m 0755 "$(dirname "$0")/../services/backend-c/ionxe-backend-c" "$BIN_DIR/ionxe-backend-c"
install -m 0755 "$(dirname "$0")/../target/release/ionxe-backend" "$BIN_DIR/ionxe-backend"
install -m 0755 "$(dirname "$0")/../target/release/ionxe-middleware" "$BIN_DIR/ionxe-middleware"

echo "[ionxe] Installing launchd plists"
PLIST_DIR="$HOME/Library/LaunchAgents"
install -d "$PLIST_DIR"
install -m 0644 "$(dirname "$0")/../ci/ionxe.backend.plist" "$PLIST_DIR/com.ionxe.backend.plist"
install -m 0644 "$(dirname "$0")/../ci/ionxe.backend-c.plist" "$PLIST_DIR/com.ionxe.backend-c.plist"
install -m 0644 "$(dirname "$0")/../ci/ionxe.middleware.plist" "$PLIST_DIR/com.ionxe.middleware.plist"

echo "[ionxe] Loading launch agents"
launchctl unload "$PLIST_DIR/com.ionxe.middleware.plist" 2>/dev/null || true
launchctl unload "$PLIST_DIR/com.ionxe.backend-c.plist" 2>/dev/null || true
launchctl unload "$PLIST_DIR/com.ionxe.backend.plist" 2>/dev/null || true
launchctl load "$PLIST_DIR/com.ionxe.backend.plist"
launchctl load "$PLIST_DIR/com.ionxe.backend-c.plist"
launchctl load "$PLIST_DIR/com.ionxe.middleware.plist"

echo "[ionxe] Done. Services should be running:"
echo "  backend    : http://127.0.0.1:8080"
echo "  backend-c  : http://127.0.0.1:8081"
echo "  middleware : http://127.0.0.1:8082"


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


