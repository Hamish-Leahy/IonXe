#include "dimmer.h"

#include <string.h>

static uint8_t g_levels[DMX_SLOTS];
static uint8_t g_lut[LUT_SIZE];
static uint8_t g_frame[DMX_SLOTS];
static uint8_t g_grand_master = 255;

#if defined(__aarch64__)
// Assembly implementation
void lut_apply_arm64(const uint8_t *lut, const uint8_t *in, uint8_t *out, int len);
#elif defined(__x86_64__)
// x86_64 assembly implementation
void lut_apply_x86_64(const uint8_t *lut, const uint8_t *in, uint8_t *out, int len);
#endif

void dimmer_init(void) {
    for (size_t i = 0; i < DMX_SLOTS; ++i) g_levels[i] = 0;
    for (size_t i = 0; i < LUT_SIZE; ++i) g_lut[i] = (uint8_t)i;
    for (size_t i = 0; i < DMX_SLOTS; ++i) g_frame[i] = 0;
}

int dimmer_set_levels(const uint8_t *levels, size_t len) {
    if (!levels || len != DMX_SLOTS) return -1;
    memcpy(g_levels, levels, DMX_SLOTS);
    return 0;
}

int dimmer_get_levels(uint8_t *out, size_t len) {
    if (!out || len != DMX_SLOTS) return -1;
    memcpy(out, g_levels, DMX_SLOTS);
    return 0;
}

int dimmer_set_lut(const uint8_t *lut, size_t len) {
    if (!lut || len != LUT_SIZE) return -1;
    memcpy(g_lut, lut, LUT_SIZE);
    return 0;
}

static void lut_apply_c(const uint8_t *lut, const uint8_t *in, uint8_t *out, int len) {
    for (int i = 0; i < len; ++i) out[i] = lut[in[i]];
}

const uint8_t* dimmer_get_frame(size_t *out_len) {
#if defined(__aarch64__)
    lut_apply_arm64(g_lut, g_levels, g_frame, DMX_SLOTS);
#elif defined(__x86_64__)
    lut_apply_x86_64(g_lut, g_levels, g_frame, DMX_SLOTS);
#else
    lut_apply_c(g_lut, g_levels, g_frame, DMX_SLOTS);
#endif
    if (g_grand_master != 255) {
        // scale frame by GM
        for (int i = 0; i < DMX_SLOTS; ++i) {
            g_frame[i] = (uint8_t)(((unsigned)g_frame[i] * (unsigned)g_grand_master) / 255u);
        }
    }
    if (out_len) *out_len = DMX_SLOTS;
    return g_frame;
}

void dimmer_set_grand_master(uint8_t gm) { g_grand_master = gm; }
uint8_t dimmer_get_grand_master(void) { return g_grand_master; }


