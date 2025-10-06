#include "state.h"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int state_read(const char *path, buffer *out) {
    memset(out, 0, sizeof(*out));
    FILE *f = fopen(path, "rb");
    if (!f) return -1;
    if (fseek(f, 0, SEEK_END) != 0) { fclose(f); return -1; }
    long sz = ftell(f);
    if (sz < 0) { fclose(f); return -1; }
    if (fseek(f, 0, SEEK_SET) != 0) { fclose(f); return -1; }
    out->data = (char*)malloc((size_t)sz + 1);
    if (!out->data) { fclose(f); return -1; }
    size_t n = fread(out->data, 1, (size_t)sz, f);
    fclose(f);
    out->len = n;
    out->data[n] = '\0';
    return 0;
}

int state_write(const char *path, const char *data, size_t len) {
    // ensure dir exists: build/state
    (void)!system("mkdir -p build/state");
    FILE *f = fopen(path, "wb");
    if (!f) return -1;
    size_t n = fwrite(data, 1, len, f);
    fclose(f);
    return n == len ? 0 : -1;
}

void buffer_free(buffer *b) {
    if (!b) return;
    free(b->data);
    b->data = NULL;
    b->len = 0;
}


