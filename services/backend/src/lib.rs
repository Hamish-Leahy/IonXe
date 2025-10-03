use axum::{routing::{get, post, put}, Json, Router};
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use tower_http::{cors::{Any, CorsLayer}, trace::TraceLayer};
use uuid::Uuid;

pub static APP_STATE: Lazy<RwLock<AppState>> = Lazy::new(|| RwLock::new(AppState::default()));

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct AppState {
    pub version: String,
    pub patch: PatchState,
    pub routing: RoutingConfig,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct PatchState {
    pub universes: Vec<Universe>,
    pub fixtures: Vec<Fixture>,
    pub channel_map: Vec<ChannelMapEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Universe {
    pub id: Uuid,
    pub universe: u16,
    pub label: String,
}

impl Default for Universe {
    fn default() -> Self { Self { id: Uuid::new_v4(), universe: 1, label: String::new() } }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Fixture {
    pub id: Uuid,
    pub label: String,
    pub footprint: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ChannelMapEntry {
    pub channel: u32,
    pub universe: u16,
    pub address: u16,
    pub fixture_id: Option<Uuid>,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct RoutingConfig {
    pub outputs: Vec<OutputTarget>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct OutputTarget {
    pub id: Uuid,
    pub kind: OutputKind,
    pub label: String,
    pub universe: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum OutputKind {
    ArtNet { host: String, port: u16 },
    SAcN { host: String, port: u16 },
}

impl Default for OutputKind { fn default() -> Self { OutputKind::SAcN { host: "127.0.0.1".into(), port: 5568 } } }

pub fn init_state_from_disk(version: &str) {
    let mut st = APP_STATE.write();
    st.version = version.to_string();
    if let Ok(bytes) = std::fs::read("build/state/patch.json") {
        if let Ok(saved) = serde_json::from_slice::<PatchState>(&bytes) {
            st.patch = saved;
        }
    }
    if let Ok(bytes) = std::fs::read("build/state/routing.json") {
        if let Ok(saved) = serde_json::from_slice::<RoutingConfig>(&bytes) {
            st.routing = saved;
        }
    }
}

pub fn build_router() -> Router {
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);
    Router::new()
        .route("/health", get(health))
        .route("/api/v1/patch", get(get_patch).put(put_patch))
        .route("/api/v1/patch/universes", post(add_universe))
        .route("/api/v1/patch/fixtures", post(add_fixture))
        .route("/api/v1/patch/channel_map", post(add_channel_map))
        .route("/api/v1/routing", get(get_routing).put(put_routing))
        .with_state(())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

pub async fn health() -> Json<serde_json::Value> {
    let st = APP_STATE.read();
    Json(serde_json::json!({
        "ok": true,
        "version": st.version,
        "time": OffsetDateTime::now_utc().to_string(),
    }))
}

pub async fn get_patch() -> Json<PatchState> { Json(APP_STATE.read().patch.clone()) }

pub async fn put_patch(Json(new_patch): Json<PatchState>) -> axum::http::StatusCode {
    {
        let mut st = APP_STATE.write();
        st.patch = new_patch;
    }
    persist_patch();
    axum::http::StatusCode::NO_CONTENT
}

pub async fn add_universe(Json(mut uni): Json<Universe>) -> Json<Universe> {
    if uni.id == Uuid::nil() { uni.id = Uuid::new_v4(); }
    let mut st = APP_STATE.write();
    st.patch.universes.push(uni.clone());
    persist_patch();
    Json(uni)
}

pub async fn add_fixture(Json(mut f): Json<Fixture>) -> Json<Fixture> {
    if f.id == Uuid::nil() { f.id = Uuid::new_v4(); }
    let mut st = APP_STATE.write();
    st.patch.fixtures.push(f.clone());
    persist_patch();
    Json(f)
}

pub async fn add_channel_map(Json(entry): Json<ChannelMapEntry>) -> Json<ChannelMapEntry> {
    let mut st = APP_STATE.write();
    st.patch.channel_map.push(entry.clone());
    persist_patch();
    Json(entry)
}

pub async fn get_routing() -> Json<RoutingConfig> { Json(APP_STATE.read().routing.clone()) }

pub async fn put_routing(Json(new_routing): Json<RoutingConfig>) -> axum::http::StatusCode {
    {
        let mut st = APP_STATE.write();
        st.routing = new_routing;
    }
    persist_routing();
    axum::http::StatusCode::NO_CONTENT
}

fn persist_patch() {
    let st = APP_STATE.read();
    let _ = std::fs::create_dir_all("build/state");
    let _ = std::fs::write("build/state/patch.json", serde_json::to_vec_pretty(&st.patch).unwrap());
}

fn persist_routing() {
    let st = APP_STATE.read();
    let _ = std::fs::create_dir_all("build/state");
    let _ = std::fs::write("build/state/routing.json", serde_json::to_vec_pretty(&st.routing).unwrap());
}


