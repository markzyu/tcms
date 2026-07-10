mod datasources;
mod layers;
mod types;

#[cfg(test)]
mod test_helpers;

use arc_swap::ArcSwapOption;
use axum::{Router, middleware, routing::get};
use chrono::{DateTime, Utc};
use std::{
  net::{Ipv4Addr, SocketAddr},
  path::PathBuf,
  sync::Arc,
};
use tokio::sync::mpsc::{Sender, channel};
use tower_http::services::ServeDir;
use tower_layer::Layer;

use crate::layers::instance_url_sanitization_layer;
use crate::{
  datasources::{serve_query_cdn_bridge, serve_template_from_zip},
  types::AppState,
};

pub use crate::types::{InstanceConfig, LcdnConfig, LcdnError};

// This is the only global singleton state.
static SHUTDOWN_CHANNEL: ArcSwapOption<Sender<()>> = ArcSwapOption::const_empty();

pub fn setup_rustls() {
  // Globally register ring as the default crypto provider, if one doesn't exist yet
  // Ignoring the error (which would fail later, during reqwest initialization anyways)
  let _ = rustls::crypto::ring::default_provider().install_default();
}

pub(crate) fn make_app(app_state: AppState) -> Router {
  // Internal URI paths can start with: /templates/, /instances/, /queries/, /dependencies/ (react/vue)
  let public_static = ServeDir::new(app_state.public_content_path.as_path());
  let route_content = Router::new()
    .fallback_service(public_static)
    .route(
      "/templates/{template_scope}/{template_id}/{*path}",
      get(serve_template_from_zip),
    )
    .route(
      "/queries/by_slug/{slug}/cdn-bridge.js",
      get(serve_query_cdn_bridge),
    )
    .with_state(app_state.clone());

  // Convert external URI paths to internal URI paths for routing
  let route_content =
    middleware::from_fn_with_state(app_state.clone(), instance_url_sanitization_layer)
      .layer(route_content);

  // Add other external routes like /healthcheck
  Router::new()
    .fallback_service(route_content)
    .route("/healthcheck", get(|| async { "OK" }))
    .nest_service("/static", ServeDir::new("."))
}

pub async fn start_lcdn_server(
  config: LcdnConfig,
  public_content_path: PathBuf,
) -> Result<(), LcdnError> {
  let mock_instance_configs = vec![InstanceConfig {
    instance_id: "6fa27a2f-2f1e-413d-a842-424242424242".to_string(),
    name: "My Contact Card".to_string(),
    slug: "my-contact-card".to_string(),
    template_scope: "@tcms".to_string(),
    template_id: "template-example-info-card1".to_string(),
    current_variant: "en".to_string(),
    variants: vec!["en".to_string()],
    created_at: DateTime::<Utc>::default(),
    updated_at: DateTime::<Utc>::default(),
  }];
  let LcdnConfig {
    startup_timeout,
    port,
    ..
  } = config;
  let app_state = AppState::from_configs(config, mock_instance_configs, public_content_path);

  // Make sure the port is open before we try to ping the healthcheck
  let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
  let listener = tokio::net::TcpListener::bind(addr)
    .await
    .map_err(LcdnError::CannotRun)?;

  let server_task = tokio::spawn(async move {
    let (tx, mut rx) = channel::<()>(100);
    SHUTDOWN_CHANNEL.store(Some(Arc::new(tx)));

    // Start the server
    let app = make_app(app_state.clone());
    axum::serve(listener, app)
      .with_graceful_shutdown(async move {
        rx.recv().await;
      })
      .await
      .map_err(LcdnError::CannotRun)
  });

  let result = {
    // Perform a healthcheck to verify that the server is running
    let healthcheck_url = format!("http://localhost:{}/healthcheck", port);
    let client = reqwest::Client::new();
    let request_task = async {
      let request = client.get(healthcheck_url).timeout(startup_timeout);
      let response = request.send().await.map_err(LcdnError::HealthcheckError)?;
      let response_code = response.status().as_u16();
      if response_code != 200 {
        return Err(LcdnError::HealthcheckFailed(response_code));
      }
      Ok(())
    };
    tokio::select! {
      x = request_task => x,
      x = server_task => x.unwrap_or(Err(LcdnError::CannotRunAndJoin)),
    }
  };
  if let Err(_) = result {
    // Try to stop the server if the healthcheck fails
    let _ = stop_lcdn_server().await;
  }
  result
}

pub async fn stop_lcdn_server() -> Result<(), LcdnError> {
  let guard = SHUTDOWN_CHANNEL.load();
  let Some(tx) = guard.as_ref() else {
    return Ok(());
  };
  tx.send(()).await.map_err(|_| LcdnError::CannotStop)?;
  drop(guard);
  SHUTDOWN_CHANNEL.store(None);
  Ok(())
}

#[cfg(test)]
mod tests {
  use axum::body::Body;
  use http::{Request, StatusCode, header};
  use tempfile::tempdir;
  use tower::ServiceExt;

  use crate::test_helpers::{
    TEST_SLUG, body_to_bytes, body_to_string, setup_integration_fixture, test_app_state,
    test_instance_config,
  };

  use super::*;

  fn integration_app() -> (tempfile::TempDir, Router) {
    let dir = tempdir().expect("tempdir");
    setup_integration_fixture(dir.path());
    let app_state = test_app_state(
      dir.path().to_path_buf(),
      vec![test_instance_config(TEST_SLUG)],
    );
    (dir, make_app(app_state))
  }

  #[tokio::test]
  async fn integration_healthcheck_route() {
    let (_dir, app) = integration_app();
    let response = app
      .oneshot(
        Request::builder()
          .uri("/healthcheck")
          .body(Body::empty())
          .expect("request"),
      )
      .await
      .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(body_to_string(response.into_body()).await, "OK");
  }

  #[tokio::test]
  async fn integration_mapping_slug_root() {
    let (_dir, app) = integration_app();
    let response = app
      .oneshot(
        Request::builder()
          .uri(format!("/{TEST_SLUG}"))
          .body(Body::empty())
          .expect("request"),
      )
      .await
      .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    assert!(body_to_string(response.into_body()).await.contains("caf"));
  }

  #[tokio::test]
  async fn integration_mapping_template_page() {
    let (_dir, app) = integration_app();
    let response = app
      .oneshot(
        Request::builder()
          .uri(format!("/{TEST_SLUG}/pages/a-propos.html"))
          .body(Body::empty())
          .expect("request"),
      )
      .await
      .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
      response.headers().get(header::CONTENT_TYPE).unwrap(),
      "text/html"
    );
  }

  #[tokio::test]
  async fn integration_mapping_assets() {
    let (_dir, app) = integration_app();
    let response = app
      .oneshot(
        Request::builder()
          .uri(format!("/{TEST_SLUG}/assets/hero.jpg"))
          .body(Body::empty())
          .expect("request"),
      )
      .await
      .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
      body_to_bytes(response.into_body()).await,
      b"fake-jpeg-bytes"
    );
  }

  #[tokio::test]
  async fn integration_mapping_query_cdn_bridge() {
    let (_dir, app) = integration_app();
    let response = app
      .oneshot(
        Request::builder()
          .uri(format!("/{TEST_SLUG}/__query__/cdn-bridge.js"))
          .body(Body::empty())
          .expect("request"),
      )
      .await
      .expect("response");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
      response.headers().get(header::CONTENT_TYPE).unwrap(),
      "application/javascript"
    );
    let body = body_to_string(response.into_body()).await;
    assert!(body.contains("window.tcms.cdnBridge"));
    assert!(body.contains("JSON.parse("));
  }
}
