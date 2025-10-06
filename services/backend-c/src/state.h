#ifndef IONXE_STATE_H
#define IONXE_STATE_H

#include <stddef.h>

typedef struct {
    char *data;
    size_t len;
} buffer;

int state_read(const char *path, buffer *out);
int state_write(const char *path, const char *data, size_t len);
void buffer_free(buffer *b);

#endif // IONXE_STATE_H


