// Service Discovery & Health Monitoring System
// Centralized service registry, health monitoring, and load balancing

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use chrono::{DateTime, Utc};
use redis::{Client as RedisClient, ConnectionManager};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{info, warn, error, debug};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub id: Uuid,
    pub name: String,
    pub version: String,
    pub host: String,
    pub port: u16,
    pub health_endpoint: String,
    pub status: ServiceStatus,
    pub last_health_check: Option<DateTime<Utc>>,
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServiceStatus {
    Healthy,
    Unhealthy,
    Unknown,
    Starting,
    Stopping,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    pub service_id: Uuid,
    pub status: ServiceStatus,
    pub response_time_ms: u64,
    pub error_message: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub metrics: HashMap<String, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceMetrics {
    pub service_id: Uuid,
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub request_count: u64,
    pub error_count: u64,
    pub response_time_avg: f64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadBalancerConfig {
    pub strategy: LoadBalancingStrategy,
    pub health_check_interval: u64, // seconds
    pub unhealthy_threshold: u32,
    pub healthy_threshold: u32,
    pub timeout: u64, // seconds
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LoadBalancingStrategy {
    RoundRobin,
    LeastConnections,
    WeightedRoundRobin,
    HealthBased,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceDiscoveryState {
    pub services: HashMap<Uuid, ServiceInfo>,
    pub health_checks: Vec<HealthCheck>,
    pub metrics: HashMap<Uuid, ServiceMetrics>,
    pub load_balancer_config: LoadBalancerConfig,
    pub redis_client: Option<Arc<ConnectionManager>>,
}

impl Default for ServiceDiscoveryState {
    fn default() -> Self {
        Self {
            services: HashMap::new(),
            health_checks: Vec::new(),
            metrics: HashMap::new(),
            load_balancer_config: LoadBalancerConfig {
                strategy: LoadBalancingStrategy::RoundRobin,
                health_check_interval: 30,
                unhealthy_threshold: 3,
                healthy_threshold: 2,
                timeout: 5,
            },
            redis_client: None,
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "service_discovery=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Initialize Redis connection
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    let redis_client = match RedisClient::open(redis_url) {
        Ok(client) => {
            match client.get_connection_manager().await {
                Ok(conn) => Some(Arc::new(conn)),
                Err(e) => {
                    warn!("Failed to connect to Redis: {}. Continuing without caching.", e);
                    None
                }
            }
        }
        Err(e) => {
            warn!("Failed to create Redis client: {}. Continuing without caching.", e);
            None
        }
    };

    let state = Arc::new(RwLock::new(ServiceDiscoveryState {
        redis_client,
        ..Default::default()
    }));

    // Start health monitoring task
    let state_clone = state.clone();
    tokio::spawn(async move {
        health_monitoring_task(state_clone).await;
    });

    // Start metrics collection task
    let state_clone = state.clone();
    tokio::spawn(async move {
        metrics_collection_task(state_clone).await;
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/services", get(list_services).post(register_service))
        .route("/api/v1/services/:id", get(get_service).put(update_service).delete(unregister_service))
        .route("/api/v1/services/:id/health", get(get_service_health).post(update_service_health))
        .route("/api/v1/services/:id/metrics", get(get_service_metrics).post(update_service_metrics))
        .route("/api/v1/load-balancer/config", get(get_load_balancer_config).put(update_load_balancer_config))
        .route("/api/v1/load-balancer/route/:service_name", get(route_request))
        .route("/api/v1/discovery/endpoints", get(get_discovery_endpoints))
        .layer(CorsLayer::new().allow_origin(tower_http::cors::Any).allow_methods(tower_http::cors::Any).allow_headers(tower_http::cors::Any))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8083").await?;
    info!("Service Discovery running on port 8083");
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "service-discovery",
        "timestamp": Utc::now().to_rfc3339()
    }))
}

// Service Management
async fn list_services(State(state): State<Arc<RwLock<ServiceDiscoveryState>>>) -> Json<Vec<ServiceInfo>> {
    let state = state.read().await;
    Json(state.services.values().cloned().collect())
}

async fn register_service(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Json(mut service): Json<ServiceInfo>,
) -> Result<Json<ServiceInfo>, StatusCode> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    service.id = id;
    service.status = ServiceStatus::Starting;
    service.created_at = now;
    service.updated_at = now;

    let mut state = state.write().await;
    state.services.insert(id, service.clone());
    
    info!("Registered service: {} ({}) at {}:{}", service.name, id, service.host, service.port);
    Ok(Json(service))
}

async fn get_service(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ServiceInfo>, StatusCode> {
    let state = state.read().await;
    state.services.get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn update_service(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Path(id): Path<Uuid>,
    Json(service): Json<ServiceInfo>,
) -> Result<Json<ServiceInfo>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(existing) = state.services.get_mut(&id) {
        existing.updated_at = Utc::now();
        existing.host = service.host;
        existing.port = service.port;
        existing.version = service.version;
        existing.metadata = service.metadata;
        
        info!("Updated service: {} ({})", existing.name, id);
        Ok(Json(existing.clone()))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn unregister_service(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    let mut state = state.write().await;
    
    if let Some(service) = state.services.remove(&id) {
        info!("Unregistered service: {} ({})", service.name, id);
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

// Health Management
async fn get_service_health(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<HealthCheck>>, StatusCode> {
    let state = state.read().await;
    
    if !state.services.contains_key(&id) {
        return Err(StatusCode::NOT_FOUND);
    }
    
    let health_checks: Vec<HealthCheck> = state.health_checks
        .iter()
        .filter(|hc| hc.service_id == id)
        .cloned()
        .collect();
    
    Ok(Json(health_checks))
}

async fn update_service_health(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Path(id): Path<Uuid>,
    Json(health_check): Json<HealthCheck>,
) -> Result<Json<HealthCheck>, StatusCode> {
    let mut state = state.write().await;
    
    if !state.services.contains_key(&id) {
        return Err(StatusCode::NOT_FOUND);
    }
    
    // Update service status
    if let Some(service) = state.services.get_mut(&id) {
        service.status = health_check.status.clone();
        service.last_health_check = Some(health_check.timestamp);
        service.updated_at = Utc::now();
    }
    
    // Store health check
    state.health_checks.push(health_check.clone());
    
    // Keep only last 100 health checks per service
    state.health_checks.retain(|hc| {
        state.health_checks.iter()
            .filter(|h| h.service_id == hc.service_id)
            .count() <= 100
    });
    
    Ok(Json(health_check))
}

// Metrics Management
async fn get_service_metrics(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<ServiceMetrics>, StatusCode> {
    let state = state.read().await;
    state.metrics.get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn update_service_metrics(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Path(id): Path<Uuid>,
    Json(metrics): Json<ServiceMetrics>,
) -> Result<Json<ServiceMetrics>, StatusCode> {
    let mut state = state.write().await;
    
    if !state.services.contains_key(&id) {
        return Err(StatusCode::NOT_FOUND);
    }
    
    state.metrics.insert(id, metrics.clone());
    Ok(Json(metrics))
}

// Load Balancer Management
async fn get_load_balancer_config(State(state): State<Arc<RwLock<ServiceDiscoveryState>>>) -> Json<LoadBalancerConfig> {
    let state = state.read().await;
    Json(state.load_balancer_config.clone())
}

async fn update_load_balancer_config(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Json(config): Json<LoadBalancerConfig>,
) -> Json<LoadBalancerConfig> {
    let mut state = state.write().await;
    state.load_balancer_config = config.clone();
    Json(config)
}

async fn route_request(
    State(state): State<Arc<RwLock<ServiceDiscoveryState>>>,
    Path(service_name): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let state = state.read().await;
    
    // Find healthy services with the given name
    let healthy_services: Vec<&ServiceInfo> = state.services
        .values()
        .filter(|s| s.name == service_name && s.status == ServiceStatus::Healthy)
        .collect();
    
    if healthy_services.is_empty() {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }
    
    // Simple round-robin for now
    let selected_service = healthy_services[0];
    
    Ok(Json(serde_json::json!({
        "service_id": selected_service.id,
        "host": selected_service.host,
        "port": selected_service.port,
        "url": format!("http://{}:{}", selected_service.host, selected_service.port)
    })))
}

async fn get_discovery_endpoints(State(state): State<Arc<RwLock<ServiceDiscoveryState>>>) -> Json<serde_json::Value> {
    let state = state.read().await;
    
    let endpoints: HashMap<String, serde_json::Value> = state.services
        .values()
        .map(|service| {
            (service.name.clone(), serde_json::json!({
                "id": service.id,
                "host": service.host,
                "port": service.port,
                "status": service.status,
                "version": service.version,
                "url": format!("http://{}:{}", service.host, service.port)
            }))
        })
        .collect();
    
    Json(serde_json::json!({
        "endpoints": endpoints,
        "total_services": state.services.len(),
        "healthy_services": state.services.values().filter(|s| s.status == ServiceStatus::Healthy).count()
    }))
}

// Background Tasks
async fn health_monitoring_task(state: Arc<RwLock<ServiceDiscoveryState>>) {
    let mut interval = tokio::time::interval(Duration::from_secs(30));
    
    loop {
        interval.tick().await;
        
        let services_to_check: Vec<ServiceInfo> = {
            let state = state.read().await;
            state.services.values().cloned().collect()
        };
        
        for service in services_to_check {
            let state_clone = state.clone();
            tokio::spawn(async move {
                check_service_health(service, state_clone).await;
            });
        }
    }
}

async fn check_service_health(service: ServiceInfo, state: Arc<RwLock<ServiceDiscoveryState>>) {
    let start_time = Instant::now();
    let health_url = format!("http://{}:{}{}", service.host, service.port, service.health_endpoint);
    
    match reqwest::get(&health_url).await {
        Ok(response) => {
            let response_time = start_time.elapsed().as_millis() as u64;
            let status = if response.status().is_success() {
                ServiceStatus::Healthy
            } else {
                ServiceStatus::Unhealthy
            };
            
            let health_check = HealthCheck {
                service_id: service.id,
                status,
                response_time_ms: response_time,
                error_message: None,
                timestamp: Utc::now(),
                metrics: HashMap::new(),
            };
            
            let mut state = state.write().await;
            if let Some(service_info) = state.services.get_mut(&service.id) {
                service_info.status = status;
                service_info.last_health_check = Some(Utc::now());
                service_info.updated_at = Utc::now();
            }
            state.health_checks.push(health_check);
        }
        Err(e) => {
            let response_time = start_time.elapsed().as_millis() as u64;
            let health_check = HealthCheck {
                service_id: service.id,
                status: ServiceStatus::Unhealthy,
                response_time_ms: response_time,
                error_message: Some(e.to_string()),
                timestamp: Utc::now(),
                metrics: HashMap::new(),
            };
            
            let mut state = state.write().await;
            if let Some(service_info) = state.services.get_mut(&service.id) {
                service_info.status = ServiceStatus::Unhealthy;
                service_info.last_health_check = Some(Utc::now());
                service_info.updated_at = Utc::now();
            }
            state.health_checks.push(health_check);
        }
    }
}

async fn metrics_collection_task(state: Arc<RwLock<ServiceDiscoveryState>>) {
    let mut interval = tokio::time::interval(Duration::from_secs(60));
    
    loop {
        interval.tick().await;
        
        // Collect system metrics for all services
        let services: Vec<Uuid> = {
            let state = state.read().await;
            state.services.keys().cloned().collect()
        };
        
        for service_id in services {
            let state_clone = state.clone();
            tokio::spawn(async move {
                collect_service_metrics(service_id, state_clone).await;
            });
        }
    }
}

async fn collect_service_metrics(service_id: Uuid, state: Arc<RwLock<ServiceDiscoveryState>>) {
    // This would typically collect real metrics from the service
    // For now, we'll simulate some basic metrics
    let metrics = ServiceMetrics {
        service_id,
        cpu_usage: rand::random::<f64>() * 100.0,
        memory_usage: rand::random::<f64>() * 100.0,
        request_count: rand::random::<u64>() % 1000,
        error_count: rand::random::<u64>() % 10,
        response_time_avg: rand::random::<f64>() * 100.0,
        timestamp: Utc::now(),
    };
    
    let mut state = state.write().await;
    state.metrics.insert(service_id, metrics);
}
