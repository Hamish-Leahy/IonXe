#ifndef IONXE_HTTP_H
#define IONXE_HTTP_H

#include <stddef.h>

typedef struct {
    const char *method;
    const char *path;
    const char *body;
    size_t body_len;
} http_request;

typedef struct {
    int status;
    const char *content_type;
    const char *body;
    size_t body_len;
} http_response;

typedef void (*route_handler)(const http_request *req, http_response *res);

int http_serve(const char *addr, int port);
void http_register(const char *method, const char *path, route_handler handler);

#endif // IONXE_HTTP_H


