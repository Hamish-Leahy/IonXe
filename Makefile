.PHONY: all build run clean backend backend-c middleware frontend uefi test fmt lint

all: build

build: backend backend-c middleware

backend:
	cargo build -p ionxe-backend

backend-c:
	$(MAKE) -C services/backend-c

middleware:
	cargo build -p ionxe-middleware

frontend:
	@echo "Static files served via middleware"

uefi:
	cargo build -p ionxe-boot-uefi --target x86_64-unknown-uefi

run:
	@echo "Use scripts/dev_start.sh"

clean:
	cargo clean
	$(MAKE) -C services/backend-c clean

fmt:
	cargo fmt --all || true

lint:
	cargo clippy --all-targets -- -D warnings || true
