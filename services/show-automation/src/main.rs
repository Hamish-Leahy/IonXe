use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{info, warn, error};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Show {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub duration: u64, // in milliseconds
    pub status: ShowStatus,
    pub sequences: Vec<SequenceItem>,
    pub triggers: Vec<Trigger>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ShowStatus {
    Stopped,
    Playing,
    Paused,
    Scheduled,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SequenceItem {
    pub id: Uuid,
    pub item_type: SequenceItemType,
    pub time: u64, // start time in milliseconds
    pub duration: u64, // duration in milliseconds
    pub action: String,
    pub parameters: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SequenceItemType {
    Cue,
    Delay,
    Trigger,
    Effect,
    Macro,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trigger {
    pub id: Uuid,
    pub trigger_type: TriggerType,
    pub name: String,
    pub parameters: HashMap<String, serde_json::Value>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TriggerType {
    Time,
    Midi,
    Osc,
    Manual,
    Cue,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledShow {
    pub id: Uuid,
    pub show_id: Uuid,
    pub name: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub days_of_week: Vec<u8>, // 0 = Sunday, 1 = Monday, etc.
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShowExecution {
    pub id: Uuid,
    pub show_id: Uuid,
    pub status: ShowStatus,
    pub current_time: u64,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub current_sequence_item: Option<Uuid>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShowAutomationState {
    pub shows: HashMap<Uuid, Show>,
    pub scheduled_shows: HashMap<Uuid, ScheduledShow>,
    pub active_executions: HashMap<Uuid, ShowExecution>,
    pub triggers: HashMap<Uuid, Trigger>,
}

impl Default for ShowAutomationState {
    fn default() -> Self {
        Self {
            shows: HashMap::new(),
            scheduled_shows: HashMap::new(),
            active_executions: HashMap::new(),
            triggers: HashMap::new(),
        }
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "show_automation=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let state = Arc::new(RwLock::new(ShowAutomationState::default()));

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/shows", get(get_shows).post(create_show))
        .route("/api/v1/shows/:id", get(get_show).put(update_show).delete(delete_show))
        .route("/api/v1/shows/:id/play", post(play_show))
        .route("/api/v1/shows/:id/pause", post(pause_show))
        .route("/api/v1/shows/:id/stop", post(stop_show))
        .route("/api/v1/shows/:id/sequences", get(get_sequences).post(add_sequence_item))
        .route("/api/v1/shows/:id/sequences/:item_id", put(update_sequence_item).delete(delete_sequence_item))
        .route("/api/v1/scheduled-shows", get(get_scheduled_shows).post(create_scheduled_show))
        .route("/api/v1/scheduled-shows/:id", put(update_scheduled_show).delete(delete_scheduled_show))
        .route("/api/v1/triggers", get(get_triggers).post(create_trigger))
        .route("/api/v1/triggers/:id", put(update_trigger).delete(delete_trigger))
        .route("/api/v1/executions", get(get_executions))
        .route("/api/v1/executions/:id", get(get_execution))
        .layer(CorsLayer::new().allow_origin(tower_http::cors::Any).allow_methods(tower_http::cors::Any).allow_headers(tower_http::cors::Any))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8086").await.unwrap();
    tracing::info!("Show Automation service listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "show-automation",
        "timestamp": Utc::now().to_rfc3339()
    }))
}

// Show Management
async fn get_shows(State(state): State<Arc<RwLock<ShowAutomationState>>>) -> Json<Vec<Show>> {
    let state = state.read().await;
    Json(state.shows.values().cloned().collect())
}

async fn create_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Json(mut show): Json<Show>,
) -> Result<Json<Show>, StatusCode> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    show.id = id;
    show.created_at = now;
    show.updated_at = now;
    show.status = ShowStatus::Stopped;

    let mut state = state.write().await;
    state.shows.insert(id, show.clone());
    
    info!("Created show: {} ({})", show.name, id);
    Ok(Json(show))
}

async fn get_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Show>, StatusCode> {
    let state = state.read().await;
    state.shows.get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn update_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
    Json(mut show): Json<Show>,
) -> Result<Json<Show>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(existing_show) = state.shows.get_mut(&id) {
        show.id = id;
        show.created_at = existing_show.created_at;
        show.updated_at = Utc::now();
        *existing_show = show.clone();
        
        info!("Updated show: {} ({})", show.name, id);
        Ok(Json(show))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn delete_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    let mut state = state.write().await;
    
    if state.shows.remove(&id).is_some() {
        // Also remove any scheduled shows for this show
        state.scheduled_shows.retain(|_, scheduled| scheduled.show_id != id);
        
        info!("Deleted show: {}", id);
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

// Show Playback Control
async fn play_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ShowExecution>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(show) = state.shows.get(&id) {
        let execution_id = Uuid::new_v4();
        let execution = ShowExecution {
            id: execution_id,
            show_id: id,
            status: ShowStatus::Playing,
            current_time: 0,
            start_time: Some(Utc::now()),
            end_time: None,
            current_sequence_item: None,
            error_message: None,
        };
        
        state.active_executions.insert(execution_id, execution.clone());
        
        // Update show status
        if let Some(show) = state.shows.get_mut(&id) {
            show.status = ShowStatus::Playing;
        }
        
        info!("Started playing show: {} ({})", show.name, id);
        Ok(Json(execution))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn pause_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ShowExecution>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(execution) = state.active_executions.values_mut()
        .find(|exec| exec.show_id == id && exec.status == ShowStatus::Playing) {
        
        execution.status = ShowStatus::Paused;
        
        // Update show status
        if let Some(show) = state.shows.get_mut(&id) {
            show.status = ShowStatus::Paused;
        }
        
        info!("Paused show: {}", id);
        Ok(Json(execution.clone()))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn stop_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ShowExecution>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(execution) = state.active_executions.values_mut()
        .find(|exec| exec.show_id == id && (exec.status == ShowStatus::Playing || exec.status == ShowStatus::Paused)) {
        
        execution.status = ShowStatus::Stopped;
        execution.end_time = Some(Utc::now());
        
        // Update show status
        if let Some(show) = state.shows.get_mut(&id) {
            show.status = ShowStatus::Stopped;
        }
        
        info!("Stopped show: {}", id);
        Ok(Json(execution.clone()))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

// Sequence Management
async fn get_sequences(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<SequenceItem>>, StatusCode> {
    let state = state.read().await;
    
    if let Some(show) = state.shows.get(&id) {
        Ok(Json(show.sequences.clone()))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn add_sequence_item(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
    Json(mut item): Json<SequenceItem>,
) -> Result<Json<SequenceItem>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(show) = state.shows.get_mut(&id) {
        item.id = Uuid::new_v4();
        show.sequences.push(item.clone());
        show.updated_at = Utc::now();
        
        info!("Added sequence item to show: {} ({})", show.name, id);
        Ok(Json(item))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn update_sequence_item(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path((show_id, item_id)): Path<(Uuid, Uuid)>,
    Json(item): Json<SequenceItem>,
) -> Result<Json<SequenceItem>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(show) = state.shows.get_mut(&show_id) {
        if let Some(sequence_item) = show.sequences.iter_mut().find(|item| item.id == item_id) {
            *sequence_item = item.clone();
            show.updated_at = Utc::now();
            
            info!("Updated sequence item in show: {} ({})", show.name, show_id);
            Ok(Json(item))
        } else {
            Err(StatusCode::NOT_FOUND)
        }
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn delete_sequence_item(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path((show_id, item_id)): Path<(Uuid, Uuid)>,
) -> StatusCode {
    let mut state = state.write().await;
    
    if let Some(show) = state.shows.get_mut(&show_id) {
        if let Some(pos) = show.sequences.iter().position(|item| item.id == item_id) {
            show.sequences.remove(pos);
            show.updated_at = Utc::now();
            
            info!("Deleted sequence item from show: {} ({})", show.name, show_id);
            StatusCode::NO_CONTENT
        } else {
            StatusCode::NOT_FOUND
        }
    } else {
        StatusCode::NOT_FOUND
    }
}

// Scheduled Shows
async fn get_scheduled_shows(State(state): State<Arc<RwLock<ShowAutomationState>>>) -> Json<Vec<ScheduledShow>> {
    let state = state.read().await;
    Json(state.scheduled_shows.values().cloned().collect())
}

async fn create_scheduled_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Json(mut scheduled_show): Json<ScheduledShow>,
) -> Result<Json<ScheduledShow>, StatusCode> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    scheduled_show.id = id;
    scheduled_show.created_at = now;

    let mut state = state.write().await;
    state.scheduled_shows.insert(id, scheduled_show.clone());
    
    info!("Created scheduled show: {} ({})", scheduled_show.name, id);
    Ok(Json(scheduled_show))
}

async fn update_scheduled_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
    Json(scheduled_show): Json<ScheduledShow>,
) -> Result<Json<ScheduledShow>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(existing) = state.scheduled_shows.get_mut(&id) {
        *existing = scheduled_show.clone();
        
        info!("Updated scheduled show: {} ({})", scheduled_show.name, id);
        Ok(Json(scheduled_show))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn delete_scheduled_show(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    let mut state = state.write().await;
    
    if state.scheduled_shows.remove(&id).is_some() {
        info!("Deleted scheduled show: {}", id);
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

// Triggers
async fn get_triggers(State(state): State<Arc<RwLock<ShowAutomationState>>>) -> Json<Vec<Trigger>> {
    let state = state.read().await;
    Json(state.triggers.values().cloned().collect())
}

async fn create_trigger(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Json(mut trigger): Json<Trigger>,
) -> Result<Json<Trigger>, StatusCode> {
    let id = Uuid::new_v4();
    trigger.id = id;

    let mut state = state.write().await;
    state.triggers.insert(id, trigger.clone());
    
    info!("Created trigger: {} ({})", trigger.name, id);
    Ok(Json(trigger))
}

async fn update_trigger(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
    Json(trigger): Json<Trigger>,
) -> Result<Json<Trigger>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(existing) = state.triggers.get_mut(&id) {
        *existing = trigger.clone();
        
        info!("Updated trigger: {} ({})", trigger.name, id);
        Ok(Json(trigger))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn delete_trigger(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    let mut state = state.write().await;
    
    if state.triggers.remove(&id).is_some() {
        info!("Deleted trigger: {}", id);
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

// Executions
async fn get_executions(State(state): State<Arc<RwLock<ShowAutomationState>>>) -> Json<Vec<ShowExecution>> {
    let state = state.read().await;
    Json(state.active_executions.values().cloned().collect())
}

async fn get_execution(
    State(state): State<Arc<RwLock<ShowAutomationState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ShowExecution>, StatusCode> {
    let state = state.read().await;
    state.active_executions.get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}
