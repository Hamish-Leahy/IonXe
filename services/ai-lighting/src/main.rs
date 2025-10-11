use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

mod ai_engine;
mod augment3d;
mod music_analysis;
mod concept_processor;
mod lighting_generator;

use ai_engine::AILightingEngine;
use augment3d::Augment3DService;
use music_analysis::MusicAnalyzer;
use concept_processor::ConceptProcessor;
use lighting_generator::LightingGenerator;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AILightingConfig {
    pub mistral_api_key: String,
    pub augment3d_endpoint: String,
    pub music_analysis_enabled: bool,
    pub concept_processing_enabled: bool,
    pub lighting_generation_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AILightingState {
    pub active_scenes: Vec<AILightingScene>,
    pub music_context: Option<MusicContext>,
    pub concept_context: Option<ConceptContext>,
    pub augment3d_context: Option<Augment3DContext>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AILightingScene {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub lighting_cues: Vec<LightingCue>,
    pub music_sync: Option<MusicSync>,
    pub concept_tags: Vec<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingCue {
    pub id: Uuid,
    pub name: String,
    pub dmx_levels: Vec<u8>, // 512 DMX channels
    pub timing: CueTiming,
    pub effects: Vec<LightingEffect>,
    pub color_palette: Option<ColorPalette>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CueTiming {
    pub fade_in_ms: u32,
    pub fade_out_ms: u32,
    pub hold_ms: u32,
    pub delay_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingEffect {
    pub effect_type: EffectType,
    pub parameters: HashMap<String, f32>,
    pub intensity: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EffectType {
    Strobe,
    Chase,
    Rainbow,
    Pulse,
    Wave,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorPalette {
    pub primary: RgbColor,
    pub secondary: RgbColor,
    pub accent: RgbColor,
    pub background: RgbColor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MusicContext {
    pub tempo: f32,
    pub key: String,
    pub mood: String,
    pub dynamics: f32,
    pub rhythm_pattern: String,
    pub harmonic_progression: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConceptContext {
    pub concept: String,
    pub mood: String,
    pub color_scheme: String,
    pub intensity_level: f32,
    pub movement_style: String,
    pub artistic_notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Augment3DContext {
    pub venue_model: String,
    pub fixture_positions: Vec<FixturePosition>,
    pub spatial_effects: Vec<SpatialEffect>,
    pub camera_angles: Vec<CameraAngle>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixturePosition {
    pub id: Uuid,
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub rotation_x: f32,
    pub rotation_y: f32,
    pub rotation_z: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpatialEffect {
    pub effect_type: String,
    pub parameters: HashMap<String, f32>,
    pub affected_fixtures: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraAngle {
    pub name: String,
    pub position: (f32, f32, f32),
    pub target: (f32, f32, f32),
    pub fov: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MusicSync {
    pub beat_offset: f32,
    pub measure_offset: f32,
    pub tempo_multiplier: f32,
    pub sync_points: Vec<SyncPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPoint {
    pub time_ms: u32,
    pub cue_id: Uuid,
    pub transition_type: String,
}

pub struct AppState {
    pub config: AILightingConfig,
    pub state: Arc<RwLock<AILightingState>>,
    pub ai_engine: Arc<AILightingEngine>,
    pub music_analyzer: Arc<MusicAnalyzer>,
    pub concept_processor: Arc<ConceptProcessor>,
    pub augment3d_service: Arc<Augment3DService>,
    pub lighting_generator: Arc<LightingGenerator>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let config = AILightingConfig {
        mistral_api_key: std::env::var("MISTRAL_API_KEY")
            .unwrap_or_else(|_| "your-mistral-api-key".to_string()),
        augment3d_endpoint: std::env::var("AUGMENT3D_ENDPOINT")
            .unwrap_or_else(|_| "http://localhost:8083".to_string()),
        music_analysis_enabled: true,
        concept_processing_enabled: true,
        lighting_generation_enabled: true,
    };

    let state = Arc::new(RwLock::new(AILightingState {
        active_scenes: Vec::new(),
        music_context: None,
        concept_context: None,
        augment3d_context: None,
    }));

    let ai_engine = Arc::new(AILightingEngine::new(config.mistral_api_key.clone()).await?);
    let music_analyzer = Arc::new(MusicAnalyzer::new());
    let concept_processor = Arc::new(ConceptProcessor::new(config.mistral_api_key.clone()).await?);
    let augment3d_service = Arc::new(Augment3DService::new(config.augment3d_endpoint.clone()));
    let lighting_generator = Arc::new(LightingGenerator::new());

    let app_state = AppState {
        config,
        state,
        ai_engine,
        music_analyzer,
        concept_processor,
        augment3d_service,
        lighting_generator,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/ai-lighting/scenes", get(list_scenes).post(create_scene))
        .route("/api/v1/ai-lighting/scenes/:id", get(get_scene).put(update_scene).delete(delete_scene))
        .route("/api/v1/ai-lighting/scenes/:id/generate", post(generate_scene))
        .route("/api/v1/ai-lighting/music/analyze", post(analyze_music))
        .route("/api/v1/ai-lighting/concept/process", post(process_concept))
        .route("/api/v1/ai-lighting/augment3d/sync", post(sync_augment3d))
        .route("/api/v1/ai-lighting/execute/:id", post(execute_scene))
        .with_state(app_state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8084").await?;
    tracing::info!("AI Lighting service running on port 8084");
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "ok": true,
        "service": "ai-lighting",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn list_scenes(State(state): State<Arc<AppState>>) -> Json<Vec<AILightingScene>> {
    let scenes = state.state.read().await.active_scenes.clone();
    Json(scenes)
}

async fn create_scene(
    State(state): State<Arc<AppState>>,
    Json(mut scene): Json<AILightingScene>,
) -> Result<Json<AILightingScene>, StatusCode> {
    scene.id = Uuid::new_v4();
    scene.created_at = chrono::Utc::now();
    scene.updated_at = chrono::Utc::now();

    {
        let mut scenes = state.state.write().await;
        scenes.active_scenes.push(scene.clone());
    }

    Ok(Json(scene))
}

async fn get_scene(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<AILightingScene>, StatusCode> {
    let id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Err(StatusCode::BAD_REQUEST),
    };

    let scenes = state.state.read().await;
    let scene = scenes.active_scenes.iter().find(|s| s.id == id);
    
    match scene {
        Some(scene) => Ok(Json(scene.clone())),
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn update_scene(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(mut scene): Json<AILightingScene>,
) -> Result<Json<AILightingScene>, StatusCode> {
    let id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Err(StatusCode::BAD_REQUEST),
    };

    scene.id = id;
    scene.updated_at = chrono::Utc::now();

    {
        let mut scenes = state.state.write().await;
        if let Some(existing) = scenes.active_scenes.iter_mut().find(|s| s.id == id) {
            *existing = scene.clone();
        } else {
            return Err(StatusCode::NOT_FOUND);
        }
    }

    Ok(Json(scene))
}

async fn delete_scene(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    let id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Err(StatusCode::BAD_REQUEST),
    };

    {
        let mut scenes = state.state.write().await;
        let before = scenes.active_scenes.len();
        scenes.active_scenes.retain(|s| s.id != id);
        if scenes.active_scenes.len() == before {
            return Err(StatusCode::NOT_FOUND);
        }
    }

    Ok(StatusCode::NO_CONTENT)
}

async fn generate_scene(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Json(request): Json<GenerateSceneRequest>,
) -> Result<Json<AILightingScene>, StatusCode> {
    let id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Err(StatusCode::BAD_REQUEST),
    };

    // Generate AI lighting scene using Mistral
    let generated_scene = state.ai_engine.generate_lighting_scene(
        &request.concept,
        &request.music_context,
        &request.augment3d_context,
    ).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update the scene
    {
        let mut scenes = state.state.write().await;
        if let Some(existing) = scenes.active_scenes.iter_mut().find(|s| s.id == id) {
            existing.lighting_cues = generated_scene.lighting_cues;
            existing.concept_tags = generated_scene.concept_tags;
            existing.updated_at = chrono::Utc::now();
        } else {
            return Err(StatusCode::NOT_FOUND);
        }
    }

    let scenes = state.state.read().await;
    let scene = scenes.active_scenes.iter().find(|s| s.id == id).unwrap();
    Ok(Json(scene.clone()))
}

async fn analyze_music(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<MusicContext>, StatusCode> {
    let mut file_data = Vec::new();
    let mut file_name = String::new();
    
    // Extract file from multipart form
    while let Some(field) = multipart.next_field().await.map_err(|_| StatusCode::BAD_REQUEST)? {
        if field.name() == Some("file") {
            file_name = field.file_name().unwrap_or("unknown").to_string();
            let data = field.bytes().await.map_err(|_| StatusCode::BAD_REQUEST)?;
            file_data = data.to_vec();
            break;
        }
    }
    
    if file_data.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }
    
    // Save uploaded file temporarily
    let temp_path = format!("/tmp/{}", file_name);
    tokio::fs::write(&temp_path, &file_data).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    // Analyze the music file
    let analysis = state.music_analyzer.analyze_music_file(&temp_path)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Clean up temporary file
    let _ = tokio::fs::remove_file(&temp_path).await;

    // Update music context in state
    {
        let mut scenes = state.state.write().await;
        scenes.music_context = Some(analysis.clone());
    }

    Ok(Json(analysis))
}

async fn process_concept(
    State(state): State<Arc<AppState>>,
    Json(request): Json<ProcessConceptRequest>,
) -> Result<Json<ConceptContext>, StatusCode> {
    let concept = state.concept_processor.process_concept(&request.concept, &request.additional_context)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update concept context in state
    {
        let mut scenes = state.state.write().await;
        scenes.concept_context = Some(concept.clone());
    }

    Ok(Json(concept))
}

async fn sync_augment3d(
    State(state): State<Arc<AppState>>,
    Json(request): Json<SyncAugment3DRequest>,
) -> Result<Json<Augment3DContext>, StatusCode> {
    let context = state.augment3d_service.sync_venue_model(&request.venue_model_path)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Update Augment 3D context in state
    {
        let mut scenes = state.state.write().await;
        scenes.augment3d_context = Some(context.clone());
    }

    Ok(Json(context))
}

async fn execute_scene(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let id = match Uuid::parse_str(&id) {
        Ok(id) => id,
        Err(_) => return Err(StatusCode::BAD_REQUEST),
    };

    let scenes = state.state.read().await;
    let scene = scenes.active_scenes.iter().find(|s| s.id == id);
    
    match scene {
        Some(scene) => {
            // Execute the scene by sending DMX commands to the backend
            let result = state.lighting_generator.execute_scene(scene).await;
            Ok(Json(serde_json::json!({
                "status": "executed",
                "scene_id": id,
                "result": result
            })))
        }
        None => Err(StatusCode::NOT_FOUND),
    }
}

#[derive(Debug, Deserialize)]
struct GenerateSceneRequest {
    concept: String,
    music_context: Option<MusicContext>,
    augment3d_context: Option<Augment3DContext>,
}

#[derive(Debug, Deserialize)]
struct AnalyzeMusicRequest {
    file_path: String,
}

#[derive(Debug, Deserialize)]
struct ProcessConceptRequest {
    concept: String,
    additional_context: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SyncAugment3DRequest {
    venue_model_path: String,
}
