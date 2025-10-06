#ifndef IONXE_JSON_H
#define IONXE_JSON_H

#include <stddef.h>

// Minimal JSON utility: we avoid external deps. We don't parse; we just
// pass-through bodies and validate that they look like JSON (starts with '{' or '[').

int json_looks_like_object(const char *buf, size_t len);

#endif // IONXE_JSON_H


