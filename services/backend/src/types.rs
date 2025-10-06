use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct AppState {
    pub version: String,
    pub patch: PatchState,
    pub routing: RoutingConfig,
    pub scenes: Vec<Scene>,
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

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Scene {
    pub id: Uuid,
    pub label: String,
    pub levels: Vec<u8>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct User { pub username: String, pub hash: String, pub role: String }

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Profile { pub theme: Option<String>, pub layout: Option<String>, pub favorites: Option<Vec<String>> }


