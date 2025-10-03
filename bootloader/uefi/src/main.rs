#![no_std]
#![no_main]

mod bootinfo;

extern crate alloc;
use alloc::vec::Vec;
use core::fmt::Write;
use core::mem::{size_of, MaybeUninit};
use uefi::prelude::*;
use uefi::proto::console::gop::{GraphicsOutput, PixelFormat};
use uefi::proto::media::file::{Directory, File, FileAttribute, FileInfo, FileMode, FileType};
use uefi::proto::media::fs::SimpleFileSystem;
use uefi::table::boot::{AllocateType, MemoryDescriptor, MemoryType, OpenProtocolAttributes, OpenProtocolParams};
use uefi::CStr16;
use xmas_elf::ElfFile;

use bootinfo::{BootInfo, FramebufferInfo};

#[entry]
fn efi_main(image_handle: Handle, mut st: SystemTable<Boot>) -> Status {
    // Install allocator and logger per uefi >=0.26 recommendations
    if let Err(_e) = uefi::alloc::init(&st) { return Status::ABORTED; }
    uefi::logger::init().ok();

    let _ = st.stdout().reset(false);
    let _ = writeln!(st.stdout(), "IonXE UEFI stage-2 starting...");

    // 1) Locate GOP
    let gop = st
        .boot_services()
        .locate_protocol::<GraphicsOutput>()
        .expect_success("GOP")
        .expect("GOP protocol not found");
    let gop = unsafe { &mut *gop.get() };
    let mode = gop.current_mode_info();
    let fb = gop.frame_buffer();
    let pixel_format = match mode.pixel_format() {
        PixelFormat::Rgb => 0u32,
        PixelFormat::Bgr => 1u32,
        _ => 2u32, // unsupported/other
    };
    let fb_info = FramebufferInfo {
        address: fb.as_mut_ptr() as u64,
        width: mode.resolution().0 as u32,
        height: mode.resolution().1 as u32,
        pixels_per_scan_line: mode.stride() as u32,
        pixel_format,
    };

    // 2) Open root filesystem and read \\ionxe\\kernel.elf
    let sfs_handle = st
        .boot_services()
        .get_image_file_system(image_handle)
        .expect_success("get_image_file_system")
        .unwrap();
    let sfs = unsafe {
        &mut *st
            .boot_services()
            .open_protocol::<SimpleFileSystem>(
                OpenProtocolParams {
                    handle: sfs_handle,
                    agent: image_handle,
                    controller: None,
                },
                OpenProtocolAttributes::GetProtocol,
            )
            .expect_success("open sfs")
            .unwrap()
            .interface
            .get()
    };

    let mut root: Directory = sfs.open_volume().expect_success("open volume").unwrap();
    let ionxe_dir_name = CStr16::from_str_with_buf("ionxe\0", &mut [0u16; 6]).unwrap();
    let kernel_name = CStr16::from_str_with_buf("kernel.elf\0", &mut [0u16; 11]).unwrap();
    // Ensure directory exists; open it
    let mut ionxe_dir = match root.open(ionxe_dir_name, FileMode::Read, FileAttribute::empty()) {
        Ok(File::Directory(d)) => d,
        Ok(_) => {
            let _ = writeln!(st.stdout(), "ionxe is not a directory");
            return Status::NOT_FOUND;
        }
        Err(_) => {
            let _ = writeln!(st.stdout(), "\\ionxe not found on ESP");
            return Status::NOT_FOUND;
        }
    };

    let mut kernel_file = match ionxe_dir.open(kernel_name, FileMode::Read, FileAttribute::empty()) {
        Ok(File::Regular(f)) => f,
        _ => {
            let _ = writeln!(st.stdout(), "kernel.elf not found");
            return Status::NOT_FOUND;
        }
    };

    // Stat file size
    let mut info_buf = [0u8; 512];
    let file_info: &FileInfo = kernel_file
        .get_info(&mut info_buf)
        .expect_success("file info")
        .unwrap();
    let file_size = file_info.file_size() as usize;
    // Allocate pages for file buffer
    let pages = (file_size + 0xFFF) / 0x1000;
    let file_buf_ptr = st
        .boot_services()
        .allocate_pages(AllocateType::AnyPages, MemoryType::LOADER_DATA, pages)
        .expect_success("alloc file buf")
        .unwrap();
    let file_buf = unsafe { core::slice::from_raw_parts_mut(file_buf_ptr as *mut u8, file_size) };
    let read = kernel_file.read(file_buf).expect_success("read kernel").unwrap();
    if read != file_size {
        let _ = writeln!(st.stdout(), "short read: {} != {}", read, file_size);
        return Status::ABORTED;
    }

    // Parse ELF and load PT_LOAD segments
    let elf = ElfFile::new(file_buf).expect("invalid ELF");
    for ph in elf.program_iter() {
        use xmas_elf::program::{SegmentData, Type};
        if ph.get_type().unwrap_or(Type::Null) != Type::Load {
            continue;
        }
        let vaddr = ph.virtual_addr() as usize;
        let memsz = ph.mem_size() as usize;
        let filesz = ph.file_size() as usize;
        let file_offset = ph.offset() as usize;
        if memsz == 0 {
            continue;
        }
        // Allocate pages for segment
        let pages = (memsz + 0xFFF) / 0x1000;
        let seg_ptr = st
            .boot_services()
            .allocate_pages(AllocateType::Address(vaddr as u64), MemoryType::LOADER_DATA, pages)
            .or_else(|_| {
                st.boot_services().allocate_pages(AllocateType::AnyPages, MemoryType::LOADER_DATA, pages)
            })
            .expect_success("alloc segment")
            .unwrap();
        let seg_slice = unsafe { core::slice::from_raw_parts_mut(seg_ptr as *mut u8, memsz) };
        // Zero and copy content
        for b in seg_slice.iter_mut() { *b = 0; }
        seg_slice[..filesz].copy_from_slice(&file_buf[file_offset..file_offset + filesz]);
    }

    // Entry point
    let entry = elf.header.pt2.entry_point() as usize;

    // 3) Gather memory map buffer (fetch size and descriptor size)
    let bs = st.boot_services();
    let (_map_key, map_buf_len) = bs.memory_map_size();
    let desc_size = size_of::<MemoryDescriptor>();
    let mut map_buf = vec![0u8; map_buf_len + 8 * desc_size];

    // Locate ACPI RSDP if present
    let rsdp_addr = st.config_table().iter().find_map(|entry| {
        // ACPI 2.0 GUID: RSDP 2.0. uefi crate provides no consts; compare string match
        let guid = entry.guid.to_string();
        if guid.contains("8868e871-e4f1-11d3-bc22-0080c73c8881") || guid.contains("eb9d2d30-2d88-11d3-9a16-0090273fc14d") {
            Some(entry.address as u64)
        } else {
            None
        }
    }).unwrap_or(0);

    // We'll pass the raw memory map buffer to the kernel; we must get the final map and key
    let (exit_key, desc_iter) = bs.memory_map(&mut map_buf).expect_success("mem map final").unwrap();
    let map_len = desc_iter.byte_len();

    // Prepare BootInfo in LOADER_DATA
    let bootinfo_ptr = bs
        .allocate_pages(AllocateType::AnyPages, MemoryType::LOADER_DATA, 1)
        .expect_success("alloc bootinfo")
        .unwrap();
    let bootinfo = BootInfo { rsdp_addr, memory_map_ptr: map_buf.as_ptr() as u64, memory_map_len: map_len as u32, memory_map_desc_size: desc_size as u32, framebuffer: fb_info };
    unsafe {
        (bootinfo_ptr as *mut BootInfo).write(bootinfo);
    }

    // Prevent Vec from being dropped (and freed) after ExitBootServices
    let map_ptr = map_buf.as_ptr();
    core::mem::forget(map_buf);

    // Exit boot services using the retrieved key
    let (_st_runtime, _mmap) = match st.exit_boot_services(exit_key) {
        Ok(v) => v,
        Err(e) => {
            // Best-effort error print before returning
            let _ = writeln!(st.stdout(), "ExitBootServices failed: {:?}", e.status());
            return e.status();
        }
    };

    // Jump to kernel entry: fn(*const BootInfo) -> !
    let entry_fn: extern "sysv64" fn(*const BootInfo) -> ! = unsafe { core::mem::transmute(entry) };
    entry_fn(bootinfo_ptr as *const BootInfo)
}



