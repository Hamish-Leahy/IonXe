#include "json.h"

int json_looks_like_object(const char *buf, size_t len) {
    if (!buf || len == 0) return 0;
    // skip leading whitespace
    size_t i = 0;
    while (i < len && (buf[i] == ' ' || buf[i] == '\n' || buf[i] == '\r' || buf[i] == '\t')) i++;
    if (i >= len) return 0;
    return (buf[i] == '{' || buf[i] == '[') ? 1 : 0;
}


