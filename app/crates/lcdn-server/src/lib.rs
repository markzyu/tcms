mod datasources;
mod layers;
mod types;

#[cfg(test)]
mod test_helpers;

use arc_swap::ArcSwapOption;
use axum::{
  Router,
  extract::{Request, State},
  middleware::{self, Next},
  response::Response,
  routing::get,
};
use http::StatusCode;
use std::{
  net::{Ipv4Addr, SocketAddr},
  sync::{
    Arc,
    atomic::{AtomicBool, AtomicU16, Ordering},
  },
  time::Duration,
};
use tokio::sync::mpsc::{Sender, channel};
use tower_http::services::ServeDir;
use tower_layer::Layer;

use crate::datasources::{serve_query_cdn_bridge, serve_template_from_zip};
use crate::layers::instance_url_sanitization_layer;

pub use crate::types::{AppState, InstanceConfig, LcdnConfig, LcdnError};

// These are the only global singleton states.
static PORT: AtomicU16 = AtomicU16::new(0);
static SHUTDOWN_CHANNEL: ArcSwapOption<Sender<()>> = ArcSwapOption::const_empty();
static SHOULD_RELOAD_CONFIGS: AtomicBool = AtomicBool::new(false);

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
    .layer(middleware::from_fn_with_state(
      app_state.clone(),
      config_reload_middleware,
    ))
}

async fn config_reload_middleware(
  State(app_state): State<AppState>,
  req: Request,
  next: Next,
) -> Result<Response, StatusCode> {
  if let Ok(true) =
    SHOULD_RELOAD_CONFIGS.compare_exchange(true, false, Ordering::AcqRel, Ordering::Acquire)
  {
    let new_app_state = {
      let config_guard = app_state.lcdn_config.load();
      let public_path = app_state.public_content_path.clone();
      AppState::from_config(config_guard.as_ref().clone(), public_path.as_ref().clone())
        .map_err(|e| {
          eprintln!("Error reloading configs: {}", e);
        })
        .unwrap_or(app_state.clone())
    };
    let new_config_guard = new_app_state.lcdn_config.load();
    let new_instance_configs_guard = new_app_state.instance_configs.load();
    app_state.replace_configs(
      new_config_guard.as_ref().clone(),
      new_instance_configs_guard.as_ref().clone(),
    );
    eprintln!("Done reloading configs");
  }
  Ok(next.run(req).await)
}

pub async fn start_lcdn_server(app_state: AppState) -> Result<(), LcdnError> {
  let config_guard = app_state.lcdn_config.load();
  let &LcdnConfig {
    startup_timeout,
    port,
    ..
  } = config_guard.as_ref();

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

  PORT.store(port, Ordering::Release);

  let result = {
    // Perform a healthcheck to verify that the server is running
    let request_task = run_healthcheck(port, startup_timeout);
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

pub async fn run_healthcheck(port: u16, timeout: Duration) -> Result<(), LcdnError> {
  let healthcheck_url = format!("http://localhost:{}/healthcheck", port);
  let client = reqwest::Client::new();
  let request = client.get(healthcheck_url).timeout(timeout);
  let response = request.send().await.map_err(LcdnError::HealthcheckError)?;
  let response_code = response.status().as_u16();
  if response_code != 200 {
    return Err(LcdnError::HealthcheckFailed(response_code));
  }
  Ok(())
}

pub async fn reload_configs(timeout: Duration) -> Result<(), LcdnError> {
  let port = PORT.load(Ordering::Acquire);

  SHOULD_RELOAD_CONFIGS.store(true, Ordering::Release);

  // Run health check to trigger a config reload
  run_healthcheck(port, timeout).await
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
