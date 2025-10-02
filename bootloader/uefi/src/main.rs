#![no_std]
#![no_main]

use core::fmt::Write;
use uefi::prelude::*;

#[entry]
fn efi_main(_image_handle: Handle, system_table: SystemTable<Boot>) -> Status {
    // Initialize UEFI services (logging, allocator, panic handler)
    if let Err(_e) = uefi_services::init(&system_table) {
        // If services fail to init, attempt best-effort return
        return Status::ABORTED;
    }

    // Clear screen and print a greeting
    let _ = system_table.stdout().reset(false);
    let _ = writeln!(system_table.stdout(), "IonXE UEFI stage-2 starting...");
    let _ = writeln!(system_table.stdout(), "Firmware: {:?}", system_table.firmware_revision());

    // TODO: Probe GOP framebuffer, memory map, and load kernel from ESP

    Status::SUCCESS
}

// Required by no_std if not provided by uefi-services, but uefi-services includes a panic handler.


