mod types;

use arc_swap::ArcSwapOption;
use axum::{Router, routing::get};
use std::{
  net::{Ipv4Addr, SocketAddr},
  sync::Arc,
};
use tokio::sync::mpsc::{Sender, channel};
use tower_http::services::ServeDir;

pub use crate::types::{InstanceConfig, LcdnConfig, LcdnError};

static SHUTDOWN_CHANNEL: ArcSwapOption<Sender<()>> = ArcSwapOption::const_empty();

static LCDN_CONFIG: ArcSwapOption<LcdnConfig> = ArcSwapOption::const_empty();
static INSTANCE_CONFIGS: ArcSwapOption<Vec<InstanceConfig>> = ArcSwapOption::const_empty();
static VALID_PATHS: ArcSwapOption<Vec<String>> = ArcSwapOption::const_empty();

pub fn setup_rustls() {
  // Globally register ring as the default crypto provider, if one doesn't exist yet
  // Ignoring the error (which would fail later, during reqwest initialization anyways)
  let _ = rustls::crypto::ring::default_provider().install_default();
}

pub async fn start_lcdn_server(config: LcdnConfig) -> Result<(), LcdnError> {
  let LcdnConfig {
    startup_timeout,
    healthcheck_timeout,
    ..
  } = config;
  let promise_start = tokio::spawn(async move {
    let (tx, mut rx) = channel::<()>(100);
    SHUTDOWN_CHANNEL.store(Some(Arc::new(tx)));

    let app = Router::new()
      .route("/healthcheck", get(|| async { "OK" }))
      .nest_service("/static", ServeDir::new("."));
    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, config.port));
    let listener = tokio::net::TcpListener::bind(addr)
      .await
      .map_err(LcdnError::CannotRun)?;
    axum::serve(listener, app)
      .with_graceful_shutdown(async move {
        rx.recv().await;
      })
      .await
      .map_err(LcdnError::CannotRun)
  });

  // Wait for STARTUP_TIMEOUT, and verify that the server has not crashed
  tokio::select! {
      result = promise_start => result,
      _ = tokio::time::sleep(startup_timeout) => Ok(Ok(())),
  }
  .map_err(LcdnError::CannotRun2)??;

  // Perform a healthcheck to verify that the server is running
  let healthcheck_url = format!("http://localhost:{}/healthcheck", config.port);
  let client = reqwest::Client::new();
  let request = client.get(healthcheck_url).timeout(healthcheck_timeout);
  let response = request
    .send()
    .await
    .map_err(LcdnError::CannotStartHealthcheck)?;
  let response_code = response.status().as_u16();
  if response_code != 200 {
    return Err(LcdnError::HealthcheckFailed(response_code));
  }

  Ok(())
}

pub async fn stop_lcdn_server() -> Result<(), LcdnError> {
  let guard = SHUTDOWN_CHANNEL.load();
  let Some(tx) = guard.as_ref() else {
    return Ok(());
  };
  tx.send(()).await.map_err(|_| LcdnError::CannotStop)
}
