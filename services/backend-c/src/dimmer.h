#ifndef IONXE_DIMMER_H
#define IONXE_DIMMER_H

#include <stddef.h>
#include <stdint.h>

#define DMX_SLOTS 512
#define LUT_SIZE 256

void dimmer_init(void);

// Set raw input levels (512 bytes). Returns 0 on success.
int dimmer_set_levels(const uint8_t *levels, size_t len);

// Get current raw input levels (512 bytes). Returns 0 on success.
int dimmer_get_levels(uint8_t *out_levels, size_t len);

// Set 256-byte LUT mapping. Returns 0 on success.
int dimmer_set_lut(const uint8_t *lut, size_t len);

// Compute output into internal buffer and return pointer and len.
// The returned pointer remains valid until next call that mutates levels/LUT.
const uint8_t* dimmer_get_frame(size_t *out_len);

// Global master 0..255
void dimmer_set_grand_master(uint8_t gm);
uint8_t dimmer_get_grand_master(void);

#endif // IONXE_DIMMER_H


