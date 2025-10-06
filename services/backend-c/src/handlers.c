#include "handlers.h"
#include "http.h"
#include "json.h"
#include "state.h"
#include "dimmer.h"

#include <stdio.h>
#include <string.h>
#include <stdlib.h>

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

static void build_state_path(char *out, size_t out_len, const char *file) {
    const char *dir = getenv("IONXE_STATE_DIR");
    if (!dir || !*dir) dir = "build/state";
    size_t dlen = strlen(dir);
    if (dlen > 0 && dir[dlen - 1] == '/') {
        snprintf(out, out_len, "%s%s", dir, file);
    } else {
        snprintf(out, out_len, "%s/%s", dir, file);
    }
}

static void handle_health(const http_request *req, http_response *res) {
    (void)req;
    respond_json(res, 200, "{\"ok\":true}");
}

static void handle_get_state_file(const char *filename, const char *fallback, http_response *res) {
    buffer b;
    char path[512];
    build_state_path(path, sizeof(path), filename);
    if (state_read(path, &b) == 0 && b.len > 0) {
        res->status = 200;
        res->content_type = "application/json";
        res->body = b.data;
        res->body_len = b.len;
        return;
    }
    respond_json(res, 200, fallback);
}

static void handle_put_state_file(const http_request *req, const char *filename, http_response *res) {
    if (!json_looks_like_object(req->body, req->body_len)) {
        respond_json(res, 400, "{\"error\":\"invalid json\"}");
        return;
    }
    char path[512];
    build_state_path(path, sizeof(path), filename);
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
    handle_get_state_file("patch.json", "{\"universes\":[],\"fixtures\":[],\"channel_map\":[]}", res);
}

static void put_patch(const http_request *req, http_response *res) {
    handle_put_state_file(req, "patch.json", res);
}

static void get_routing(const http_request *req, http_response *res) {
    (void)req;
    handle_get_state_file("routing.json", "{\"outputs\":[]}", res);
}

static void put_routing(const http_request *req, http_response *res) {
    handle_put_state_file(req, "routing.json", res);
}

static void get_dimmer_racks(const http_request *req, http_response *res) {
    (void)req;
    handle_get_state_file("dimmer_racks.json", "{\"racks\":[]}", res);
}

static void put_dimmer_racks(const http_request *req, http_response *res) {
    handle_put_state_file(req, "dimmer_racks.json", res);
}

static void get_dimmer_config(const http_request *req, http_response *res) {
    (void)req;
    handle_get_state_file("dimmer_config.json", "{\"profiles\":[]}", res);
}

static void put_dimmer_config(const http_request *req, http_response *res) {
    handle_put_state_file(req, "dimmer_config.json", res);
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

static void post_shell(const http_request *req, http_response *res) {
    // Very basic shell: echoes input length; later, dispatch commands
    // Commands: LEVELS_GET, LEVELS_SET idx value
    if (!req->body || req->body_len == 0) { respond_json(res, 400, "{\"error\":\"empty\"}"); return; }
    if (req->body_len >= 10 && strncmp(req->body, "LEVELS_GET", 10) == 0) {
        size_t n = 0; const uint8_t *frame = dimmer_get_frame(&n);
        res->status = 200; res->content_type = "application/octet-stream"; res->body = (const char*)frame; res->body_len = n; return;
    }
    if (req->body_len >= 10 && strncmp(req->body, "LEVELS_SET", 10) == 0) {
        // parse: LEVELS_SET <idx> <value>\n
        unsigned idx = 0, val = 0;
        if (sscanf(req->body + 10, "%u %u", &idx, &val) == 2) {
            if (idx < DMX_SLOTS && val < 256) {
                uint8_t buf[DMX_SLOTS];
                if (dimmer_get_levels(buf, DMX_SLOTS) == 0) { buf[idx] = (uint8_t)val; dimmer_set_levels(buf, DMX_SLOTS); }
                respond_json(res, 200, "{\"ok\":true}"); return;
            }
        }
        respond_json(res, 400, "{\"error\":\"bad args\"}"); return;
    }
    respond_json_len(res, 200, req->body_len);
}

void register_handlers(void) {
    http_register("GET", "/health", handle_health);
    http_register("GET", "/api/v1/patch", get_patch);
    http_register("PUT", "/api/v1/patch", put_patch);
    http_register("GET", "/api/v1/routing", get_routing);
    http_register("PUT", "/api/v1/routing", put_routing);
    http_register("GET", "/api/v1/dimmers/racks", get_dimmer_racks);
    http_register("PUT", "/api/v1/dimmers/racks", put_dimmer_racks);
    http_register("GET", "/api/v1/dimmers/config", get_dimmer_config);
    http_register("PUT", "/api/v1/dimmers/config", put_dimmer_config);
    http_register("GET", "/api/v1/dimmers/health", handle_health);
    http_register("PUT", "/api/v1/dimmers/levels", put_dimmer_levels);
    http_register("PUT", "/api/v1/dimmers/lut", put_dimmer_lut);
    http_register("GET", "/api/v1/dimmers/frame", get_dimmer_frame);
    http_register("POST", "/api/v1/shell", post_shell);
    // GM endpoint
    http_register("PUT", "/api/v1/dimmers/gm", [](const http_request *req, http_response *res){
        if (!req->body || req->body_len == 0) { respond_json(res, 400, "{\"error\":\"empty\"}"); return; }
        unsigned v = 0; if (sscanf(req->body, "%u", &v) == 1 && v < 256) { dimmer_set_grand_master((uint8_t)v); respond_json(res, 204, ""); return; }
        respond_json(res, 400, "{\"error\":\"bad value\"}");
    });
}


