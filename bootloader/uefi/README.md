IonXE UEFI Stage-2 Bootloader (Rust)

Build

Prereqs: Rust stable with target `x86_64-unknown-uefi`.

```
rustup target add x86_64-unknown-uefi
cargo build --target x86_64-unknown-uefi
```

The output is a PE/COFF `.efi` binary at `target/x86_64-unknown-uefi/debug/ionxe-boot-uefi.efi`.

Run with QEMU + OVMF

- Install: `brew install qemu edk2-ovmf`
- Create a FAT ESP and copy the EFI binary to `EFI/BOOT/BOOTX64.EFI`.

```
mkdir -p build/esp/EFI/BOOT
cp target/x86_64-unknown-uefi/debug/ionxe-boot-uefi.efi build/esp/EFI/BOOT/BOOTX64.EFI
qemu-system-x86_64 -bios $(brew --prefix)/share/edk2-ovmf/OVMF_CODE.fd -drive if=virtio,format=raw,file=fat:rw:build/esp -serial stdio -display none
```

Next Steps

- Implement GOP framebuffer query.
- Load kernel from `\\ionxe\\kernel.elf` on ESP.
- Provide boot handoff per `specs/boot_handoff.md`.


