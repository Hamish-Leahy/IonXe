use once_cell::sync::Lazy;
use parking_lot::RwLock;

use crate::types::*;

pub static APP_STATE: Lazy<RwLock<AppState>> = Lazy::new(|| RwLock::new(AppState::default()));

pub fn init_state_from_disk(version: &str) {
    let mut st = APP_STATE.write();
    st.version = version.to_string();
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    let patch_path = format!("{}/patch.json", state_dir);
    let routing_path = format!("{}/routing.json", state_dir);
    let scenes_path = format!("{}/scenes.json", state_dir);
    if let Ok(bytes) = std::fs::read(&patch_path) {
        if let Ok(saved) = serde_json::from_slice::<PatchState>(&bytes) { st.patch = saved; }
    }
    if let Ok(bytes) = std::fs::read(&routing_path) {
        if let Ok(saved) = serde_json::from_slice::<RoutingConfig>(&bytes) { st.routing = saved; }
    }
    if let Ok(bytes) = std::fs::read(&scenes_path) {
        if let Ok(saved) = serde_json::from_slice::<Vec<Scene>>(&bytes) { st.scenes = saved; }
    }
}

pub fn persist_patch() {
    let st = APP_STATE.read();
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    let _ = std::fs::create_dir_all(&state_dir);
    let path = format!("{}/patch.json", state_dir);
    let _ = std::fs::write(path, serde_json::to_vec_pretty(&st.patch).unwrap());
}

pub fn persist_routing() {
    let st = APP_STATE.read();
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    let _ = std::fs::create_dir_all(&state_dir);
    let path = format!("{}/routing.json", state_dir);
    let _ = std::fs::write(path, serde_json::to_vec_pretty(&st.routing).unwrap());
}

pub fn persist_scenes() {
    let st = APP_STATE.read();
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    let _ = std::fs::create_dir_all(&state_dir);
    let path = format!("{}/scenes.json", state_dir);
    let _ = std::fs::write(path, serde_json::to_vec_pretty(&st.scenes).unwrap());
}

// Users and profiles persistence
pub fn users_path() -> String {
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    format!("{}/users.json", state_dir)
}
pub fn profiles_path(username: &str) -> String {
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    format!("{}/profile_{}.json", state_dir, username)
}
pub fn load_users() -> Vec<User> {
    std::fs::read(users_path()).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}
pub fn save_users(list: &[User]) {
    let p = users_path(); let _ = std::fs::create_dir_all(std::path::Path::new(&p).parent().unwrap()); let _ = std::fs::write(p, serde_json::to_vec_pretty(list).unwrap());
}
pub fn load_profile(username: &str) -> Profile {
    std::fs::read(profiles_path(username)).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
}
pub fn save_profile(username: &str, p: &Profile) {
    let path = profiles_path(username); let _ = std::fs::create_dir_all(std::path::Path::new(&path).parent().unwrap()); let _ = std::fs::write(path, serde_json::to_vec_pretty(p).unwrap());
}

// ---------------- Q List persistence ----------------
fn qlist_state_path() -> String {
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    format!("{}/qlist_state.json", state_dir)
}

fn qlist_changes_path() -> String {
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    format!("{}/qlist_changes.json", state_dir)
}

pub fn load_qlist_state() -> QListStateDoc {
    let p = qlist_state_path();
    std::fs::read(&p).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_else(|| QListStateDoc { name: "Untitled Cue List".into(), cues: vec![], current_cue_index: -1, is_playing: false, is_paused: false, last_saved: None })
}

pub fn save_qlist_state(doc: &QListStateDoc) {
    let p = qlist_state_path(); let _ = std::fs::create_dir_all(std::path::Path::new(&p).parent().unwrap()); let _ = std::fs::write(p, serde_json::to_vec_pretty(doc).unwrap());
}

pub fn append_qlist_changes(changes: &[QListStateChange]) {
    let p = qlist_changes_path();
    let mut existing: Vec<QListStateChange> = std::fs::read(&p).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default();
    existing.extend_from_slice(changes);
    let _ = std::fs::create_dir_all(std::path::Path::new(&p).parent().unwrap()); let _ = std::fs::write(p, serde_json::to_vec_pretty(&existing).unwrap());
}

// Fader and Control persistence
fn fader_config_path() -> String {
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    format!("{}/fader_config.json", state_dir)
}

fn button_config_path() -> String {
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    format!("{}/button_config.json", state_dir)
}

fn macros_path() -> String {
    let state_dir = std::env::var("IONXE_STATE_DIR").unwrap_or_else(|_| "build/state".into());
    format!("{}/macros.json", state_dir)
}

pub fn load_fader_config() -> FaderConfig {
    let path = fader_config_path();
    std::fs::read(&path)
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

pub fn save_fader_config(config: &FaderConfig) {
    let path = fader_config_path();
    let _ = std::fs::create_dir_all(std::path::Path::new(&path).parent().unwrap());
    let _ = std::fs::write(path, serde_json::to_vec_pretty(config).unwrap());
}

pub fn load_button_config() -> ButtonConfig {
    let path = button_config_path();
    std::fs::read(&path)
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_else(|| {
            // Default button configuration
            ButtonConfig {
                softkeys: vec![
                    Softkey { id: "macro".to_string(), label: "Macro".to_string(), function: "macro".to_string(), active: false },
                    Softkey { id: "record".to_string(), label: "Record".to_string(), function: "record".to_string(), active: false },
                    Softkey { id: "update".to_string(), label: "Update".to_string(), function: "update".to_string(), active: false },
                    Softkey { id: "clear".to_string(), label: "Clear".to_string(), function: "clear".to_string(), active: false },
                    Softkey { id: "blind".to_string(), label: "Blind".to_string(), function: "blind".to_string(), active: false },
                    Softkey { id: "live".to_string(), label: "Live".to_string(), function: "live".to_string(), active: true },
                ],
                intensity_buttons: vec![
                    IntensityButton { id: "full".to_string(), label: "Full".to_string(), value: 255, function: "set_intensity".to_string() },
                    IntensityButton { id: "out".to_string(), label: "Out".to_string(), value: 0, function: "set_intensity".to_string() },
                    IntensityButton { id: "at".to_string(), label: "@".to_string(), value: 0, function: "prompt_intensity".to_string() },
                ],
                keypad_config: KeypadConfig {
                    channel_input: true,
                    last_channel: None,
                    selected_channels: vec![],
                },
            }
        })
}

pub fn save_button_config(config: &ButtonConfig) {
    let path = button_config_path();
    let _ = std::fs::create_dir_all(std::path::Path::new(&path).parent().unwrap());
    let _ = std::fs::write(path, serde_json::to_vec_pretty(config).unwrap());
}

pub fn load_macros() -> Vec<Macro> {
    let path = macros_path();
    std::fs::read(&path)
        .ok()
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or_default()
}

pub fn save_macros(macros: &[Macro]) {
    let path = macros_path();
    let _ = std::fs::create_dir_all(std::path::Path::new(&path).parent().unwrap());
    let _ = std::fs::write(path, serde_json::to_vec_pretty(macros).unwrap());
}


