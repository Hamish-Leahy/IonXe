use std::{net::SocketAddr, time::Duration};

use axum::{extract::State, http::{HeaderValue, Request, StatusCode, Uri}, response::IntoResponse, routing::any, Router};
use axum::body::Body;
use http_body_util::BodyExt as _; // for collect
use hyper_util::client::legacy::Client as LegacyClient;
use hyper_util::rt::TokioExecutor;
use tower_http::{cors::{Any, CorsLayer}, trace::TraceLayer};
use tracing::{error, info};

#[derive(Clone)]
struct MiddlewareState {
    backend_rs: String,
    backend_c: String,
    client: LegacyClient<hyper_util::client::legacy::connect::HttpConnector, Body>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt().with_env_filter("info").init();

    let backend_rs = std::env::var("BACKEND_RS").unwrap_or_else(|_| "http://127.0.0.1:8080".into());
    let backend_c = std::env::var("BACKEND_C").unwrap_or_else(|_| "http://127.0.0.1:8081".into());

    let client = LegacyClient::builder(TokioExecutor::new()).build_http();

    let state = MiddlewareState { backend_rs, backend_c, client };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
        .max_age(Duration::from_secs(3600));

    let app = Router::new()
        .route("/*path", any(proxy))
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let addr: SocketAddr = "127.0.0.1:8082".parse().unwrap();
    info!("middleware listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn proxy(State(st): State<MiddlewareState>, mut req: Request<Body>) -> impl IntoResponse {
    let path = req.uri().path().to_string();
    let is_c_binary = path.starts_with("/api/v1/dimmers/");
    let base = if is_c_binary { &st.backend_c } else { &st.backend_rs };

    let new_uri: Uri = format!("{}{}{}", base, req.uri().path(), match req.uri().query() { Some(q) => format!("?{}", q), None => String::new() }).parse().unwrap();
    *req.uri_mut() = new_uri;

    match st.client.request(req).await {
        Ok(resp) => {
            let status = resp.status();
            let headers = resp.headers().clone();
            let body_bytes = resp.into_body().collect().await.map(|c| c.to_bytes()).unwrap_or_default();
            let mut builder = axum::http::Response::builder().status(status);
            for (k, v) in headers.iter() { builder = builder.header(k, v); }
            builder
                .header(axum::http::header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"))
                .body(Body::from(body_bytes))
                .unwrap()
        }
        Err(err) => {
            error!("proxy error: {}", err);
            (StatusCode::BAD_GATEWAY, "upstream error").into_response()
        }
    }
}


