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
