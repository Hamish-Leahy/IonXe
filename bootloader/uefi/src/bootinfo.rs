#![allow(dead_code)]

#[repr(C)]
pub struct FramebufferInfo {
    pub address: u64,
    pub width: u32,
    pub height: u32,
    pub pixels_per_scan_line: u32,
    pub pixel_format: u32,
}

#[repr(C)]
pub struct BootInfo {
    pub rsdp_addr: u64,
    pub memory_map_ptr: u64,
    pub memory_map_len: u32,
    pub memory_map_desc_size: u32,
    pub framebuffer: FramebufferInfo,
}

