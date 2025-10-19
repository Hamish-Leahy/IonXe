// Message Bus System for Inter-Service Communication
// Event streaming, pub/sub, and message routing between services

use axum::{
    extract::{Path, Query, State, WebSocketUpgrade},
    http::StatusCode,
    response::Json,
    routing::{get, post, put, delete},
    Router,
};
use chrono::{DateTime, Utc};
use redis::{Client as RedisClient, ConnectionManager, StreamReadOptions, StreamReadReply};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    sync::Arc,
    time::Duration,
};
use tokio::sync::{broadcast, RwLock};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing::{info, warn, error, debug};
use uuid::Uuid;
use futures_util::{SinkExt, StreamExt};
use tokio_stream::StreamExt as TokioStreamExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: Uuid,
    pub topic: String,
    pub event_type: String,
    pub payload: serde_json::Value,
    pub source_service: String,
    pub target_service: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub ttl: Option<u64>, // Time to live in seconds
    pub priority: MessagePriority,
    pub correlation_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MessagePriority {
    Low,
    Normal,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub id: Uuid,
    pub service_name: String,
    pub topics: Vec<String>,
    pub event_types: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageBusState {
    pub subscriptions: HashMap<Uuid, Subscription>,
    pub message_history: Vec<Message>,
    pub redis_client: Option<Arc<ConnectionManager>>,
    pub broadcast_sender: broadcast::Sender<Message>,
    pub service_connections: HashMap<String, broadcast::Sender<Message>>,
}

impl Default for MessageBusState {
    fn default() -> Self {
        let (broadcast_sender, _) = broadcast::channel(1000);
        Self {
            subscriptions: HashMap::new(),
            message_history: Vec::new(),
            redis_client: None,
            broadcast_sender,
            service_connections: HashMap::new(),
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "message_bus=debug,tower_http=debug".into()),
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
                    warn!("Failed to connect to Redis: {}. Continuing without persistence.", e);
                    None
                }
            }
        }
        Err(e) => {
            warn!("Failed to create Redis client: {}. Continuing without persistence.", e);
            None
        }
    };

    let (broadcast_sender, _) = broadcast::channel(1000);
    let state = Arc::new(RwLock::new(MessageBusState {
        redis_client,
        broadcast_sender,
        ..Default::default()
    }));

    // Start message processing task
    let state_clone = state.clone();
    tokio::spawn(async move {
        message_processing_task(state_clone).await;
    });

    // Start Redis stream consumer task
    let state_clone = state.clone();
    tokio::spawn(async move {
        redis_stream_consumer(state_clone).await;
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/v1/messages", post(publish_message))
        .route("/api/v1/messages/history", get(get_message_history))
        .route("/api/v1/subscriptions", get(list_subscriptions).post(create_subscription))
        .route("/api/v1/subscriptions/:id", get(get_subscription).put(update_subscription).delete(delete_subscription))
        .route("/api/v1/events/stream", get(stream_events))
        .route("/api/v1/events/websocket", get(websocket_handler))
        .route("/api/v1/topics", get(list_topics))
        .route("/api/v1/topics/:topic/messages", get(get_topic_messages))
        .layer(CorsLayer::new().allow_origin(tower_http::cors::Any).allow_methods(tower_http::cors::Any).allow_headers(tower_http::cors::Any))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8088").await?;
    info!("Message Bus running on port 8088");
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "message-bus",
        "timestamp": Utc::now().to_rfc3339()
    }))
}

// Message Publishing
async fn publish_message(
    State(state): State<Arc<RwLock<MessageBusState>>>,
    Json(mut message): Json<Message>,
) -> Result<Json<Message>, StatusCode> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    message.id = id;
    message.timestamp = now;

    let mut state = state.write().await;
    
    // Store in history
    state.message_history.push(message.clone());
    
    // Keep only last 1000 messages
    if state.message_history.len() > 1000 {
        state.message_history.drain(0..state.message_history.len() - 1000);
    }
    
    // Broadcast to subscribers
    let _ = state.broadcast_sender.send(message.clone());
    
    // Store in Redis if available
    if let Some(redis) = &state.redis_client {
        if let Err(e) = store_message_in_redis(redis, &message).await {
            warn!("Failed to store message in Redis: {}", e);
        }
    }
    
    info!("Published message: {} on topic: {}", message.event_type, message.topic);
    Ok(Json(message))
}

async fn get_message_history(
    State(state): State<Arc<RwLock<MessageBusState>>>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<Vec<Message>> {
    let state = state.read().await;
    let limit = params.get("limit")
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(100);
    
    let topic_filter = params.get("topic");
    let service_filter = params.get("service");
    
    let mut messages: Vec<Message> = state.message_history
        .iter()
        .filter(|msg| {
            if let Some(topic) = topic_filter {
                msg.topic == *topic
            } else {
                true
            }
        })
        .filter(|msg| {
            if let Some(service) = service_filter {
                msg.source_service == *service
            } else {
                true
            }
        })
        .cloned()
        .collect();
    
    messages.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    messages.truncate(limit);
    
    Json(messages)
}

// Subscription Management
async fn list_subscriptions(State(state): State<Arc<RwLock<MessageBusState>>>) -> Json<Vec<Subscription>> {
    let state = state.read().await;
    Json(state.subscriptions.values().cloned().collect())
}

async fn create_subscription(
    State(state): State<Arc<RwLock<MessageBusState>>>,
    Json(mut subscription): Json<Subscription>,
) -> Result<Json<Subscription>, StatusCode> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    subscription.id = id;
    subscription.created_at = now;
    subscription.active = true;

    let mut state = state.write().await;
    state.subscriptions.insert(id, subscription.clone());
    
    // Create service-specific broadcast channel
    let (service_sender, _) = broadcast::channel(100);
    state.service_connections.insert(subscription.service_name.clone(), service_sender);
    
    info!("Created subscription: {} for service: {}", id, subscription.service_name);
    Ok(Json(subscription))
}

async fn get_subscription(
    State(state): State<Arc<RwLock<MessageBusState>>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Subscription>, StatusCode> {
    let state = state.read().await;
    state.subscriptions.get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn update_subscription(
    State(state): State<Arc<RwLock<MessageBusState>>>,
    Path(id): Path<Uuid>,
    Json(subscription): Json<Subscription>,
) -> Result<Json<Subscription>, StatusCode> {
    let mut state = state.write().await;
    
    if let Some(existing) = state.subscriptions.get_mut(&id) {
        existing.topics = subscription.topics;
        existing.event_types = subscription.event_types;
        existing.active = subscription.active;
        
        info!("Updated subscription: {}", id);
        Ok(Json(existing.clone()))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

async fn delete_subscription(
    State(state): State<Arc<RwLock<MessageBusState>>>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    let mut state = state.write().await;
    
    if let Some(subscription) = state.subscriptions.remove(&id) {
        state.service_connections.remove(&subscription.service_name);
        info!("Deleted subscription: {}", id);
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}

// Event Streaming
async fn stream_events(
    State(state): State<Arc<RwLock<MessageBusState>>>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<serde_json::Value> {
    let state = state.read().await;
    
    let topic_filter = params.get("topic");
    let service_filter = params.get("service");
    let event_type_filter = params.get("event_type");
    
    let recent_messages: Vec<Message> = state.message_history
        .iter()
        .filter(|msg| {
            if let Some(topic) = topic_filter {
                msg.topic == *topic
            } else {
                true
            }
        })
        .filter(|msg| {
            if let Some(service) = service_filter {
                msg.source_service == *service
            } else {
                true
            }
        })
        .filter(|msg| {
            if let Some(event_type) = event_type_filter {
                msg.event_type == *event_type
            } else {
                true
            }
        })
        .cloned()
        .collect();
    
    Json(serde_json::json!({
        "messages": recent_messages,
        "total_count": recent_messages.len(),
        "timestamp": Utc::now().to_rfc3339()
    }))
}

async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<RwLock<MessageBusState>>>,
) -> axum::response::Response {
    ws.on_upgrade(|socket| websocket_connection(socket, state))
}

async fn websocket_connection(socket: axum::extract::ws::WebSocket, state: Arc<RwLock<MessageBusState>>) {
    let (mut sender, mut receiver) = socket.split();
    
    // Subscribe to broadcast channel
    let mut rx = {
        let state = state.read().await;
        state.broadcast_sender.subscribe()
    };
    
    // Send messages to WebSocket client
    let send_task = tokio::spawn(async move {
        while let Ok(message) = rx.recv().await {
            if let Ok(json) = serde_json::to_string(&message) {
                if sender.send(axum::extract::ws::Message::Text(json)).await.is_err() {
                    break;
                }
            }
        }
    });
    
    // Handle incoming WebSocket messages
    let recv_task = tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            if let Ok(axum::extract::ws::Message::Text(text)) = msg {
                // Handle incoming message (e.g., subscription requests)
                debug!("Received WebSocket message: {}", text);
            }
        }
    });
    
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }
}

// Topic Management
async fn list_topics(State(state): State<Arc<RwLock<MessageBusState>>>) -> Json<Vec<String>> {
    let state = state.read().await;
    
    let mut topics: std::collections::HashSet<String> = std::collections::HashSet::new();
    for message in &state.message_history {
        topics.insert(message.topic.clone());
    }
    
    let mut topic_list: Vec<String> = topics.into_iter().collect();
    topic_list.sort();
    
    Json(topic_list)
}

async fn get_topic_messages(
    State(state): State<Arc<RwLock<MessageBusState>>>,
    Path(topic): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<Vec<Message>> {
    let state = state.read().await;
    let limit = params.get("limit")
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(100);
    
    let mut messages: Vec<Message> = state.message_history
        .iter()
        .filter(|msg| msg.topic == topic)
        .cloned()
        .collect();
    
    messages.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    messages.truncate(limit);
    
    Json(messages)
}

// Background Tasks
async fn message_processing_task(state: Arc<RwLock<MessageBusState>>) {
    let mut interval = tokio::time::interval(Duration::from_secs(60));
    
    loop {
        interval.tick().await;
        
        // Clean up expired messages
        let now = Utc::now();
        let mut state = state.write().await;
        
        state.message_history.retain(|msg| {
            if let Some(ttl) = msg.ttl {
                let expiry = msg.timestamp + chrono::Duration::seconds(ttl as i64);
                now < expiry
            } else {
                true
            }
        });
        
        // Clean up inactive subscriptions
        state.subscriptions.retain(|_, sub| sub.active);
    }
}

async fn redis_stream_consumer(state: Arc<RwLock<MessageBusState>>) {
    let mut interval = tokio::time::interval(Duration::from_secs(5));
    
    loop {
        interval.tick().await;
        
        if let Some(redis) = &state.read().await.redis_client {
            if let Err(e) = consume_redis_streams(redis, &state).await {
                warn!("Failed to consume Redis streams: {}", e);
            }
        }
    }
}

async fn consume_redis_streams(
    redis: &ConnectionManager,
    state: &Arc<RwLock<MessageBusState>>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut conn = redis.clone();
    
    let stream_options = StreamReadOptions::default()
        .block(1000)
        .count(10);
    
    let streams = vec![("ionxe:messages", "0")];
    
    let result: StreamReadReply = redis::cmd("XREAD")
        .arg(&stream_options)
        .arg("STREAMS")
        .arg(&streams)
        .query_async(&mut conn)
        .await?;
    
    for stream in result.ids {
        for message_id in stream.ids {
            if let Some(data) = message_id.map.get("data") {
                if let Ok(message) = serde_json::from_str::<Message>(data) {
                    let mut state = state.write().await;
                    state.message_history.push(message);
                }
            }
        }
    }
    
    Ok(())
}

async fn store_message_in_redis(
    redis: &ConnectionManager,
    message: &Message,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let mut conn = redis.clone();
    
    let message_json = serde_json::to_string(message)?;
    
    redis::cmd("XADD")
        .arg("ionxe:messages")
        .arg("*")
        .arg("data")
        .arg(&message_json)
        .query_async(&mut conn)
        .await?;
    
    Ok(())
}
