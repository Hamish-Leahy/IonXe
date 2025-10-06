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


