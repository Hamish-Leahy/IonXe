#include "http.h"

#include <arpa/inet.h>
#include <errno.h>
#include <netinet/in.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

typedef struct route_entry {
    const char *method;
    const char *path;
    route_handler handler;
    struct route_entry *next;
} route_entry;

static route_entry *routes_head = NULL;

static void add_header(char *dst, size_t dst_size, const char *name, const char *value) {
    strncat(dst, name, dst_size - strlen(dst) - 1);
    strncat(dst, ": ", dst_size - strlen(dst) - 1);
    strncat(dst, value, dst_size - strlen(dst) - 1);
    strncat(dst, "\r\n", dst_size - strlen(dst) - 1);
}

void http_register(const char *method, const char *path, route_handler handler) {
    route_entry *e = (route_entry*)calloc(1, sizeof(route_entry));
    e->method = method;
    e->path = path;
    e->handler = handler;
    e->next = routes_head;
    routes_head = e;
}

static void default_not_found(const http_request *req, http_response *res) {
    (void)req;
    const char *msg = "{\"error\":\"not found\"}";
    res->status = 404;
    res->content_type = "application/json";
    res->body = msg;
    res->body_len = strlen(msg);
}

static void parse_request(const char *buf, ssize_t len, http_request *req) {
    // Very naive parser sufficient for simple JSON endpoints
    req->method = "";
    req->path = "/";
    req->body = NULL;
    req->body_len = 0;

    const char *sp1 = memchr(buf, ' ', len);
    if (!sp1) return;
    size_t method_len = (size_t)(sp1 - buf);
    static char method_storage[8];
    memset(method_storage, 0, sizeof(method_storage));
    if (method_len >= sizeof(method_storage)) method_len = sizeof(method_storage) - 1;
    memcpy(method_storage, buf, method_len);
    req->method = method_storage;

    const char *sp2 = memchr(sp1 + 1, ' ', (size_t)(buf + len - sp1 - 1));
    if (!sp2) return;
    size_t path_len = (size_t)(sp2 - (sp1 + 1));
    static char path_storage[512];
    memset(path_storage, 0, sizeof(path_storage));
    if (path_len >= sizeof(path_storage)) path_len = sizeof(path_storage) - 1;
    memcpy(path_storage, sp1 + 1, path_len);
    req->path = path_storage;

    const char *cl_hdr = strcasestr(buf, "Content-Length:");
    size_t content_len = 0;
    if (cl_hdr) {
        content_len = (size_t)strtoul(cl_hdr + strlen("Content-Length:"), NULL, 10);
    }
    const char *body = strstr(buf, "\r\n\r\n");
    if (body) {
        body += 4;
        size_t remaining = (size_t)(buf + len - body);
        if (content_len > 0 && content_len <= remaining) {
            req->body = body;
            req->body_len = content_len;
        } else if (remaining > 0) {
            req->body = body;
            req->body_len = remaining;
        }
    }
}

static route_entry* find_route(const char *method, const char *path) {
    for (route_entry *e = routes_head; e; e = e->next) {
        if (strcasecmp(e->method, method) == 0 && strcmp(e->path, path) == 0) return e;
    }
    return NULL;
}

static void serve_client(int client_fd) {
    size_t cap = 16384;
    size_t len = 0;
    char *buf = (char*)malloc(cap);
    if (!buf) { close(client_fd); return; }

    // Read until we have full headers (\r\n\r\n)
    const char *hdr_end = NULL;
    while (1) {
        if (len == cap) { cap *= 2; char *nb = (char*)realloc(buf, cap); if (!nb) { free(buf); close(client_fd); return; } buf = nb; }
        ssize_t n = recv(client_fd, buf + len, (int)(cap - len), 0);
        if (n <= 0) { free(buf); close(client_fd); return; }
        len += (size_t)n;
        buf[len] = '\0';
        hdr_end = strstr(buf, "\r\n\r\n");
        if (hdr_end) break;
        if (len > 1024 * 1024) { free(buf); close(client_fd); return; } // header too large
    }

    http_request req;
    parse_request(buf, (ssize_t)len, &req);

    // If there is a Content-Length greater than the bytes we've got, keep reading body
    const char *cl_hdr = strcasestr(buf, "Content-Length:");
    size_t content_len = 0;
    if (cl_hdr) content_len = (size_t)strtoul(cl_hdr + strlen("Content-Length:"), NULL, 10);
    size_t have_body = 0;
    if (hdr_end) {
        const char *body = hdr_end + 4;
        have_body = (size_t)(buf + len - body);
    }
    while (content_len > 0 && have_body < content_len) {
        if (len == cap) { cap *= 2; char *nb = (char*)realloc(buf, cap); if (!nb) { free(buf); close(client_fd); return; } buf = nb; }
        ssize_t n = recv(client_fd, buf + len, (int)(cap - len), 0);
        if (n <= 0) break;
        len += (size_t)n;
        buf[len] = '\0';
        hdr_end = strstr(buf, "\r\n\r\n");
        const char *body = hdr_end ? hdr_end + 4 : NULL;
        have_body = body ? (size_t)(buf + len - body) : 0;
    }

    // Re-parse now that we likely have full body
    parse_request(buf, (ssize_t)len, &req);

    http_response res = {200, "application/json", "{}", 2};

    // Handle CORS preflight for any path
    if (req.method && strcasecmp(req.method, "OPTIONS") == 0) {
        res.status = 204; res.content_type = "text/plain"; res.body = ""; res.body_len = 0;
    } else {
        route_entry *route = find_route(req.method, req.path);
        if (route && route->handler) {
            route->handler(&req, &res);
        } else {
            default_not_found(&req, &res);
        }
    }

    char header[1024];
    memset(header, 0, sizeof(header));
    snprintf(header, sizeof(header), "HTTP/1.1 %d\r\n", res.status);
    add_header(header, sizeof(header), "Content-Type", res.content_type ? res.content_type : "application/octet-stream");
    char clen[64];
    snprintf(clen, sizeof(clen), "%zu", res.body_len);
    add_header(header, sizeof(header), "Content-Length", clen);
    add_header(header, sizeof(header), "Access-Control-Allow-Origin", "*");
    add_header(header, sizeof(header), "Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS");
    add_header(header, sizeof(header), "Access-Control-Allow-Headers", "Content-Type");
    strncat(header, "\r\n", sizeof(header) - strlen(header) - 1);

    send(client_fd, header, strlen(header), 0);
    if (res.body && res.body_len > 0) {
        send(client_fd, res.body, res.body_len, 0);
    }
    free(buf);
    close(client_fd);
}

int http_serve(const char *addr, int port) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) { perror("socket"); return 1; }
    int opt = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    struct sockaddr_in sa;
    memset(&sa, 0, sizeof(sa));
    sa.sin_family = AF_INET;
    sa.sin_port = htons((uint16_t)port);
    sa.sin_addr.s_addr = inet_addr(addr);
    if (bind(fd, (struct sockaddr*)&sa, sizeof(sa)) != 0) { perror("bind"); close(fd); return 1; }
    if (listen(fd, 128) != 0) { perror("listen"); close(fd); return 1; }
    fprintf(stderr, "listening on %s:%d\n", addr, port);

    while (true) {
        int cfd = accept(fd, NULL, NULL);
        if (cfd < 0) { if (errno == EINTR) continue; perror("accept"); break; }
        serve_client(cfd);
    }

    close(fd);
    return 0;
}


