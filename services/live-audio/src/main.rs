use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{info, warn};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioAnalysis {
    pub timestamp: u64,
    pub bpm: f32,
    pub bass_level: f32,
    pub mid_level: f32,
    pub treble_level: f32,
    pub overall_level: f32,
    pub beat_detected: bool,
    pub energy: f32,
    pub spectral_centroid: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPoint {
    pub id: Uuid,
    pub timestamp: u64,
    pub bpm: f32,
    pub audio_level: f32,
    pub description: String,
    pub cue_id: Option<Uuid>,
    pub transition_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingSyncConfig {
    pub enabled: bool,
    pub sensitivity: f32,
    pub frequency_bands: HashMap<String, FrequencyBand>,
    pub sync_effects: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrequencyBand {
    pub min_freq: f32,
    pub max_freq: f32,
    pub sensitivity: f32,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingCommand {
    pub command_type: String,
    pub channels: Vec<u16>,
    pub values: Vec<u8>,
    pub duration: u32,
    pub effect_params: HashMap<String, f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiveAudioState {
    pub is_recording: bool,
    pub current_analysis: Option<AudioAnalysis>,
    pub sync_points: Vec<SyncPoint>,
    pub lighting_config: LightingSyncConfig,
    pub last_beat_time: Option<Instant>,
    pub beat_history: Vec<Instant>,
}

impl Default for LiveAudioState {
    fn default() -> Self {
        let mut frequency_bands = HashMap::new();
        frequency_bands.insert("bass".to_string(), FrequencyBand {
            min_freq: 20.0,
            max_freq: 250.0,
            sensitivity: 1.0,
            color: "#ff0000".to_string(),
        });
        frequency_bands.insert("mid".to_string(), FrequencyBand {
            min_freq: 250.0,
            max_freq: 4000.0,
            sensitivity: 1.0,
            color: "#00ff00".to_string(),
        });
        frequency_bands.insert("treble".to_string(), FrequencyBand {
            min_freq: 4000.0,
            max_freq: 20000.0,
            sensitivity: 1.0,
            color: "#0000ff".to_string(),
        });

        Self {
            is_recording: false,
            current_analysis: None,
            sync_points: Vec::new(),
            lighting_config: LightingSyncConfig {
                enabled: false,
                sensitivity: 0.5,
                frequency_bands,
                sync_effects: vec!["beat-sync".to_string(), "frequency-sync".to_string()],
            },
            last_beat_time: None,
            beat_history: Vec::new(),
        }
    }
}

pub struct AppState {
    pub state: Arc<RwLock<LiveAudioState>>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let app_state = AppState {
        state: Arc::new(RwLock::new(LiveAudioState::default())),
    };

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/audio/start", post(start_audio_analysis))
        .route("/api/v1/audio/stop", post(stop_audio_analysis))
        .route("/api/v1/audio/analysis", post(process_audio_analysis))
        .route("/api/v1/audio/status", get(get_audio_status))
        .route("/api/v1/sync/points", get(get_sync_points))
        .route("/api/v1/sync/points", post(add_sync_point))
        .route("/api/v1/sync/points/:id", axum::routing::delete(remove_sync_point))
        .route("/api/v1/sync/config", get(get_sync_config))
        .route("/api/v1/sync/config", post(update_sync_config))
        .route("/api/v1/lighting/command", post(send_lighting_command))
        .with_state(app_state)
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive()),
        );

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8085").await?;
    info!("Live Audio service listening on http://0.0.0.0:8085");
    
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "live-audio",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

#[derive(Deserialize)]
struct AudioAnalysisRequest {
    bpm: f32,
    bass_level: f32,
    mid_level: f32,
    treble_level: f32,
    overall_level: f32,
    beat_detected: bool,
    energy: f32,
    spectral_centroid: f32,
}

async fn process_audio_analysis(
    State(state): State<Arc<RwLock<LiveAudioState>>>,
    Json(request): Json<AudioAnalysisRequest>,
) -> Result<Json<AudioAnalysis>, StatusCode> {
    let analysis = AudioAnalysis {
        timestamp: chrono::Utc::now().timestamp_millis() as u64,
        bpm: request.bpm,
        bass_level: request.bass_level,
        mid_level: request.mid_level,
        treble_level: request.treble_level,
        overall_level: request.overall_level,
        beat_detected: request.beat_detected,
        energy: request.energy,
        spectral_centroid: request.spectral_centroid,
    };

    let mut state_guard = state.write().await;
    state_guard.current_analysis = Some(analysis.clone());

    // Process beat detection
    if request.beat_detected {
        let now = Instant::now();
        state_guard.last_beat_time = Some(now);
        state_guard.beat_history.push(now);
        
        // Keep only recent beats (last 10 seconds)
        state_guard.beat_history.retain(|&time| now.duration_since(time) < Duration::from_secs(10));
    }

    // Generate lighting commands if sync is enabled
    if state_guard.lighting_config.enabled {
        let lighting_commands = generate_lighting_commands(&analysis, &state_guard.lighting_config);
        for command in lighting_commands {
            // In a real implementation, this would send commands to the lighting system
            info!("Generated lighting command: {:?}", command);
        }
    }

    Ok(Json(analysis))
}

async fn start_audio_analysis(
    State(state): State<Arc<RwLock<LiveAudioState>>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let mut state_guard = state.write().await;
    state_guard.is_recording = true;
    state_guard.beat_history.clear();
    
    info!("Audio analysis started");
    Ok(Json(serde_json::json!({
        "status": "started",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })))
}

async fn stop_audio_analysis(
    State(state): State<Arc<RwLock<LiveAudioState>>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let mut state_guard = state.write().await;
    state_guard.is_recording = false;
    state_guard.current_analysis = None;
    
    info!("Audio analysis stopped");
    Ok(Json(serde_json::json!({
        "status": "stopped",
        "timestamp": chrono::Utc::now().to_rfc3339()
    })))
}

async fn get_audio_status(
    State(state): State<Arc<RwLock<LiveAudioState>>>,
) -> Json<LiveAudioState> {
    let state_guard = state.read().await;
    Json(state_guard.clone())
}

async fn get_sync_points(
    State(state): State<Arc<RwLock<LiveAudioState>>>,
) -> Json<Vec<SyncPoint>> {
    let state_guard = state.read().await;
    Json(state_guard.sync_points.clone())
}

#[derive(Deserialize)]
struct AddSyncPointRequest {
    description: String,
    cue_id: Option<Uuid>,
    transition_type: String,
}

async fn add_sync_point(
    State(state): State<Arc<RwLock<LiveAudioState>>>,
    Json(request): Json<AddSyncPointRequest>,
) -> Result<Json<SyncPoint>, StatusCode> {
    let mut state_guard = state.write().await;
    
    let sync_point = SyncPoint {
        id: Uuid::new_v4(),
        timestamp: chrono::Utc::now().timestamp_millis() as u64,
        bpm: state_guard.current_analysis.as_ref().map(|a| a.bpm).unwrap_or(0.0),
        audio_level: state_guard.current_analysis.as_ref().map(|a| a.overall_level).unwrap_or(0.0),
        description: request.description,
        cue_id: request.cue_id,
        transition_type: request.transition_type,
    };
    
    state_guard.sync_points.push(sync_point.clone());
    info!("Added sync point: {}", sync_point.id);
    
    Ok(Json(sync_point))
}

async fn remove_sync_point(
    State(state): State<Arc<RwLock<LiveAudioState>>>,
    axum::extract::Path(id): axum::extract::Path<Uuid>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let mut state_guard = state.write().await;
    let initial_count = state_guard.sync_points.len();
    state_guard.sync_points.retain(|point| point.id != id);
    
    if state_guard.sync_points.len() < initial_count {
        info!("Removed sync point: {}", id);
        Ok(Json(serde_json::json!({
            "status": "removed",
            "id": id
        })))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn get_sync_config(
    State(state): State<Arc<RwLock<LiveAudioState>>>,
) -> Json<LightingSyncConfig> {
    let state_guard = state.read().await;
    Json(state_guard.lighting_config.clone())
}

async fn update_sync_config(
    State(state): State<Arc<RwLock<LiveAudioState>>>,
    Json(config): Json<LightingSyncConfig>,
) -> Result<Json<LightingSyncConfig>, StatusCode> {
    let mut state_guard = state.write().await;
    state_guard.lighting_config = config.clone();
    
    info!("Updated sync config");
    Ok(Json(config))
}

#[derive(Deserialize)]
struct LightingCommandRequest {
    command_type: String,
    channels: Vec<u16>,
    values: Vec<u8>,
    duration: u32,
    effect_params: HashMap<String, f32>,
}

async fn send_lighting_command(
    Json(request): Json<LightingCommandRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let command = LightingCommand {
        command_type: request.command_type,
        channels: request.channels,
        values: request.values,
        duration: request.duration,
        effect_params: request.effect_params,
    };
    
    // In a real implementation, this would send the command to the lighting system
    info!("Received lighting command: {:?}", command);
    
    Ok(Json(serde_json::json!({
        "status": "sent",
        "command_id": Uuid::new_v4(),
        "timestamp": chrono::Utc::now().to_rfc3339()
    })))
}

fn generate_lighting_commands(
    analysis: &AudioAnalysis,
    config: &LightingSyncConfig,
) -> Vec<LightingCommand> {
    let mut commands = Vec::new();
    
    if !config.enabled {
        return commands;
    }
    
    // Beat sync effect
    if analysis.beat_detected && config.sync_effects.contains(&"beat-sync".to_string()) {
        commands.push(LightingCommand {
            command_type: "beat_flash".to_string(),
            channels: (1..=24).collect(), // Flash first 24 channels
            values: vec![255; 24],
            duration: 100, // 100ms flash
            effect_params: HashMap::new(),
        });
    }
    
    // Frequency sync effect
    if config.sync_effects.contains(&"frequency-sync".to_string()) {
        let bass_intensity = (analysis.bass_level * 255.0) as u8;
        let mid_intensity = (analysis.mid_level * 255.0) as u8;
        let treble_intensity = (analysis.treble_level * 255.0) as u8;
        
        // Bass channels (1-8)
        if bass_intensity > 50 {
            commands.push(LightingCommand {
                command_type: "set_levels".to_string(),
                channels: (1..=8).collect(),
                values: vec![bass_intensity; 8],
                duration: 50,
                effect_params: HashMap::new(),
            });
        }
        
        // Mid channels (9-16)
        if mid_intensity > 50 {
            commands.push(LightingCommand {
                command_type: "set_levels".to_string(),
                channels: (9..=16).collect(),
                values: vec![mid_intensity; 8],
                duration: 50,
                effect_params: HashMap::new(),
            });
        }
        
        // Treble channels (17-24)
        if treble_intensity > 50 {
            commands.push(LightingCommand {
                command_type: "set_levels".to_string(),
                channels: (17..=24).collect(),
                values: vec![treble_intensity; 8],
                duration: 50,
                effect_params: HashMap::new(),
            });
        }
    }
    
    // Energy sync effect
    if config.sync_effects.contains(&"energy-sync".to_string()) {
        let energy_intensity = (analysis.energy * 255.0) as u8;
        if energy_intensity > 100 {
            commands.push(LightingCommand {
                command_type: "energy_wave".to_string(),
                channels: (1..=24).collect(),
                values: vec![energy_intensity; 24],
                duration: 200,
                effect_params: {
                    let mut params = HashMap::new();
                    params.insert("speed".to_string(), analysis.bpm / 60.0);
                    params.insert("intensity".to_string(), analysis.energy);
                    params
                },
            });
        }
    }
    
    commands
}
