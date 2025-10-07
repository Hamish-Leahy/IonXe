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

// Fader and Control Types
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct FaderBank {
    pub id: Uuid,
    pub label: String,
    pub channels: Vec<u16>,
    pub page: u16,
    pub bank: u16,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct FaderConfig {
    pub banks: Vec<FaderBank>,
    pub current_page: u16,
    pub current_bank: u16,
    pub bank_mode: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ButtonConfig {
    pub softkeys: Vec<Softkey>,
    pub intensity_buttons: Vec<IntensityButton>,
    pub keypad_config: KeypadConfig,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Softkey {
    pub id: String,
    pub label: String,
    pub function: String,
    pub active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct IntensityButton {
    pub id: String,
    pub label: String,
    pub value: u8,
    pub function: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct KeypadConfig {
    pub channel_input: bool,
    pub last_channel: Option<u16>,
    pub selected_channels: Vec<u16>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct Macro {
    pub id: Uuid,
    pub label: String,
    pub steps: Vec<MacroStep>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct MacroStep {
    pub delay_ms: u32,
    pub action: String,
    pub parameters: serde_json::Value,
}


