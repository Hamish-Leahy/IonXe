#include "http.h"
#include "json.h"
#include "state.h"
#include "dimmer.h"

#include <stdio.h>
#include <string.h>

static void respond_json(http_response *res, int status, const char *json) {
    res->status = status;
    res->content_type = "application/json";
    res->body = json;
    res->body_len = strlen(json);
}

static void respond_json_len(http_response *res, int status, size_t v) {
    static char buf[64];
    int n = snprintf(buf, sizeof(buf), "{\"len\":%zu}", v);
    if (n < 0) n = 0; if (n > (int)sizeof(buf)) n = (int)sizeof(buf);
    res->status = status;
    res->content_type = "application/json";
    res->body = buf;
    res->body_len = (size_t)n;
}

static void handle_health(const http_request *req, http_response *res) {
    (void)req;
    respond_json(res, 200, "{\"ok\":true}");
}

static void handle_get_file(const char *path, const char *fallback, http_response *res) {
    buffer b;
    if (state_read(path, &b) == 0 && b.len > 0) {
        res->status = 200;
        res->content_type = "application/json";
        res->body = b.data; // note: memory leaks avoided by not freeing before send; short-lived process per request
        res->body_len = b.len;
        return;
    }
    respond_json(res, 200, fallback);
}

static void handle_put_file(const http_request *req, const char *path, http_response *res) {
    if (!json_looks_like_object(req->body, req->body_len)) {
        respond_json(res, 400, "{\"error\":\"invalid json\"}");
        return;
    }
    if (state_write(path, req->body, req->body_len) != 0) {
        respond_json(res, 500, "{\"error\":\"persist failed\"}");
        return;
    }
    res->status = 204;
    res->content_type = "application/json";
    res->body = "";
    res->body_len = 0;
}

static void get_patch(const http_request *req, http_response *res) {
    (void)req;
    handle_get_file("build/state/patch.json", "{\"universes\":[],\"fixtures\":[],\"channel_map\":[]}", res);
}

static void put_patch(const http_request *req, http_response *res) {
    handle_put_file(req, "build/state/patch.json", res);
}

static void get_routing(const http_request *req, http_response *res) {
    (void)req;
    handle_get_file("build/state/routing.json", "{\"outputs\":[]}", res);
}

static void put_routing(const http_request *req, http_response *res) {
    handle_put_file(req, "build/state/routing.json", res);
}

static void get_dimmer_racks(const http_request *req, http_response *res) {
    (void)req;
    handle_get_file("build/state/dimmer_racks.json", "{\"racks\":[]}", res);
}

static void put_dimmer_racks(const http_request *req, http_response *res) {
    handle_put_file(req, "build/state/dimmer_racks.json", res);
}

static void get_dimmer_config(const http_request *req, http_response *res) {
    (void)req;
    handle_get_file("build/state/dimmer_config.json", "{\"profiles\":[]}", res);
}

static void put_dimmer_config(const http_request *req, http_response *res) {
    handle_put_file(req, "build/state/dimmer_config.json", res);
}

static void put_dimmer_levels(const http_request *req, http_response *res) {
    if (req->body_len != DMX_SLOTS) {
        respond_json_len(res, 400, req->body_len);
        return;
    }
    if (dimmer_set_levels((const uint8_t*)req->body, req->body_len) != 0) {
        respond_json(res, 400, "{\"error\":\"invalid levels\"}");
        return;
    }
    res->status = 204; res->content_type = "application/octet-stream"; res->body = ""; res->body_len = 0;
}

static void put_dimmer_lut(const http_request *req, http_response *res) {
    if (dimmer_set_lut((const uint8_t*)req->body, req->body_len) != 0) {
        respond_json(res, 400, "{\"error\":\"lut size must be 256\"}");
        return;
    }
    res->status = 204; res->content_type = "application/octet-stream"; res->body = ""; res->body_len = 0;
}

static void get_dimmer_frame(const http_request *req, http_response *res) {
    (void)req;
    size_t n = 0; const uint8_t *frame = dimmer_get_frame(&n);
    res->status = 200; res->content_type = "application/octet-stream"; res->body = (const char*)frame; res->body_len = n;
}

int main(void) {
    const char *bind = getenv("IONXE_BACKEND_C_BIND");
    if (!bind || !*bind) bind = "127.0.0.1:8081";
    char host[64]; int port = 0;
    strncpy(host, "127.0.0.1", sizeof(host)); host[sizeof(host)-1] = '\0';
    const char *colon = strchr(bind, ':');
    if (colon) {
        size_t hlen = (size_t)(colon - bind);
        if (hlen >= sizeof(host)) hlen = sizeof(host)-1;
        memcpy(host, bind, hlen); host[hlen] = '\0';
        port = atoi(colon + 1);
    } else {
        strncpy(host, bind, sizeof(host)); host[sizeof(host)-1] = '\0';
        port = 8081;
    }
    dimmer_init();
    http_register("GET", "/health", handle_health);
    http_register("GET", "/api/v1/patch", get_patch);
    http_register("PUT", "/api/v1/patch", put_patch);
    http_register("GET", "/api/v1/routing", get_routing);
    http_register("PUT", "/api/v1/routing", put_routing);
    http_register("GET", "/api/v1/dimmers/racks", get_dimmer_racks);
    http_register("PUT", "/api/v1/dimmers/racks", put_dimmer_racks);
    http_register("GET", "/api/v1/dimmers/config", get_dimmer_config);
    http_register("PUT", "/api/v1/dimmers/config", put_dimmer_config);

    // Binary endpoints for dimmer engine
    // PUT /api/v1/dimmers/levels  (raw 512 bytes)
    // PUT /api/v1/dimmers/lut     (raw 256 bytes)
    // GET /api/v1/dimmers/frame   (raw 512 bytes)
    http_register("PUT", "/api/v1/dimmers/levels", put_dimmer_levels);
    http_register("PUT", "/api/v1/dimmers/lut", put_dimmer_lut);
    http_register("GET", "/api/v1/dimmers/frame", get_dimmer_frame);

    return http_serve(host, port);
}


