#if defined(__aarch64__)
// Simple AArch64 assembly loop to apply LUT: out[i] = lut[in[i]]
// void lut_apply_arm64(const uint8_t *lut, const uint8_t *in, uint8_t *out, int len);
// x0=lut, x1=in, x2=out, w3=len
    .text
    .align 2
    .global _lut_apply_arm64
    .global lut_apply_arm64
_lut_apply_arm64:
lut_apply_arm64:
    cbz w3, 2f
1:  ldrb w4, [x1], #1        // load in byte
    ldrb w5, [x0, x4]         // lut[in]
    strb w5, [x2], #1         // store out
    subs w3, w3, #1
    b.ne 1b
2:  ret
#endif


