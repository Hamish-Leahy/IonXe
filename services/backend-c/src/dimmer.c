#include "dimmer.h"

#include <string.h>

static uint8_t g_levels[DMX_SLOTS];
static uint8_t g_lut[LUT_SIZE];
static uint8_t g_frame[DMX_SLOTS];

#if defined(__aarch64__)
// Assembly implementation
void lut_apply_arm64(const uint8_t *lut, const uint8_t *in, uint8_t *out, int len);
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
#else
    lut_apply_c(g_lut, g_levels, g_frame, DMX_SLOTS);
#endif
    if (out_len) *out_len = DMX_SLOTS;
    return g_frame;
}


