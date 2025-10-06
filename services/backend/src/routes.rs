use axum::{extract::{Path, Query}, routing::{get, post, delete, put}, Json, Router};
use std::fs;
use std::path::{Path as FsPath, PathBuf};
use time::OffsetDateTime;
use tower_http::{cors::{Any, CorsLayer}, trace::TraceLayer};
use uuid::Uuid;

use crate::{state::*, types::*};

pub fn build_router() -> Router {
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);
    Router::new()
        .route("/health", get(health))
        .route("/api/v1/patch", get(get_patch).put(put_patch))
        .route("/api/v1/patch/universes", post(add_universe))
        .route("/api/v1/patch/fixtures", post(add_fixture))
        .route("/api/v1/patch/channel_map", post(add_channel_map))
        .route("/api/v1/routing", get(get_routing).put(put_routing))
        .route("/api/v1/scenes", get(list_scenes).post(upsert_scene))
        .route("/api/v1/scenes/:id", get(get_scene).delete(delete_scene))
        // Users and profiles
        .route("/api/v1/users", get(users_list).post(user_create))
        .route("/api/v1/users/:username", delete(user_delete))
        .route("/api/v1/users/:username/profile", get(profile_get).put(profile_put))
        .route("/api/v1/fs/list", get(fs_list))
        .route("/api/v1/fs/read", get(fs_read))
        .route("/api/v1/fs/write", put(fs_write))
        .route("/api/v1/fs/delete", delete(fs_delete))
        .route("/api/v1/fs/mkdir", post(fs_mkdir))
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

pub async fn list_scenes() -> Json<Vec<Scene>> { Json(APP_STATE.read().scenes.clone()) }

pub async fn get_scene(Path(id): Path<String>) -> axum::http::StatusCode {
    let id = match Uuid::parse_str(&id) { Ok(v) => v, Err(_) => return axum::http::StatusCode::BAD_REQUEST };
    let st = APP_STATE.read();
    if st.scenes.iter().any(|s| s.id == id) { axum::http::StatusCode::OK } else { axum::http::StatusCode::NOT_FOUND }
}

pub async fn upsert_scene(Json(mut s): Json<Scene>) -> Json<Scene> {
    if s.id == Uuid::nil() { s.id = Uuid::new_v4(); }
    if s.levels.len() != 512 { s.levels.resize(512, 0); }
    {
        let mut st = APP_STATE.write();
        if let Some(existing) = st.scenes.iter_mut().find(|x| x.id == s.id) {
            *existing = s.clone();
        } else {
            st.scenes.push(s.clone());
        }
    }
    persist_scenes();
    Json(s)
}

pub async fn delete_scene(Path(id): Path<String>) -> axum::http::StatusCode {
    let id = match Uuid::parse_str(&id) { Ok(v) => v, Err(_) => return axum::http::StatusCode::BAD_REQUEST };
    {
        let mut st = APP_STATE.write();
        let before = st.scenes.len();
        st.scenes.retain(|s| s.id != id);
        if st.scenes.len() != before { persist_scenes(); return axum::http::StatusCode::NO_CONTENT; }
    }
    axum::http::StatusCode::NOT_FOUND
}

// Users
pub async fn users_list() -> Json<Vec<User>> { Json(load_users()) }

#[derive(serde::Deserialize)]
pub struct NewUser { pub username: String, pub password: String, pub role: Option<String> }
pub async fn user_create(Json(nu): Json<NewUser>) -> axum::http::StatusCode {
    let mut list = load_users();
    if list.iter().any(|u| u.username == nu.username) { return axum::http::StatusCode::CONFLICT; }
    let hash = bcrypt::hash(nu.password, bcrypt::DEFAULT_COST).unwrap_or_default();
    list.push(User { username: nu.username, hash, role: nu.role.unwrap_or_else(|| "operator".into()) });
    save_users(&list);
    axum::http::StatusCode::CREATED
}
pub async fn user_delete(Path(username): Path<String>) -> axum::http::StatusCode {
    let mut list = load_users();
    let before = list.len();
    list.retain(|u| u.username != username);
    if list.len() != before { save_users(&list); axum::http::StatusCode::NO_CONTENT } else { axum::http::StatusCode::NOT_FOUND }
}

// Profiles
pub async fn profile_get(Path(username): Path<String>) -> Json<Profile> { Json(load_profile(&username)) }
pub async fn profile_put(Path(username): Path<String>, Json(p): Json<Profile>) -> axum::http::StatusCode { save_profile(&username, &p); axum::http::StatusCode::NO_CONTENT }

#[derive(serde::Deserialize)]
struct FsQuery { path: String }

#[derive(serde::Serialize)]
struct FsEntry { name: String, kind: String, size: u64 }

fn fs_root() -> PathBuf {
    std::env::var("IONXE_FILES_ROOT").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("build"))
}

fn sanitize_path(p: &str) -> Option<PathBuf> {
    if p.starts_with('/') || p.contains("..") { return None; }
    let mut out = fs_root();
    if !p.is_empty() { out.push(p); }
    Some(out)
}

pub async fn fs_list(Query(q): Query<FsQuery>) -> impl axum::response::IntoResponse {
    let Some(dir) = sanitize_path(&q.path) else { return (axum::http::StatusCode::BAD_REQUEST, "bad path").into_response(); };
    let mut entries = vec![];
    if let Ok(read) = fs::read_dir(&dir) {
        for ent in read.flatten() {
            let name = ent.file_name().to_string_lossy().to_string();
            let meta = ent.metadata().ok();
            let (kind, size) = match meta {
                Some(m) if m.is_dir() => ("dir".to_string(), 0),
                Some(m) if m.is_file() => ("file".to_string(), m.len()),
                _ => ("other".to_string(), 0),
            };
            entries.push(FsEntry { name, kind, size });
        }
    }
    Json(entries).into_response()
}

pub async fn fs_read(Query(q): Query<FsQuery>) -> impl axum::response::IntoResponse {
    let Some(path) = sanitize_path(&q.path) else { return (axum::http::StatusCode::BAD_REQUEST, "bad path").into_response(); };
    match fs::read(&path) {
        Ok(bytes) => axum::response::Response::builder()
            .status(axum::http::StatusCode::OK)
            .header(axum::http::header::CONTENT_TYPE, "application/octet-stream")
            .body(axum::body::Body::from(bytes))
            .unwrap(),
        Err(_) => axum::http::StatusCode::NOT_FOUND.into_response(),
    }
}

pub async fn fs_write(Query(q): Query<FsQuery>, body: axum::body::Bytes) -> impl axum::response::IntoResponse {
    let Some(path) = sanitize_path(&q.path) else { return (axum::http::StatusCode::BAD_REQUEST, "bad path"); };
    if let Some(parent) = path.parent() { let _ = fs::create_dir_all(parent); }
    match fs::write(&path, &body) {
        Ok(_) => axum::http::StatusCode::NO_CONTENT,
        Err(_) => axum::http::StatusCode::INTERNAL_SERVER_ERROR,
    }
}

pub async fn fs_delete(Query(q): Query<FsQuery>) -> impl axum::response::IntoResponse {
    let Some(path) = sanitize_path(&q.path) else { return axum::http::StatusCode::BAD_REQUEST; };
    let res = if path.is_dir() { fs::remove_dir_all(&path) } else { fs::remove_file(&path) };
    match res { Ok(_) => axum::http::StatusCode::NO_CONTENT, Err(_) => axum::http::StatusCode::NOT_FOUND }
}

pub async fn fs_mkdir(Query(q): Query<FsQuery>) -> impl axum::response::IntoResponse {
    let Some(path) = sanitize_path(&q.path) else { return axum::http::StatusCode::BAD_REQUEST; };
    match fs::create_dir_all(&path) { Ok(_) => axum::http::StatusCode::NO_CONTENT, Err(_) => axum::http::StatusCode::INTERNAL_SERVER_ERROR }
}


