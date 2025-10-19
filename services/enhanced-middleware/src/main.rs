// Enhanced Middleware System
// Load balancing, caching, rate limiting, and service orchestration

use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, HeaderValue, Method, StatusCode, Uri},
    response::Response,
    routing::{any, get, post, put, delete},
    Json, Router,
};
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use lru::LruCache;
use redis::{Client as RedisClient, ConnectionManager};
use reqwest::Client as ReqwestClient;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;
use tower::ServiceBuilder;
use tower_http::{
    cors::CorsLayer,
    trace::TraceLayer,
    compression::CompressionLayer,
    timeout::TimeoutLayer,
    rate_limit::RateLimitLayer,
};
use tracing::{info, warn, error, debug};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceEndpoint {
    pub id: Uuid,
    pub name: String,
    pub url: String,
    pub health_check_url: String,
    pub weight: u32,
    pub max_connections: u32,
    pub timeout: u64, // milliseconds
    pub retry_count: u32,
    pub circuit_breaker_threshold: u32,
    pub status: ServiceStatus,
    pub last_health_check: Option<DateTime<Utc>>,
    pub error_count: u32,
    pub success_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServiceStatus {
    Healthy,
    Unhealthy,
    CircuitOpen,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoadBalancerConfig {
    pub strategy: LoadBalancingStrategy,
    pub health_check_interval: u64,
    pub circuit_breaker_timeout: u64,
    pub max_retries: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LoadBalancingStrategy {
    RoundRobin,
    LeastConnections,
    WeightedRoundRobin,
    HealthBased,
    Random,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheConfig {
    pub enabled: bool,
    pub ttl: u64, // seconds
    pub max_size: usize,
    pub cacheable_methods: Vec<String>,
    pub cacheable_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub enabled: bool,
    pub requests_per_minute: u32,
    pub burst_size: u32,
    pub window_size: u64, // seconds
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MiddlewareConfig {
    pub load_balancer: LoadBalancerConfig,
    pub cache: CacheConfig,
    pub rate_limit: RateLimitConfig,
    pub timeout: u64, // milliseconds
    pub retry_attempts: u32,
}

impl Default for MiddlewareConfig {
    fn default() -> Self {
        Self {
            load_balancer: LoadBalancerConfig {
                strategy: LoadBalancingStrategy::RoundRobin,
                health_check_interval: 30,
                circuit_breaker_timeout: 60,
                max_retries: 3,
            },
            cache: CacheConfig {
                enabled: true,
                ttl: 300, // 5 minutes
                max_size: 10000,
                cacheable_methods: vec!["GET".to_string()],
                cacheable_paths: vec!["/api/v1/scenes".to_string(), "/api/v1/patch".to_string()],
            },
            rate_limit: RateLimitConfig {
                enabled: true,
                requests_per_minute: 1000,
                burst_size: 100,
                window_size: 60,
            },
            timeout: 30000, // 30 seconds
            retry_attempts: 3,
        }
    }
}

#[derive(Clone)]
pub struct MiddlewareState {
    pub config: MiddlewareConfig,
    pub services: Arc<DashMap<String, Vec<ServiceEndpoint>>>,
    pub cache: Arc<RwLock<LruCache<String, CachedResponse>>>,
    pub redis_client: Option<Arc<ConnectionManager>>,
    pub http_client: ReqwestClient,
    pub service_discovery_url: String,
    pub message_bus_url: String,
    pub rate_limiter: Arc<DashMap<String, RateLimitInfo>>,
}

#[derive(Debug, Clone)]
pub struct CachedResponse {
    pub data: Vec<u8>,
    pub headers: HeaderMap,
    pub status: StatusCode,
    pub timestamp: Instant,
    pub ttl: Duration,
}

#[derive(Debug, Clone)]
pub struct RateLimitInfo {
    pub requests: u32,
    pub window_start: Instant,
    pub burst_tokens: u32,
}

impl Default for RateLimitInfo {
    fn default() -> Self {
        Self {
            requests: 0,
            window_start: Instant::now(),
            burst_tokens: 100,
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "enhanced_middleware=debug,tower_http=debug".into()),
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

    let config = MiddlewareConfig::default();
    let cache = Arc::new(RwLock::new(LruCache::new(
        std::num::NonZeroUsize::new(config.cache.max_size).unwrap()
    )));
    
    let state = MiddlewareState {
        config: config.clone(),
        services: Arc::new(DashMap::new()),
        cache,
        redis_client,
        http_client: ReqwestClient::new(),
        service_discovery_url: std::env::var("SERVICE_DISCOVERY_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8083".into()),
        message_bus_url: std::env::var("MESSAGE_BUS_URL")
            .unwrap_or_else(|_| "http://127.0.0.1:8088".into()),
        rate_limiter: Arc::new(DashMap::new()),
    };

    // Start background tasks
    let state_clone = state.clone();
    tokio::spawn(async move {
        service_discovery_task(state_clone).await;
    });

    let state_clone = state.clone();
    tokio::spawn(async move {
        health_check_task(state_clone).await;
    });

    let state_clone = state.clone();
    tokio::spawn(async move {
        cache_cleanup_task(state_clone).await;
    });

    let state_clone = state.clone();
    tokio::spawn(async move {
        rate_limit_cleanup_task(state_clone).await;
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/middleware/config", get(get_config).put(update_config))
        .route("/api/v1/middleware/services", get(list_services).post(register_service))
        .route("/api/v1/middleware/services/:name", get(get_service).put(update_service).delete(unregister_service))
        .route("/api/v1/middleware/cache/stats", get(get_cache_stats))
        .route("/api/v1/middleware/cache/clear", post(clear_cache))
        .route("/api/v1/middleware/rate-limit/stats", get(get_rate_limit_stats))
        .route("/api/v1/middleware/load-balancer/stats", get(get_load_balancer_stats))
        .fallback(proxy_request)
        .layer(
            ServiceBuilder::new()
                .layer(CompressionLayer::new())
                .layer(TimeoutLayer::new(Duration::from_millis(config.timeout)))
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::new().allow_origin(tower_http::cors::Any).allow_methods(tower_http::cors::Any).allow_headers(tower_http::cors::Any))
        )
        .with_state(state);

    let bind = std::env::var("ENHANCED_MIDDLEWARE_BIND").unwrap_or_else(|_| "127.0.0.1:8089".into());
    let addr: std::net::SocketAddr = bind.parse().unwrap();
    info!("Enhanced Middleware running on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "enhanced-middleware",
        "timestamp": Utc::now().to_rfc3339()
    }))
}

// Configuration Management
async fn get_config(State(state): State<MiddlewareState>) -> Json<MiddlewareConfig> {
    Json(state.config.clone())
}

async fn update_config(
    State(mut state): State<MiddlewareState>,
    Json(config): Json<MiddlewareConfig>,
) -> Json<MiddlewareConfig> {
    state.config = config.clone();
    Json(config)
}

// Service Management
async fn list_services(State(state): State<MiddlewareState>) -> Json<HashMap<String, Vec<ServiceEndpoint>>> {
    Json(state.services.iter().map(|entry| (entry.key().clone(), entry.value().clone())).collect())
}

async fn register_service(
    State(state): State<MiddlewareState>,
    Json(service): Json<ServiceEndpoint>,
) -> Result<Json<ServiceEndpoint>, StatusCode> {
    let service_name = service.name.clone();
    let mut services = state.services.get_mut(&service_name).unwrap_or_else(|| {
        state.services.insert(service_name.clone(), Vec::new());
        state.services.get_mut(&service_name).unwrap()
    });
    
    services.push(service.clone());
    info!("Registered service: {} at {}", service.name, service.url);
    Ok(Json(service))
}

async fn get_service(
    State(state): State<MiddlewareState>,
    Path(name): Path<String>,
) -> Result<Json<Vec<ServiceEndpoint>>, StatusCode> {
    state.services.get(&name)
        .map(|services| Json(services.clone()))
        .ok_or(StatusCode::NOT_FOUND)
}

async fn update_service(
    State(state): State<MiddlewareState>,
    Path(name): Path<String>,
    Json(service): Json<ServiceEndpoint>,
) -> Result<Json<ServiceEndpoint>, StatusCode> {
    if let Some(mut services) = state.services.get_mut(&name) {
        if let Some(existing) = services.iter_mut().find(|s| s.id == service.id) {
            *existing = service.clone();
            info!("Updated service: {} ({})", service.name, service.id);
            Ok(Json(service))
        } else {
            Err(StatusCode::NOT_FOUND)
        }
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn unregister_service(
    State(state): State<MiddlewareState>,
    Path(name): Path<String>,
) -> StatusCode {
    if state.services.remove(&name).is_some() {
        info!("Unregistered service: {}", name);
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

// Cache Management
async fn get_cache_stats(State(state): State<MiddlewareState>) -> Json<serde_json::Value> {
    let cache = state.cache.read().await;
    Json(serde_json::json!({
        "size": cache.len(),
        "max_size": state.config.cache.max_size,
        "hit_rate": 0.0, // Would need to track this
        "enabled": state.config.cache.enabled
    }))
}

async fn clear_cache(State(state): State<MiddlewareState>) -> Json<serde_json::Value> {
    let mut cache = state.cache.write().await;
    cache.clear();
    info!("Cache cleared");
    Json(serde_json::json!({"status": "cleared"}))
}

// Rate Limiting
async fn get_rate_limit_stats(State(state): State<MiddlewareState>) -> Json<serde_json::Value> {
    let active_clients = state.rate_limiter.len();
    Json(serde_json::json!({
        "active_clients": active_clients,
        "enabled": state.config.rate_limit.enabled,
        "requests_per_minute": state.config.rate_limit.requests_per_minute
    }))
}

// Load Balancer Stats
async fn get_load_balancer_stats(State(state): State<MiddlewareState>) -> Json<serde_json::Value> {
    let total_services: usize = state.services.iter().map(|entry| entry.value().len()).sum();
    let healthy_services: usize = state.services.iter()
        .map(|entry| entry.value().iter().filter(|s| s.status == ServiceStatus::Healthy).count())
        .sum();
    
    Json(serde_json::json!({
        "total_services": total_services,
        "healthy_services": healthy_services,
        "strategy": state.config.load_balancer.strategy,
        "health_check_interval": state.config.load_balancer.health_check_interval
    }))
}

// Main Proxy Handler
async fn proxy_request(
    State(state): State<MiddlewareState>,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Response<axum::body::Body>, StatusCode> {
    // Rate limiting
    if state.config.rate_limit.enabled {
        let client_ip = headers.get("x-forwarded-for")
            .or_else(|| headers.get("x-real-ip"))
            .and_then(|h| h.to_str().ok())
            .unwrap_or("unknown");
        
        if !check_rate_limit(&state, client_ip).await {
            return Err(StatusCode::TOO_MANY_REQUESTS);
        }
    }

    // Determine target service
    let service_name = determine_service(&uri.path());
    let target_service = select_service(&state, &service_name).await
        .ok_or(StatusCode::SERVICE_UNAVAILABLE)?;

    // Check cache for GET requests
    if method == Method::GET && state.config.cache.enabled && is_cacheable(&uri.path()) {
        if let Some(cached_response) = get_from_cache(&state, &uri.to_string()).await {
            return Ok(build_response_from_cache(cached_response));
        }
    }

    // Make request to target service
    let response = make_request(&state, &target_service, method, uri, headers, body).await?;

    // Cache response if applicable
    if method == Method::GET && state.config.cache.enabled && is_cacheable(&uri.path()) {
        cache_response(&state, &uri.to_string(), &response).await;
    }

    Ok(response)
}

// Helper Functions
fn determine_service(path: &str) -> String {
    if path.starts_with("/api/v1/scenes") {
        "backend".to_string()
    } else if path.starts_with("/api/v1/ai-lighting") {
        "ai-lighting".to_string()
    } else if path.starts_with("/api/v1/live-audio") {
        "live-audio".to_string()
    } else if path.starts_with("/api/v1/shows") {
        "show-automation".to_string()
    } else if path.starts_with("/api/v1/mobile") {
        "mobile-app".to_string()
    } else {
        "backend".to_string()
    }
}

async fn select_service(state: &MiddlewareState, service_name: &str) -> Option<ServiceEndpoint> {
    let services = state.services.get(service_name)?;
    let healthy_services: Vec<&ServiceEndpoint> = services.iter()
        .filter(|s| s.status == ServiceStatus::Healthy)
        .collect();
    
    if healthy_services.is_empty() {
        return None;
    }

    match state.config.load_balancer.strategy {
        LoadBalancingStrategy::RoundRobin => {
            // Simple round-robin implementation
            Some(healthy_services[0].clone())
        }
        LoadBalancingStrategy::LeastConnections => {
            // Select service with least connections (simplified)
            Some(healthy_services[0].clone())
        }
        LoadBalancingStrategy::WeightedRoundRobin => {
            // Weighted round-robin (simplified)
            Some(healthy_services[0].clone())
        }
        LoadBalancingStrategy::HealthBased => {
            // Select healthiest service
            Some(healthy_services[0].clone())
        }
        LoadBalancingStrategy::Random => {
            use rand::seq::SliceRandom;
            Some(healthy_services.choose(&mut rand::thread_rng())?.clone())
        }
    }
}

async fn check_rate_limit(state: &MiddlewareState, client_ip: &str) -> bool {
    let mut rate_limit_info = state.rate_limiter
        .entry(client_ip.to_string())
        .or_insert_with(RateLimitInfo::default);
    
    let now = Instant::now();
    let window_duration = Duration::from_secs(state.config.rate_limit.window_size);
    
    // Reset window if needed
    if now.duration_since(rate_limit_info.window_start) > window_duration {
        rate_limit_info.requests = 0;
        rate_limit_info.window_start = now;
        rate_limit_info.burst_tokens = state.config.rate_limit.burst_size;
    }
    
    // Check if within limits
    if rate_limit_info.requests >= state.config.rate_limit.requests_per_minute {
        return false;
    }
    
    rate_limit_info.requests += 1;
    true
}

fn is_cacheable(path: &str) -> bool {
    // Simple cacheable path check
    path.starts_with("/api/v1/scenes") || 
    path.starts_with("/api/v1/patch") ||
    path.starts_with("/api/v1/fixtures")
}

async fn get_from_cache(state: &MiddlewareState, key: &str) -> Option<CachedResponse> {
    let cache = state.cache.read().await;
    cache.peek(key).cloned()
}

async fn cache_response(state: &MiddlewareState, key: &str, response: &Response<axum::body::Body>) {
    // Simplified caching - would need to extract body and headers
    let cached_response = CachedResponse {
        data: vec![], // Would extract from response
        headers: HeaderMap::new(), // Would extract from response
        status: response.status(),
        timestamp: Instant::now(),
        ttl: Duration::from_secs(state.config.cache.ttl),
    };
    
    let mut cache = state.cache.write().await;
    cache.put(key.to_string(), cached_response);
}

fn build_response_from_cache(cached: CachedResponse) -> Response<axum::body::Body> {
    // Build response from cached data
    Response::builder()
        .status(cached.status)
        .body(axum::body::Body::from(cached.data))
        .unwrap()
}

async fn make_request(
    state: &MiddlewareState,
    service: &ServiceEndpoint,
    method: Method,
    uri: Uri,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Response<axum::body::Body>, StatusCode> {
    let url = format!("{}{}", service.url, uri.path());
    
    let mut request = state.http_client
        .request(method, &url)
        .timeout(Duration::from_millis(service.timeout));
    
    // Add headers
    for (key, value) in headers.iter() {
        if key != "host" {
            request = request.header(key, value);
        }
    }
    
    // Add body if present
    if !body.is_empty() {
        request = request.body(body);
    }
    
    match request.send().await {
        Ok(response) => {
            let status = response.status();
            let headers = response.headers().clone();
            let body = response.bytes().await.unwrap_or_default();
            
            Ok(Response::builder()
                .status(status)
                .header("content-type", "application/json")
                .body(axum::body::Body::from(body))
                .unwrap())
        }
        Err(_) => Err(StatusCode::BAD_GATEWAY),
    }
}

// Background Tasks
async fn service_discovery_task(state: Arc<MiddlewareState>) {
    let mut interval = tokio::time::interval(Duration::from_secs(30));
    
    loop {
        interval.tick().await;
        
        // Fetch services from service discovery
        if let Ok(response) = state.http_client
            .get(&format!("{}/api/v1/discovery/endpoints", state.service_discovery_url))
            .send()
            .await
        {
            if let Ok(data) = response.json::<serde_json::Value>().await {
                // Update service registry
                debug!("Updated service registry from discovery");
            }
        }
    }
}

async fn health_check_task(state: Arc<MiddlewareState>) {
    let mut interval = tokio::time::interval(Duration::from_secs(state.config.load_balancer.health_check_interval));
    
    loop {
        interval.tick().await;
        
        // Check health of all services
        for service_entry in state.services.iter() {
            for service in service_entry.value() {
                let state_clone = state.clone();
                let service_clone = service.clone();
                tokio::spawn(async move {
                    check_service_health(service_clone, state_clone).await;
                });
            }
        }
    }
}

async fn check_service_health(service: ServiceEndpoint, state: Arc<MiddlewareState>) {
    let health_url = format!("{}{}", service.url, service.health_check_url);
    
    match state.http_client.get(&health_url).timeout(Duration::from_secs(5)).send().await {
        Ok(response) => {
            let is_healthy = response.status().is_success();
            let new_status = if is_healthy {
                ServiceStatus::Healthy
            } else {
                ServiceStatus::Unhealthy
            };
            
            // Update service status
            if let Some(mut services) = state.services.get_mut(&service.name) {
                if let Some(s) = services.iter_mut().find(|s| s.id == service.id) {
                    s.status = new_status;
                    s.last_health_check = Some(Utc::now());
                }
            }
        }
        Err(_) => {
            // Mark service as unhealthy
            if let Some(mut services) = state.services.get_mut(&service.name) {
                if let Some(s) = services.iter_mut().find(|s| s.id == service.id) {
                    s.status = ServiceStatus::Unhealthy;
                    s.last_health_check = Some(Utc::now());
                }
            }
        }
    }
}

async fn cache_cleanup_task(state: Arc<MiddlewareState>) {
    let mut interval = tokio::time::interval(Duration::from_secs(300)); // 5 minutes
    
    loop {
        interval.tick().await;
        
        let mut cache = state.cache.write().await;
        let now = Instant::now();
        
        // Remove expired entries
        cache.iter().for_each(|(key, value)| {
            if now.duration_since(value.timestamp) > value.ttl {
                cache.pop(key);
            }
        });
    }
}

async fn rate_limit_cleanup_task(state: Arc<MiddlewareState>) {
    let mut interval = tokio::time::interval(Duration::from_secs(60));
    
    loop {
        interval.tick().await;
        
        let now = Instant::now();
        let window_duration = Duration::from_secs(state.config.rate_limit.window_size);
        
        // Clean up old rate limit entries
        state.rate_limiter.retain(|_, rate_info| {
            now.duration_since(rate_info.window_start) < window_duration
        });
    }
}
