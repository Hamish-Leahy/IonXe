use axum::http::StatusCode;
use axum::Router;
use ionxe_backend::{build_router, init_state_from_disk};
use tower::ServiceExt; // for Router::oneshot

#[tokio::test]
async fn health_works() {
    init_state_from_disk("test");
    let app: Router = build_router();
    let response = app
        .clone()
        .oneshot(axum::http::Request::builder().uri("/health").body(axum::body::Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn patch_roundtrip() {
    init_state_from_disk("test");
    let app: Router = build_router();

    let patch = serde_json::json!({
        "universes": [],
        "fixtures": [],
        "channel_map": []
    });

    let put = app
        .clone()
        .oneshot(axum::http::Request::builder()
            .method("PUT")
            .uri("/api/v1/patch")
            .header("content-type", "application/json")
            .body(axum::body::Body::from(serde_json::to_vec(&patch).unwrap()))
            .unwrap())
        .await
        .unwrap();
    assert_eq!(put.status(), StatusCode::NO_CONTENT);

    let get = app
        .clone()
        .oneshot(axum::http::Request::builder().uri("/api/v1/patch").body(axum::body::Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(get.status(), StatusCode::OK);
}


