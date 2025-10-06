use std::{net::SocketAddr, time::Duration};

use axum::Router;
use ionxe_backend::{build_router, init_state_from_disk};
use tokio::signal;
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt().with_env_filter("info").init();

    init_state_from_disk(env!("CARGO_PKG_VERSION"));

    let app: Router = build_router();

    let addr_str = std::env::var("IONXE_BACKEND_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into());
    let addr: SocketAddr = addr_str.parse().unwrap();
    info!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).with_graceful_shutdown(shutdown_signal()).await?;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{signal, SignalKind};
        let mut sigterm = signal(SignalKind::terminate()).expect("install SIGTERM handler");
        sigterm.recv().await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        _ = ctrl_c => {}
        _ = terminate => {}
    }
    // Small delay to allow in-flight requests to complete
    tokio::time::sleep(Duration::from_millis(100)).await;
}


