use std::{net::SocketAddr, time::Duration};

use axum::{extract::{Path, State}, http::{HeaderMap, HeaderValue, Request, StatusCode, Uri}, response::IntoResponse, routing::{any, get, post, put}, Json, Router};
use axum::routing::{delete, put as put_route};
use axum::body::Body;
use http_body_util::BodyExt as _; // for collect
use hyper_util::client::legacy::Client as LegacyClient;
use hyper_util::rt::TokioExecutor;
use tower_http::{cors::{Any, CorsLayer}, services::ServeDir, trace::TraceLayer};
use tracing::{error, info};
use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm, Header};
use jsonwebtoken::{encode, EncodingKey};
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;
use tokio::net::UdpSocket;

#[derive(Clone)]
struct MiddlewareState {
    backend_rs: String,
    backend_c: String,
    client: LegacyClient<hyper_util::client::legacy::connect::HttpConnector, Body>,
    levels: Arc<Mutex<LevelsState>>, // coalesced 512 buffer
    jwt_secret: String,
    lock: Arc<Mutex<LockState>>, // remote lockout state
    outputs: Arc<Mutex<OutputsState>>, // network outputs
    limiter: Arc<Mutex<RateLimiter>>,   // simple rate limiter
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().with_env_filter("info").init();

    let backend_rs = std::env::var("BACKEND_RS").unwrap_or_else(|_| "http://127.0.0.1:8080".into());
    let backend_c = std::env::var("BACKEND_C").unwrap_or_else(|_| "http://127.0.0.1:8081".into());

    let client = LegacyClient::builder(TokioExecutor::new()).build_http();

    let levels = Arc::new(Mutex::new(LevelsState::new()));
    let jwt_secret = std::env::var("IONXE_JWT_SECRET").unwrap_or_else(|_| "dev-secret-change-me".into());
    let lock = Arc::new(Mutex::new(LockState::default()));
    let outputs = Arc::new(Mutex::new(OutputsState::new()));
    let limiter = Arc::new(Mutex::new(RateLimiter::new(100, Duration::from_secs(1)))); // 100 writes/sec per key
    let state = MiddlewareState { backend_rs: backend_rs.clone(), backend_c: backend_c.clone(), client: client.clone(), levels: levels.clone(), jwt_secret, lock, outputs: outputs.clone(), limiter };

    // spawn coalesced sender task (50ms)
    tokio::spawn(coalesced_sender(backend_c.clone(), client.clone(), levels.clone()));
    // spawn routing refresher and network output sender
    tokio::spawn(routing_refresher(backend_rs.clone(), client.clone(), outputs.clone()));
    tokio::spawn(network_output_sender(levels.clone(), outputs.clone()));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .max_age(Duration::from_secs(3600));

    let app = Router::new()
        .nest_service("/", ServeDir::new("services/frontend/public").append_index_html_on_directories(true))
        .route("/api/v1/recall_scene", post(recall_scene))
        // Coalesced levels endpoints
        .route("/api/v1/levels/changes", post(levels_changes))
        .route("/api/v1/levels", put(levels_put))
        // High-level controls
        .route("/api/v1/intensity", post(set_intensity))
        .route("/api/v1/color", post(set_color))
        // Admin lock control
        .route("/api/v1/admin/lock", post(admin_lock)).route("/api/v1/admin/unlock", post(admin_unlock)).route("/api/v1/admin/lock", get(lock_status))
        // User profiles
        .route("/api/v1/users/:username/profile", get(get_profile)).route("/api/v1/users/:username/profile", put(put_profile))
        .route("/api/v1/auth/login", post(auth_login))
        .route("/api/v1/auth/signup", post(auth_signup))
        // Admin proxy to backend users endpoints
        .route("/api/v1/admin/users", get(admin_users_list)).route("/api/v1/admin/users", post(admin_user_create))
        .route("/api/v1/admin/users/:username", delete(admin_user_delete))
        .route("/api/v1/admin/users/:username/profile", get(admin_profile_get)).route("/api/v1/admin/users/:username/profile", put_route(admin_profile_put))
        .fallback(proxy)
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let bind = std::env::var("IONXE_MIDDLEWARE_BIND").unwrap_or_else(|_| "127.0.0.1:8082".into());
    let addr: SocketAddr = bind.parse().unwrap();
    info!("middleware listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn proxy(State(st): State<MiddlewareState>, mut req: Request<Body>) -> impl IntoResponse {
    let path = req.uri().path().to_string();
    let is_c = path.starts_with("/api/v1/dimmers/") || path == "/api/v1/shell";
    let base = if is_c { &st.backend_c } else { &st.backend_rs };

    let new_uri: Uri = format!("{}{}{}", base, req.uri().path(), match req.uri().query() { Some(q) => format!("?{}", q), None => String::new() }).parse().unwrap();
    *req.uri_mut() = new_uri;

    match st.client.request(req).await {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();
            let body_bytes = resp.into_body().collect().await.map(|c| c.to_bytes()).unwrap_or_default();
            let mut builder = axum::http::Response::builder().status(status);
            for (k, v) in headers.iter() { builder = builder.header(k, v); }
            builder
                .header(axum::http::header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"))
                .body(Body::from(body_bytes))
                .unwrap()
        }
        Err(err) => {
            error!("proxy error: {}", err);
            (StatusCode::BAD_GATEWAY, "upstream error").into_response()
        }
    }
}

#[derive(Deserialize)]
struct RecallRequest { id: String, #[serde(default)] fade_ms: Option<u64> }

#[derive(Deserialize)]
struct Scene { id: String, label: String, levels: Vec<u8> }

async fn recall_scene(State(st): State<MiddlewareState>, Json(req): Json<RecallRequest>) -> impl IntoResponse {
    // Fetch scenes from Rust backend
    let scenes_uri: Uri = format!("{}/api/v1/scenes", st.backend_rs).parse().unwrap();
    let get = Request::builder().method("GET").uri(scenes_uri).body(Body::empty()).unwrap();
    let scenes = match st.client.request(get).await {
        Ok(resp) => {
            let body = resp.into_body().collect().await.map(|c| c.to_bytes()).unwrap_or_default();
            serde_json::from_slice::<Vec<Scene>>(&body).unwrap_or_default()
        }
        Err(_) => return StatusCode::BAD_GATEWAY,
    };
    let mut target = match scenes.into_iter().find(|s| s.id == req.id) {
        Some(s) => s.levels,
        None => return StatusCode::NOT_FOUND,
    };
    if target.len() != 512 { target.resize(512, 0); }

    let fade_ms = req.fade_ms.unwrap_or(0);
    if fade_ms == 0 {
        // Immediate push to C backend
        let uri: Uri = format!("{}/api/v1/dimmers/levels", st.backend_c).parse().unwrap();
        let put = Request::builder().method("PUT").uri(uri)
            .header(axum::http::header::CONTENT_TYPE, "application/octet-stream")
            .body(Body::from(target))
            .unwrap();
        match st.client.request(put).await { Ok(_) => StatusCode::NO_CONTENT, Err(_) => StatusCode::BAD_GATEWAY }
    } else {
        // Fetch current frame to start fade from
        let get_uri: Uri = format!("{}/api/v1/dimmers/frame", st.backend_c).parse().unwrap();
        let req0 = Request::builder().method("GET").uri(get_uri).body(Body::empty()).unwrap();
        let start = match st.client.request(req0).await {
            Ok(resp) => {
                let body = resp.into_body().collect().await.map(|c| c.to_bytes()).unwrap_or_default();
                let mut v = body.to_vec();
                if v.len() != 512 { v.resize(512, 0); }
                v
            }
            Err(_) => return StatusCode::BAD_GATEWAY,
        };
        let steps = std::cmp::max(1u64, (fade_ms + 49) / 50);
        for t in 1..=steps {
            let mut buf = vec![0u8; 512];
            for i in 0..512 {
                let a = start[i] as i32;
                let b = target[i] as i32;
                let v = a + ((b - a) as i64 * t as i64 / steps as i64) as i32;
                buf[i] = v.clamp(0, 255) as u8;
            }
            let uri: Uri = format!("{}/api/v1/dimmers/levels", st.backend_c).parse().unwrap();
            let put = Request::builder().method("PUT").uri(uri)
                .header(axum::http::header::CONTENT_TYPE, "application/octet-stream")
                .body(Body::from(buf))
                .unwrap();
            let _ = st.client.request(put).await;
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        StatusCode::NO_CONTENT
    }
}

// ------------ Load management: coalesced levels sender ------------

struct LevelsState { buf: [u8; 512], dirty: bool }
impl LevelsState { fn new() -> Self { Self { buf: [0; 512], dirty: false } } }

#[derive(Default)]
struct LockState { locked: bool }

// Outputs configuration/state (simplified): list of targets with kind and universe
#[derive(Clone, serde::Deserialize)]
struct OutputTargetCfg { kind: String, host: String, port: u16, universe: u16 }
struct OutputsState { seq: u8, targets: Vec<OutputTargetCfg> }
impl OutputsState {
    fn new() -> Self { Self { seq: 0, targets: vec![] } }
}

struct RateLimiter { max: u32, window: Duration, map: HashMap<String, (u32, std::time::Instant)> }
impl RateLimiter {
    fn new(max: u32, window: Duration) -> Self { Self { max, window, map: HashMap::new() } }
    fn allow(&mut self, key: &str) -> bool {
        let now = std::time::Instant::now();
        let entry = self.map.entry(key.to_string()).or_insert((0, now));
        if now.duration_since(entry.1) > self.window { entry.0 = 0; entry.1 = now; }
        if entry.0 >= self.max { return false; }
        entry.0 += 1; true
    }
}

async fn coalesced_sender(backend_c: String, client: LegacyClient<hyper_util::client::legacy::connect::HttpConnector, Body>, levels: Arc<Mutex<LevelsState>>) {
    let uri: Uri = format!("{}/api/v1/dimmers/levels", backend_c).parse().unwrap();
    let mut ticker = tokio::time::interval(Duration::from_millis(50));
    loop {
        ticker.tick().await;
        let maybe_payload = {
            let mut st = levels.lock().await;
            if st.dirty {
                st.dirty = false;
                Some(st.buf)
            } else { None }
        };
        if let Some(buf) = maybe_payload {
            let put = Request::builder().method("PUT").uri(uri.clone())
                .header(axum::http::header::CONTENT_TYPE, "application/octet-stream")
                .body(Body::from(Vec::from(buf)))
                .unwrap();
            let _ = client.request(put).await; // best-effort
        }
    }
}

#[derive(Deserialize)]
struct LevelChange { index: u16, value: u8 }
#[derive(Deserialize)]
struct LevelsChanges { changes: Vec<LevelChange> }
async fn levels_changes(State(st): State<MiddlewareState>, Json(body): Json<LevelsChanges>) -> impl IntoResponse {
    // lockout
    if st.lock.lock().await.locked { return StatusCode::LOCKED; }
    // rate limit by remote addr if available (fallback to 'anon')
    // Note: axum handler here lacks the extractor for IP; using a global key for now
    let mut lim = st.limiter.lock().await; if !lim.allow("levels_changes") { return StatusCode::TOO_MANY_REQUESTS; }
    let mut lv = st.levels.lock().await;
    for ch in body.changes.into_iter().take(1024) { // guard
        if (ch.index as usize) < lv.buf.len() { lv.buf[ch.index as usize] = ch.value; lv.dirty = true; }
    }
    StatusCode::NO_CONTENT
}

async fn levels_put(State(st): State<MiddlewareState>, body: axum::body::Bytes) -> impl IntoResponse {
    if st.lock.lock().await.locked { return StatusCode::LOCKED; }
    let mut lim = st.limiter.lock().await; if !lim.allow("levels_put") { return StatusCode::TOO_MANY_REQUESTS; }
    if body.len() != 512 { return StatusCode::BAD_REQUEST; }
    let mut lv = st.levels.lock().await;
    lv.buf.copy_from_slice(&body);
    lv.dirty = true;
    StatusCode::NO_CONTENT
}

#[derive(Deserialize)]
struct IntensityReq { channels: Vec<u16>, value: u8 }
async fn set_intensity(State(st): State<MiddlewareState>, Json(req): Json<IntensityReq>) -> impl IntoResponse {
    if st.lock.lock().await.locked { return StatusCode::LOCKED; }
    let mut lim = st.limiter.lock().await; if !lim.allow("set_intensity") { return StatusCode::TOO_MANY_REQUESTS; }
    let mut lv = st.levels.lock().await;
    for idx in req.channels.into_iter().take(2048) {
        if (idx as usize) < 512 { lv.buf[idx as usize] = req.value; lv.dirty = true; }
    }
    StatusCode::NO_CONTENT
}

#[derive(Deserialize)]
#[serde(tag = "model", rename_all = "lowercase")]
enum ColorModel { Rgb { rgb: [u8;3], bases: Vec<u16> } }
async fn set_color(State(st): State<MiddlewareState>, Json(model): Json<ColorModel>) -> impl IntoResponse {
    if st.lock.lock().await.locked { return StatusCode::LOCKED; }
    let mut lim = st.limiter.lock().await; if !lim.allow("set_color") { return StatusCode::TOO_MANY_REQUESTS; }
    let mut lv = st.levels.lock().await;
    match model {
        ColorModel::Rgb { rgb, bases } => {
            for base in bases.into_iter().take(1024) {
                let b = base as usize;
                if b + 2 < 512 {
                    lv.buf[b] = rgb[0]; lv.buf[b+1] = rgb[1]; lv.buf[b+2] = rgb[2]; lv.dirty = true;
                }
            }
        }
    }
    StatusCode::NO_CONTENT
}

// Admin lock/unlock (requires JWT with role=admin)
async fn admin_lock(State(st): State<MiddlewareState>, headers: HeaderMap) -> impl IntoResponse {
    if !is_admin(&st, &headers) { return StatusCode::UNAUTHORIZED; }
    st.lock.lock().await.locked = true; StatusCode::NO_CONTENT
}
async fn admin_unlock(State(st): State<MiddlewareState>, headers: HeaderMap) -> impl IntoResponse {
    if !is_admin(&st, &headers) { return StatusCode::UNAUTHORIZED; }
    st.lock.lock().await.locked = false; StatusCode::NO_CONTENT
}
async fn lock_status(State(st): State<MiddlewareState>) -> impl IntoResponse {
    let x = st.lock.lock().await.locked; Json(serde_json::json!({"locked": x}))
}

fn is_admin(st: &MiddlewareState, headers: &HeaderMap) -> bool {
    if std::env::var("IONXE_DEV_NOAUTH").ok().as_deref() == Some("1") { return true; }
    let Some(auth) = headers.get(axum::http::header::AUTHORIZATION) else { return false; };
    let Ok(auth_str) = auth.to_str() else { return false; };
    let token = auth_str.strip_prefix("Bearer ").unwrap_or("");
    if token.is_empty() { return false; }
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = false;
    if let Ok(data) = decode::<serde_json::Value>(token, &DecodingKey::from_secret(st.jwt_secret.as_bytes()), &validation) {
        return data.claims.get("role").and_then(|v| v.as_str()).unwrap_or("") == "admin";
    }
    false
}

// User profiles persisted alongside users
#[derive(Deserialize, serde::Serialize, Default)]
struct Profile { theme: Option<String>, layout: Option<String>, favorites: Option<Vec<String>> }
fn profile_path(username: &str) -> String {
    let root = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    format!("{}/profile_{}.json", root, username)
}
async fn get_profile(Path(username): Path<String>) -> impl IntoResponse {
    let p = profile_path(&username);
    match std::fs::read(&p).ok().and_then(|b| serde_json::from_slice::<Profile>(&b).ok()) {
        Some(pr) => Json(pr).into_response(),
        None => Json(Profile::default()).into_response(),
    }
}
async fn put_profile(Path(username): Path<String>, Json(pr): Json<Profile>) -> impl IntoResponse {
    let p = profile_path(&username);
    let _ = std::fs::create_dir_all(std::path::Path::new(&p).parent().unwrap());
    let _ = std::fs::write(p, serde_json::to_vec_pretty(&pr).unwrap());
    StatusCode::NO_CONTENT
}

// Admin proxy handlers
async fn admin_users_list(State(st): State<MiddlewareState>, headers: HeaderMap) -> impl IntoResponse {
    if !is_admin(&st, &headers) { return StatusCode::UNAUTHORIZED.into_response(); }
    let uri: Uri = format!("{}/api/v1/users", st.backend_rs).parse().unwrap();
    let req = Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap();
    match st.client.request(req).await { Ok(resp) => resp.into_response(), Err(_) => StatusCode::BAD_GATEWAY.into_response() }
}
async fn admin_user_create(State(st): State<MiddlewareState>, headers: HeaderMap, body: axum::body::Bytes) -> impl IntoResponse {
    if !is_admin(&st, &headers) { return StatusCode::UNAUTHORIZED.into_response(); }
    let uri: Uri = format!("{}/api/v1/users", st.backend_rs).parse().unwrap();
    let req = Request::builder().method("POST").uri(uri).header(axum::http::header::CONTENT_TYPE, "application/json").body(Body::from(body)).unwrap();
    match st.client.request(req).await { Ok(resp) => resp.into_response(), Err(_) => StatusCode::BAD_GATEWAY.into_response() }
}
async fn admin_user_delete(State(st): State<MiddlewareState>, headers: HeaderMap, Path(username): Path<String>) -> impl IntoResponse {
    if !is_admin(&st, &headers) { return StatusCode::UNAUTHORIZED.into_response(); }
    let uri: Uri = format!("{}/api/v1/users/{}", st.backend_rs, username).parse().unwrap();
    let req = Request::builder().method("DELETE").uri(uri).body(Body::empty()).unwrap();
    match st.client.request(req).await { Ok(resp) => resp.into_response(), Err(_) => StatusCode::BAD_GATEWAY.into_response() }
}
async fn admin_profile_get(State(st): State<MiddlewareState>, headers: HeaderMap, Path(username): Path<String>) -> impl IntoResponse {
    if !is_admin(&st, &headers) { return StatusCode::UNAUTHORIZED.into_response(); }
    let uri: Uri = format!("{}/api/v1/users/{}/profile", st.backend_rs, username).parse().unwrap();
    let req = Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap();
    match st.client.request(req).await { Ok(resp) => resp.into_response(), Err(_) => StatusCode::BAD_GATEWAY.into_response() }
}
async fn admin_profile_put(State(st): State<MiddlewareState>, headers: HeaderMap, Path(username): Path<String>, body: axum::body::Bytes) -> impl IntoResponse {
    if !is_admin(&st, &headers) { return StatusCode::UNAUTHORIZED.into_response(); }
    let uri: Uri = format!("{}/api/v1/users/{}/profile", st.backend_rs, username).parse().unwrap();
    let req = Request::builder().method("PUT").uri(uri).header(axum::http::header::CONTENT_TYPE, "application/json").body(Body::from(body)).unwrap();
    match st.client.request(req).await { Ok(resp) => resp.into_response(), Err(_) => StatusCode::BAD_GATEWAY.into_response() }
}

// ---------------- Auth middleware ----------------

#[derive(Debug, Clone)]
struct Claims { sub: String, exp: usize, role: Option<String> }

async fn auth_handler<B, F, Fut>(State(st): State<MiddlewareState>, headers: HeaderMap, body: B, handler: F) -> impl IntoResponse
where
    B: axum::extract::FromRequest<axum::body::Body> + Send + 'static,
    F: Fn(State<MiddlewareState>, B) -> Fut + Clone + Send + 'static,
    Fut: std::future::Future + Send,
    Fut::Output: IntoResponse,
{
    // Accept either Bearer token or dev mode if IONXE_DEV_NOAUTH=1
    if std::env::var("IONXE_DEV_NOAUTH").ok().as_deref() == Some("1") {
        return handler(State(st), body).await;
    }
    let Some(auth) = headers.get(axum::http::header::AUTHORIZATION) else { return StatusCode::UNAUTHORIZED.into_response(); };
    let Ok(auth_str) = auth.to_str() else { return StatusCode::UNAUTHORIZED.into_response(); };
    let token = auth_str.strip_prefix("Bearer ").unwrap_or("");
    if token.is_empty() { return StatusCode::UNAUTHORIZED.into_response(); }
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = false; // TODO: enable when clocks are aligned
    match decode::<serde_json::Value>(token, &DecodingKey::from_secret(st.jwt_secret.as_bytes()), &validation) {
        Ok(_data) => handler(State(st), body).await,
        Err(_) => StatusCode::UNAUTHORIZED.into_response(),
    }
}

fn auth<F, Fut, B>(handler: F) -> impl axum::handler::Handler<(State<MiddlewareState>, B), axum::Router>
where
    F: Fn(State<MiddlewareState>, B) -> Fut + Clone + Send + 'static,
    Fut: std::future::Future + Send,
    Fut::Output: IntoResponse,
    B: axum::extract::FromRequest<axum::body::Body> + Send + 'static,
{
    axum::routing::post(move |state: State<MiddlewareState>, body: B, headers: HeaderMap| async move {
        auth_handler(state, headers, body, handler).await
    })
}

// ---------------- Routing refresher and network outputs ----------------
#[derive(serde::Deserialize)]
struct RoutingConfigDto { outputs: Vec<OutputDto> }
#[derive(serde::Deserialize)]
struct OutputDto { id: String, #[serde(flatten)] kind: OutputKindDto }
#[derive(serde::Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum OutputKindDto { ArtNet { host: String, port: u16, universe: u16 }, SAcN { host: String, port: u16, universe: u16 } }

async fn routing_refresher(backend_rs: String, client: LegacyClient<hyper_util::client::legacy::connect::HttpConnector, Body>, outputs: Arc<Mutex<OutputsState>>) {
    let mut ticker = tokio::time::interval(Duration::from_secs(2));
    loop {
        ticker.tick().await;
        let uri: Uri = format!("{}/api/v1/routing", backend_rs).parse().unwrap();
        let req = Request::builder().method("GET").uri(uri).body(Body::empty()).unwrap();
        if let Ok(resp) = client.request(req).await {
            if let Ok(bytes) = resp.into_body().collect().await.map(|c| c.to_bytes()) {
                if let Ok(cfg) = serde_json::from_slice::<RoutingConfigDto>(&bytes) {
                    let mut st = outputs.lock().await;
                    st.targets.clear();
                    for o in cfg.outputs {
                        match o.kind {
                            OutputKindDto::ArtNet { host, port, universe } => st.targets.push(OutputTargetCfg { kind: "artnet".into(), host, port, universe }),
                            OutputKindDto::SAcN { host, port, universe } => st.targets.push(OutputTargetCfg { kind: "sacn".into(), host, port, universe }),
                        }
                    }
                }
            }
        }
    }
}

async fn network_output_sender(levels: Arc<Mutex<LevelsState>>, outputs: Arc<Mutex<OutputsState>>) {
    // Simple UDP socket bound to ephemeral port
    let sock = UdpSocket::bind("0.0.0.0:0").await.ok();
    let mut ticker = tokio::time::interval(Duration::from_millis(100));
    loop {
        ticker.tick().await;
        let (targets, seq, buf) = {
            let st = outputs.lock().await;
            let lv = levels.lock().await;
            (st.targets.clone(), st.seq, lv.buf)
        };
        for t in targets {
            match t.kind.as_str() {
                "artnet" => { if let Some(s) = &sock { let _ = s.send_to(&build_artdmx_packet(seq, t.universe, &buf), format!("{}:{}", t.host, t.port)).await; } }
                "sacn" => { if let Some(s) = &sock { let _ = s.send_to(&build_sacn_packet(seq, t.universe, &buf), format!("{}:{}", t.host, t.port)).await; } }
                _ => {}
            }
        }
        // increment sequence
        let mut st = outputs.lock().await; st.seq = st.seq.wrapping_add(1);
    }
}

fn build_artdmx_packet(seq: u8, universe: u16, data: &[u8;512]) -> Vec<u8> {
    let mut p = Vec::with_capacity(18 + 512);
    p.extend_from_slice(b"Art-Net\0");
    p.extend_from_slice(&[0x00, 0x50]); // OpCode ArtDMX (Little Endian)
    p.extend_from_slice(&[0x00, 0x0e]); // ProtVer
    p.push(seq);
    p.push(0); // physical
    p.extend_from_slice(&(universe as u16).to_le_bytes());
    p.extend_from_slice(&(512u16).to_be_bytes());
    p.extend_from_slice(data);
    p
}

fn build_sacn_packet(seq: u8, universe: u16, data: &[u8;512]) -> Vec<u8> {
    // Minimal E1.31 single packet with static CID and source name
    let cid = [1u8; 16];
    let src = b"IonXE";
    let mut p = Vec::new();
    // Root Layer Preamble (ACN)
    p.extend_from_slice(&[0x00, 0x10, 0x00, 0x00]);
    p.extend_from_slice(b"ASC-E1.17\0\0\0");
    let root_flags_len = 0x7000 | (0x16 + 0x38 + 0x02 + 512) as u16; // rough length
    p.extend_from_slice(&root_flags_len.to_be_bytes());
    p.extend_from_slice(&[0x00, 0x00, 0x00, 0x04]); // Vector Root E1.31 Data Packet
    p.extend_from_slice(&cid);
    // Framing Layer
    let framing_flags_len = 0x7000 | (0x38 + 0x02 + 512) as u16;
    p.extend_from_slice(&framing_flags_len.to_be_bytes());
    p.extend_from_slice(&[0x00, 0x00, 0x00, 0x02]); // Vector E1.31 Data Packet
    let mut srcname = [0u8; 64]; srcname[..src.len()].copy_from_slice(src);
    p.extend_from_slice(&srcname);
    p.push(100); // priority
    p.push(seq);
    p.extend_from_slice(&[0x00]); // options
    p.extend_from_slice(&universe.to_be_bytes());
    // DMP Layer
    let dmp_flags_len = 0x7000 | (0x02 + 0x01 + 0x01 + 0x02 + 512) as u16;
    p.extend_from_slice(&dmp_flags_len.to_be_bytes());
    p.push(0x02); // DMP Set Property
    p.push(0xa1); // address type & data type
    p.extend_from_slice(&[0x00, 0x00]); // first property address
    p.extend_from_slice(&[0x00, 0x01]); // address increment
    p.extend_from_slice(&(1 + 512 as u16).to_be_bytes());
    p.push(0); // start code
    p.extend_from_slice(data);
    p
}

// ---------------- Users store and auth endpoints ----------------

#[derive(Deserialize, serde::Serialize, Clone)]
struct User { username: String, hash: String, role: String }

fn users_path() -> String {
    let root = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    format!("{}/users.json", root)
}
fn load_users() -> Vec<User> {
    let p = users_path();
    std::fs::read(&p).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}
fn save_users(list: &[User]) {
    let p = users_path(); let _ = std::fs::create_dir_all(std::path::Path::new(&p).parent().unwrap()); let _ = std::fs::write(p, serde_json::to_vec_pretty(list).unwrap());
}

#[derive(Deserialize)]
struct LoginReq { username: String, password: String }
#[derive(serde::Serialize)]
struct LoginResp { token: String }

async fn auth_login(State(st): State<MiddlewareState>, Json(req): Json<LoginReq>) -> impl IntoResponse {
    let users = load_users();
    if let Some(u) = users.into_iter().find(|u| u.username == req.username) {
        if bcrypt::verify(&req.password, &u.hash).unwrap_or(false) {
            let claims = serde_json::json!({ "sub": u.username, "role": u.role, "exp": 0 });
            let token = encode(&Header::new(Algorithm::HS256), &claims, &EncodingKey::from_secret(st.jwt_secret.as_bytes())).unwrap_or_default();
            return Json(LoginResp { token }).into_response();
        }
    }
    StatusCode::UNAUTHORIZED.into_response()
}

#[derive(Deserialize)]
struct SignupReq { username: String, password: String, role: Option<String> }

async fn auth_signup(Json(req): Json<SignupReq>) -> impl IntoResponse {
    let mut users = load_users();
    if users.iter().any(|u| u.username == req.username) { return StatusCode::CONFLICT; }
    let hash = bcrypt::hash(req.password, bcrypt::DEFAULT_COST).unwrap_or_default();
    users.push(User { username: req.username, hash, role: req.role.unwrap_or_else(|| "operator".into()) });
    save_users(&users);
    StatusCode::CREATED
}


