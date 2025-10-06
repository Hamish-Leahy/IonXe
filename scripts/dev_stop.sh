#!/usr/bin/env bash
set -euo pipefail
pkill -f ionxe-backend-c || true
pkill -f ionxe-backend || true
pkill -f ionxe-middleware || true
echo "Stopped IonXE services"
