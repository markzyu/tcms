mod datasources;
mod layers;
mod store;
mod types;

use axum::{
  Router,
  middleware,
  routing::get,
};
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use std::{
  net::{Ipv4Addr, SocketAddr},
  sync::Arc,
};
use tokio::sync::mpsc::channel;
use tower_http::services::ServeDir;
use tower_layer::Layer;

use crate::datasources::{serve_query_cdn_bridge, serve_template_from_zip};
use crate::layers::instance_url_sanitization_layer;
use crate::store::{INSTANCE_CONFIGS, LCDN_CONFIG, SHUTDOWN_CHANNEL};

pub use crate::types::{InstanceConfig, LcdnConfig, LcdnError};

pub fn setup_rustls() {
  // Globally register ring as the default crypto provider, if one doesn't exist yet
  // Ignoring the error (which would fail later, during reqwest initialization anyways)
  let _ = rustls::crypto::ring::default_provider().install_default();
}

fn update_static_configs(mut lcdn_config: LcdnConfig, instance_configs_raw: Vec<InstanceConfig>) {
  let valid_slugs: Vec<String> = instance_configs_raw
    .iter()
    .map(|instance_config| instance_config.slug.clone())
    .collect();
  let static_servers: DashMap<String, (ServeDir, ServeDir)> = DashMap::new();
  let instance_configs: DashMap<String, InstanceConfig> = DashMap::new();
  for (i, instance_config) in instance_configs_raw.iter().enumerate() {
    let template_fs_path = format!("templates/{}", instance_config.template_id);
    let instance_asset_fs_path = format!("instances/{}/assets", instance_config.instance_id);
    let template_server = ServeDir::new(template_fs_path);
    let instance_asset_server = ServeDir::new(instance_asset_fs_path);
    static_servers.insert(
      valid_slugs[i].clone(),
      (template_server, instance_asset_server),
    );
    instance_configs.insert(instance_config.slug.clone(), instance_config.clone());
    eprintln!(
      "update_static_configs: slug: {}, instance_id: {}, template_id: {}",
      instance_config.slug, instance_config.instance_id, instance_config.template_id
    );
  }
  lcdn_config.instance_ids = instance_configs_raw
    .iter()
    .map(|instance_config| instance_config.instance_id.clone())
    .collect();

  LCDN_CONFIG.store(Some(Arc::new(lcdn_config)));
  INSTANCE_CONFIGS.store(Some(Arc::new(instance_configs)));
}

pub async fn start_lcdn_server(config: LcdnConfig) -> Result<(), LcdnError> {
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
  update_static_configs(config.clone(), mock_instance_configs);
  let LcdnConfig {
    startup_timeout,
    healthcheck_timeout,
    port,
    ..
  } = config;
  let promise_start = tokio::spawn(async move {
    let (tx, mut rx) = channel::<()>(100);
    SHUTDOWN_CHANNEL.store(Some(Arc::new(tx)));

    // Internal URI paths can start with: /templates/, /instances/, /queries/, /dependencies/ (react/vue)
    let public_static = ServeDir::new("public");
    let route_content = Router::new()
      .fallback_service(public_static)
      .route(
        "/templates/{template_scope}/{template_id}/{*path}",
        get(serve_template_from_zip),
      )
      .route(
        "/queries/by_slug/{slug}/cdn-bridge.js",
        get(serve_query_cdn_bridge),
      );

    // Convert external URI paths to internal URI paths for routing
    let route_content = middleware::from_fn(instance_url_sanitization_layer).layer(route_content);

    // Add other external routes like /healthcheck
    let app = Router::new()
      .fallback_service(route_content)
      .route("/healthcheck", get(|| async { "OK" }))
      .nest_service("/static", ServeDir::new("."));

    // Start the server
    let addr = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
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
  let healthcheck_url = format!("http://localhost:{}/healthcheck", port);
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
