use axum::{
  extract::{Request, State},
  middleware::Next,
  response::Response,
};
use http::{StatusCode, Uri, header, uri::PathAndQuery};
use std::{
  path::{Component, PathBuf},
  str::FromStr,
};

use crate::{InstanceConfig, types::AppState};

pub(crate) fn edit_uri_path(
  uri: &mut Uri,
  edit_fn: impl FnOnce(String) -> String,
) -> Result<(), StatusCode> {
  let mut uri_parts = uri.clone().into_parts();
  let orig_path_and_query = uri_parts.path_and_query.as_ref();
  let orig_uri_path = orig_path_and_query
    .map(|pq| pq.path().trim_start_matches('/').to_string())
    .unwrap_or_default();
  let orig_uri_query = orig_path_and_query
    .map(|pq| pq.query().unwrap_or_default().to_string())
    .unwrap_or_default();

  let new_uri_path = edit_fn(orig_uri_path.clone());

  // Sanitize the new path to remove query. But, remove the leading / from PathAndQuery.
  let parseable_new_uri_path = format!("/{}", new_uri_path);
  let parse_new_uri_path = PathAndQuery::from_str(&parseable_new_uri_path).map_err(|_| {
    eprintln!("Error parsing edited path: {}", &new_uri_path);
    StatusCode::INTERNAL_SERVER_ERROR
  })?;
  let new_uri_path = parse_new_uri_path
    .path()
    .trim_start_matches('/')
    .to_string();

  // Combine the new path with the original query
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

pub(crate) fn get_slug_from_uri(uri: &Uri) -> Option<String> {
  uri.path().split('/').nth(1).map(|slug| slug.to_string())
}

pub(crate) fn get_referer_as_uri(req: &Request) -> Option<Uri> {
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

// Change only the uri path based on slug and instance config
pub(crate) fn map_external_uri_path_to_internal(
  external_uri_path: String,
  slug: String,
  instance_config: &InstanceConfig,
) -> String {
  // Desired URI path mappings:
  //     - "Invalid string": keep as is or use /
  //     - "/slug/assets/...": map to "instances/{instance_id}/{path_without_slug}"
  //     - "/slug/...": map to "templates/{template_scope}/{template_id}/{path_without_slug}"
  //     - "/slug": map to "templates/{template_scope}/{template_id}/index.html"
  //     - "/slug/__query__/...": map to "queries/by_slug/{slug}/..."
  let orig_uri_path_buf = PathBuf::from(external_uri_path.clone());
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
    _ => external_uri_path,
  }
}

pub(crate) async fn instance_url_sanitization_layer(
  State(app_state): State<AppState>,
  mut req: Request,
  next: Next,
) -> Result<Response, StatusCode> {
  let instance_configs = app_state.instance_configs.load();

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

  edit_uri_path(req.uri_mut(), |uri_path| {
    // First, make correction to the original URI by adding slug from Referer header
    let uri_path = if let Some(slug_from_referer) = &slug_from_referer {
      format!("{}/{}", slug_from_referer, uri_path)
    } else {
      uri_path
    };

    // Then, perform URI path mapping:
    map_external_uri_path_to_internal(uri_path, slug, &instance_config)
  })?;

  Ok(next.run(req).await)
}

#[cfg(test)]
mod tests {
  use axum::{Router, body::Body, extract::Request, middleware, routing::get};
  use http::{StatusCode, Uri, header};
  use std::str::FromStr;
  use tempfile::tempdir;
  use tower::ServiceExt;

  use crate::test_helpers::{
    TEST_INSTANCE_ID, TEST_SLUG, TEST_TEMPLATE_ID, TEST_TEMPLATE_SCOPE, body_to_string,
    test_app_state, test_instance_config,
  };

  use super::*;

  fn test_instance() -> InstanceConfig {
    test_instance_config(TEST_SLUG)
  }

  fn sanitization_test_app(app_state: AppState) -> Router {
    Router::new()
      .fallback(get(|uri: Uri| async move { uri.path().to_string() }))
      .layer(middleware::from_fn_with_state(
        app_state.clone(),
        instance_url_sanitization_layer,
      ))
      .with_state(app_state)
  }

  async fn run_sanitization(app_state: AppState, request: Request<Body>) -> (StatusCode, String) {
    let response = sanitization_test_app(app_state)
      .oneshot(request)
      .await
      .expect("service response");
    let status = response.status();
    let body = body_to_string(response.into_body()).await;
    (status, body)
  }

  #[test]
  fn map_external_uri_path_empty() {
    let instance = test_instance();
    assert_eq!(
      map_external_uri_path_to_internal(String::new(), TEST_SLUG.to_string(), &instance),
      "/"
    );
  }

  #[test]
  fn map_external_uri_path_slug_root() {
    let instance = test_instance();
    assert_eq!(
      map_external_uri_path_to_internal("café-card".to_string(), TEST_SLUG.to_string(), &instance),
      format!("templates/{TEST_TEMPLATE_SCOPE}/{TEST_TEMPLATE_ID}/index.html")
    );
  }

  #[test]
  fn map_external_uri_path_assets() {
    let instance = test_instance();
    assert_eq!(
      map_external_uri_path_to_internal(
        "café-card/assets/héro.jpg".to_string(),
        TEST_SLUG.to_string(),
        &instance
      ),
      format!("instances/{TEST_INSTANCE_ID}/assets/héro.jpg")
    );
  }

  #[test]
  fn map_external_uri_path_query() {
    let instance = test_instance();
    assert_eq!(
      map_external_uri_path_to_internal(
        "café-card/__query__/cdn-bridge.js".to_string(),
        TEST_SLUG.to_string(),
        &instance
      ),
      format!("queries/by_slug/{TEST_SLUG}/cdn-bridge.js")
    );
  }

  #[test]
  fn map_external_uri_path_template_page() {
    let instance = test_instance();
    assert_eq!(
      map_external_uri_path_to_internal(
        "café-card/pages/à-propos.html".to_string(),
        TEST_SLUG.to_string(),
        &instance
      ),
      format!("templates/{TEST_TEMPLATE_SCOPE}/{TEST_TEMPLATE_ID}/pages/à-propos.html")
    );
  }

  #[test]
  fn map_external_uri_path_fallback() {
    let instance = test_instance();
    let external = "../café/attack".to_string();
    assert_eq!(
      map_external_uri_path_to_internal(external.clone(), TEST_SLUG.to_string(), &instance),
      external
    );
  }

  #[test]
  fn edit_uri_path_happy_path() {
    let mut uri = Uri::from_static("/old/path?foo=bar");
    edit_uri_path(&mut uri, |_| "new/path".to_string()).expect("ok");
    assert_eq!(uri.path(), "/new/path");
    assert_eq!(uri.query(), Some("foo=bar"));
  }

  #[test]
  fn edit_uri_path_question_mark_in_path() {
    let mut uri = Uri::from_static("/old/path");
    edit_uri_path(&mut uri, |_| "foo?bar".to_string()).expect("ok");
    assert_eq!(uri.path(), "/foo");
    assert_eq!(uri.query(), Some(""));
  }

  #[test]
  fn edit_uri_path_ampersand_in_path() {
    let mut uri = Uri::from_static("/old/path");
    edit_uri_path(&mut uri, |_| "foo&bar".to_string()).expect("ok");
    assert_eq!(uri.path(), "/foo&bar");
    assert_eq!(uri.query(), Some(""));
  }

  #[test]
  fn get_slug_from_uri_normal() {
    let uri = Uri::from_static("/my-contact-card/foo");
    assert_eq!(get_slug_from_uri(&uri), Some("my-contact-card".to_string()));
  }

  #[test]
  fn get_slug_from_uri_triple_slash() {
    let uri = Uri::from_str("http://localhost///abc/test").expect("uri");
    assert_eq!(get_slug_from_uri(&uri), Some(String::new()));
  }

  #[test]
  fn get_referer_as_uri_valid() {
    let request = Request::builder()
      .uri("/")
      .header(header::REFERER, "http://localhost/caf%C3%A9-card/")
      .body(Body::empty())
      .expect("request");
    let referer = get_referer_as_uri(&request).expect("referer");
    assert_eq!(referer.path(), "/caf%C3%A9-card/");
  }

  #[test]
  fn get_referer_as_uri_invalid() {
    let request = Request::builder()
      .uri("/")
      .header(header::REFERER, "http://[::1")
      .body(Body::empty())
      .expect("request");
    assert_eq!(get_referer_as_uri(&request), None);
  }

  #[tokio::test]
  async fn instance_url_sanitization_layer_slug_from_uri() {
    let dir = tempdir().unwrap();
    let app_state = test_app_state(dir.path().to_path_buf(), vec![test_instance()]);
    let request = Request::builder()
      .uri(format!("/{TEST_SLUG}/pages/à-propos.html"))
      .body(Body::empty())
      .expect("request");
    let (status, body) = run_sanitization(app_state, request).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
      body,
      format!("/templates/{TEST_TEMPLATE_SCOPE}/{TEST_TEMPLATE_ID}/pages/à-propos.html")
    );
  }

  #[tokio::test]
  async fn instance_url_sanitization_layer_slug_from_referer() {
    let dir = tempdir().unwrap();
    // Referer URLs are percent-encoded; slug lookup uses the encoded path segment.
    let slug = "caf%C3%A9-card";
    let app_state = test_app_state(dir.path().to_path_buf(), vec![test_instance_config(slug)]);
    let request = Request::builder()
      .uri("/assets/héro.jpg")
      .header(header::REFERER, format!("http://localhost/{slug}/"))
      .body(Body::empty())
      .expect("request");
    let (status, body) = run_sanitization(app_state, request).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
      body,
      format!("/instances/{TEST_INSTANCE_ID}/assets/héro.jpg")
    );
  }

  #[tokio::test]
  async fn instance_url_sanitization_layer_unknown_slug() {
    let dir = tempdir().unwrap();
    let app_state = test_app_state(dir.path().to_path_buf(), vec![test_instance()]);
    let request = Request::builder()
      .uri("/unknown-slüg/foo")
      .body(Body::empty())
      .expect("request");
    let (status, _body) = run_sanitization(app_state, request).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
  }
}
