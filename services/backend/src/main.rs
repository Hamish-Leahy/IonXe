use std::net::SocketAddr;

use axum::{extract::State, http::StatusCode, routing::{get, post, put}, Json, Router};
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use tracing::{info, Level};
use uuid::Uuid;

static APP_STATE: Lazy<RwLock<AppState>> = Lazy::new(|| RwLock::new(AppState::default()));

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
struct AppState {
    version: String,
    patch: PatchState,
    routing: RoutingConfig,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
struct PatchState {
    universes: Vec<Universe>,
    fixtures: Vec<Fixture>,
    channel_map: Vec<ChannelMapEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Universe {
    id: Uuid,
    universe: u16,
    label: String,
}

impl Default for Universe {
    fn default() -> Self { Self { id: Uuid::new_v4(), universe: 1, label: String::new() } }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct Fixture {
    id: Uuid,
    label: String,
    footprint: u8,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct ChannelMapEntry {
    channel: u32,
    universe: u16,
    address: u16,
    fixture_id: Option<Uuid>,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
struct RoutingConfig {
    outputs: Vec<OutputTarget>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct OutputTarget {
    id: Uuid,
    kind: OutputKind,
    label: String,
    universe: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
enum OutputKind {
    ArtNet { host: String, port: u16 },
    SAcN { host: String, port: u16 },
}

impl Default for OutputKind { fn default() -> Self { OutputKind::SAcN { host: "127.0.0.1".into(), port: 5568 } } }

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().with_env_filter("info").init();

    // Initialize version and load state if present
    {
        let mut st = APP_STATE.write();
        st.version = env!("CARGO_PKG_VERSION").to_string();
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

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/patch", get(get_patch).put(put_patch))
        .route("/api/v1/patch/universes", post(add_universe))
        .route("/api/v1/patch/fixtures", post(add_fixture))
        .route("/api/v1/patch/channel_map", post(add_channel_map))
        .route("/api/v1/routing", get(get_routing).put(put_routing))
        .with_state(());

    let addr: SocketAddr = "127.0.0.1:8080".parse().unwrap();
    info!("listening on {}", addr);
    axum::Server::bind(&addr).serve(app.into_make_service()).await?;
    Ok(())
}

async fn health() -> Json<serde_json::Value> {
    let st = APP_STATE.read();
    Json(serde_json::json!({
        "ok": true,
        "version": st.version,
        "time": OffsetDateTime::now_utc().to_string(),
    }))
}

async fn get_patch() -> Json<PatchState> { Json(APP_STATE.read().patch.clone()) }

async fn put_patch(Json(new_patch): Json<PatchState>) -> StatusCode {
    {
        let mut st = APP_STATE.write();
        st.patch = new_patch;
    }
    persist_patch();
    StatusCode::NO_CONTENT
}

async fn add_universe(Json(mut uni): Json<Universe>) -> Json<Universe> {
    if uni.id == Uuid::nil() { uni.id = Uuid::new_v4(); }
    let mut st = APP_STATE.write();
    st.patch.universes.push(uni.clone());
    persist_patch();
    Json(uni)
}

async fn add_fixture(Json(mut f): Json<Fixture>) -> Json<Fixture> {
    if f.id == Uuid::nil() { f.id = Uuid::new_v4(); }
    let mut st = APP_STATE.write();
    st.patch.fixtures.push(f.clone());
    persist_patch();
    Json(f)
}

async fn add_channel_map(Json(entry): Json<ChannelMapEntry>) -> Json<ChannelMapEntry> {
    let mut st = APP_STATE.write();
    st.patch.channel_map.push(entry.clone());
    persist_patch();
    Json(entry)
}

async fn get_routing() -> Json<RoutingConfig> { Json(APP_STATE.read().routing.clone()) }

async fn put_routing(Json(new_routing): Json<RoutingConfig>) -> StatusCode {
    {
        let mut st = APP_STATE.write();
        st.routing = new_routing;
    }
    persist_routing();
    StatusCode::NO_CONTENT
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


