mod types;

use arc_swap::ArcSwapOption;
use axum::{
  Router,
  body::Body,
  extract::{Path, Request},
  middleware::{self, Next},
  response::Response,
  routing::get,
};
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use http::{HeaderValue, StatusCode, Uri, header, uri::PathAndQuery};
use std::{
  fs::File,
  io::BufReader,
  io::Read,
  net::{Ipv4Addr, SocketAddr},
  path::{Component, PathBuf},
  str::FromStr,
  sync::Arc,
};
use tokio::sync::mpsc::{Sender, channel};
use tower_http::services::ServeDir;
use tower_layer::Layer;
use zip::ZipArchive;

pub use crate::types::{InstanceConfig, LcdnConfig, LcdnError};

// Note: Though these are thread-safe, please don't obtain write-guards from async code.
//       (Write guards should only be held onto, within a synchronous function)
//       (Reads guards, and atomic writes, are ok within async code)
static SHUTDOWN_CHANNEL: ArcSwapOption<Sender<()>> = ArcSwapOption::const_empty();
static LCDN_CONFIG: ArcSwapOption<LcdnConfig> = ArcSwapOption::const_empty();
static INSTANCE_CONFIGS: ArcSwapOption<DashMap<String, InstanceConfig>> =
  ArcSwapOption::const_empty();

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

fn edit_uri_path(uri: &mut Uri, edit_fn: impl FnOnce(String) -> String) -> Result<(), StatusCode> {
  let mut uri_parts = uri.clone().into_parts();
  let orig_path_and_query = uri_parts.path_and_query.as_ref();
  let orig_uri_path = orig_path_and_query
    .map(|pq| pq.path().trim_start_matches('/').to_string())
    .unwrap_or_default();
  let orig_uri_query = orig_path_and_query
    .map(|pq| pq.query().unwrap_or_default().to_string())
    .unwrap_or_default();

  let new_uri_path = edit_fn(orig_uri_path.clone());

  let new_path_and_query_str = format!("/{}?{}", new_uri_path, orig_uri_query);
  let new_req_path_and_query = PathAndQuery::from_str(&new_path_and_query_str).map_err(|_| {
    eprintln!("Error parsing path and query: {}", &new_path_and_query_str);
    StatusCode::INTERNAL_SERVER_ERROR
  })?;
  uri_parts.path_and_query = Some(new_req_path_and_query);
  let new_uri = Uri::from_parts(uri_parts).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

  eprintln!("routing /{} to {}", &orig_uri_path, new_uri.to_string());
  *uri = new_uri;
  Ok(())
}

fn get_slug_from_uri(uri: &Uri) -> Option<String> {
  uri.path().split('/').nth(1).map(|slug| slug.to_string())
}

fn get_referer_as_uri(req: &Request) -> Option<Uri> {
  req
    .headers()
    .get(header::REFERER)
    .and_then(|referer| {
      referer
        .to_str()
        .map_err(|e| eprintln!("Error parsing referer: {}", e))
        .ok()
    })
    .and_then(|referer| {
      Uri::from_str(referer)
        .map_err(|_| eprintln!("Invalid referer: {}", referer))
        .ok()
    })
}

async fn instance_url_sanitization_layer(
  mut req: Request,
  next: Next,
) -> Result<Response, StatusCode> {
  let instance_configs = INSTANCE_CONFIGS.load();
  let Some(instance_configs) = instance_configs.as_ref() else {
    return Err(StatusCode::NOT_FOUND);
  };

  // Derive slug from URI or from Referer header
  let uri_string = req.uri().to_string();
  let slug_from_uri = get_slug_from_uri(req.uri());
  let referer_uri = get_referer_as_uri(&req);
  let slug_from_referer = referer_uri.and_then(|referer| get_slug_from_uri(&referer));
  let slug = slug_from_referer
    .clone()
    .or(slug_from_uri)
    .ok_or(StatusCode::NOT_FOUND)?;
  eprintln!(
    "instance_url_sanitization_layer uri: {}. slug: {}",
    uri_string, &slug
  );

  // Fetch instance config from slug
  let instance_config = instance_configs.get(&slug);
  let Some(instance_config) = instance_config else {
    eprintln!("instance_url_sanitization_layer: no instance configs");
    return Err(StatusCode::NOT_FOUND);
  };

  // Desired URI path mappings:
  //     - "Invalid string": keep as is or use /
  //     - "/slug/assets/...": map to "instances/{instance_id}/{path_without_slug}"
  //     - "/slug/...": map to "templates/{template_scope}/{template_id}/{path_without_slug}"
  //     - "/slug": map to "templates/{template_scope}/{template_id}/index.html"
  //     - "/slug/__query__/...": map to "queries/by_slug/{slug}/..."
  edit_uri_path(req.uri_mut(), |orig_uri_path| {
    // First, make correction to the original URI by adding slug from Referer header
    let orig_uri_path = if let Some(slug_from_referer) = &slug_from_referer {
      format!("{}/{}", slug_from_referer, orig_uri_path)
    } else {
      orig_uri_path
    };

    // Then, perform URI path mapping:
    let orig_uri_path_buf = PathBuf::from(orig_uri_path.clone());
    let path_without_slug = orig_uri_path_buf
      .components()
      .skip(1)
      .collect::<PathBuf>()
      .to_string_lossy()
      .to_string();
    let path_first_component = orig_uri_path_buf.components().nth(0);
    let path_second_component = orig_uri_path_buf
      .components()
      .nth(1)
      .map(|c| c.as_os_str().to_string_lossy().to_string());
    let path_third_and_rest = orig_uri_path_buf
      .components()
      .skip(2)
      .collect::<PathBuf>()
      .to_string_lossy()
      .to_string();
    let path_components_count = orig_uri_path_buf.components().count();
    match (
      path_first_component,
      path_second_component.as_deref(),
      path_components_count,
    ) {
      (_, _, 0) => "/".to_string(),
      (Some(Component::Normal(_)), None, 1) => format!(
        "templates/{}/{}/index.html",
        instance_config.template_scope, instance_config.template_id
      ),
      (Some(Component::Normal(_)), Some("assets"), _) => format!(
        "instances/{}/{}",
        instance_config.instance_id, path_without_slug
      ),
      (Some(Component::Normal(_)), Some("__query__"), _) => {
        format!("queries/by_slug/{}/{}", slug, path_third_and_rest)
      }
      (Some(Component::Normal(_)), _, _) => format!(
        "templates/{}/{}/{}",
        instance_config.template_scope, instance_config.template_id, path_without_slug
      ),
      _ => orig_uri_path,
    }
  })?;

  Ok(next.run(req).await)
}

// TODO: Rely on tauri fs to read the zip file from assets
// TODO: Also, consider adding a TLS cache only for small files in the ZIP to reduce fs overhead
//       (large files are not gonna be cache-able on the phone anyways)
async fn serve_template_from_zip(
  Path((template_scope, template_id, path)): Path<(String, String, String)>,
) -> Result<Response, StatusCode> {
  eprintln!(
    "serve_template_from_zip: template: {}/{}, path: {}",
    &template_scope, &template_id, &path
  );
  let zip_path = format!("public/templates/{}/{}.zip", template_scope, template_id);
  let zip_file = File::open(zip_path).map_err(|_| StatusCode::NOT_FOUND)?;
  let zip_reader = BufReader::new(zip_file);
  let mut zip = ZipArchive::new(zip_reader).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
  let mut file = zip.by_name(&path).map_err(|_| StatusCode::NOT_FOUND)?;
  let mut file_content = Vec::new();
  file
    .read_to_end(&mut file_content)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

  let mime_type = mime_guess::from_path(&path)
    .first_raw()
    .unwrap_or("application/octet-stream");
  let mime_header_value =
    HeaderValue::from_str(mime_type).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
  let body = Body::from(file_content);
  let mut response = Response::new(body);
  response
    .headers_mut()
    .insert(header::CONTENT_TYPE, mime_header_value);
  Ok(response)
}

// TODO: Create an init function that unzips instances' zip files to a user homedir on target OS

// Serve the cdn-bridge.js file based on the instance config
async fn serve_query_cdn_bridge(Path(slug): Path<String>) -> Result<Response, StatusCode> {
  let lcdn_config = LCDN_CONFIG.load();
  let Some(lcdn_config) = lcdn_config.as_ref() else {
    eprintln!("serve_query_cdn_bridge: no lcdn config");
    return Err(StatusCode::NOT_FOUND);
  };
  // Fetch instance config from slug
  let instance_configs = INSTANCE_CONFIGS.load();
  let Some(instance_configs) = instance_configs.as_ref() else {
    eprintln!("serve_query_cdn_bridge: no instance configs");
    return Err(StatusCode::NOT_FOUND);
  };
  let instance_config = instance_configs.get(&slug);
  let Some(instance_config) = instance_config else {
    eprintln!("serve_query_cdn_bridge: no instance configs");
    return Err(StatusCode::NOT_FOUND);
  };
  let content_json_path = format!(
    "public/instances/{}/content/main.{}.json",
    instance_config.instance_id, instance_config.current_variant
  );
  let origin_url = format!("http://localhost:{}", lcdn_config.port);
  let origin_url =
    serde_json::to_string(&origin_url).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
  let content_json =
    std::fs::read_to_string(content_json_path).map_err(|_| StatusCode::NOT_FOUND)?;
  let initial_preview_variant = serde_json::to_string(&instance_config.current_variant)
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
  let body_str = format!(
    r#"
(() => {{
  if (!window.tcms) {{
    window.tcms = {{}};
  }}
  if (!window.tcms.cdnBridge) {{
    window.tcms.cdnBridge = {{
      initialContentJson: {initial_content_json},
      getCDNType: () => "localCDN",
      getContentJsonPath: () => "/__query__/not_implemented_yet.json",
      getInitialPreviewVariant: () => {initial_preview_variant},
      getInstanceRootPath: () => "/",
      getOriginUrl: () => new URL({origin_url}),
      fetchContentJson: () => Promise.reject(new Error("Not implemented")),
      loadJsLibrary: () => Promise.resolve(),
      loadEsModule: () => Promise.resolve({{}}),
    }};
  }}
}})();"#,
    initial_content_json = content_json,
    initial_preview_variant = initial_preview_variant,
    origin_url = origin_url
  );
  let body = Body::from(body_str);
  let mut response = Response::new(body);
  response.headers_mut().insert(
    header::CONTENT_TYPE,
    HeaderValue::from_static("application/javascript"),
  );
  Ok(response)
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
