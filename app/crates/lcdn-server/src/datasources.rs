use axum::{
  body::Body,
  extract::{Path, State},
  response::Response,
};
use http::{HeaderValue, StatusCode, header};
use std::{fs::File, io::BufReader, io::Read};

use zip::ZipArchive;

use crate::types::AppState;

// TODO: Rely on tauri fs to read the zip file from assets
// TODO: Also, consider adding a TLS cache only for small files in the ZIP to reduce fs overhead
//       (large files are not gonna be cache-able on the phone anyways)
pub(crate) async fn serve_template_from_zip(
  State(app_state): State<AppState>,
  Path((template_scope, template_id, path)): Path<(String, String, String)>,
) -> Result<Response, StatusCode> {
  eprintln!(
    "serve_template_from_zip: template: {}/{}, path: {}",
    &template_scope, &template_id, &path
  );
  let public_content_path = app_state.public_content_path.as_path();
  let zip_path =
    public_content_path.join(format!("templates/{}/{}.zip", template_scope, template_id));
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
pub(crate) async fn serve_query_cdn_bridge(
  State(app_state): State<AppState>,
  Path(slug): Path<String>,
) -> Result<Response, StatusCode> {
  // Fetch instance config from slug
  let lcdn_config = app_state.lcdn_config.load();
  let instance_configs = app_state.instance_configs.load();
  let instance_config = instance_configs.get(&slug);
  let Some(instance_config) = instance_config else {
    eprintln!("serve_query_cdn_bridge: no instance configs");
    return Err(StatusCode::NOT_FOUND);
  };
  let public_content_path = app_state.public_content_path.as_path();
  let content_json_path = public_content_path.join(format!(
    "instances/{}/content/main.{}.json",
    instance_config.instance_id, instance_config.current_variant
  ));
  let origin_url = format!("http://localhost:{}", lcdn_config.port);
  let origin_url =
    serde_json::to_string(&origin_url).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
  let content_json =
    std::fs::read_to_string(content_json_path).map_err(|_| StatusCode::NOT_FOUND)?;
  let content_json =
    serde_json::to_string(&content_json).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
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
      initialContentJson: JSON.parse({initial_content_json}),
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

#[cfg(test)]
mod tests {
  use axum::extract::{Path, State};
  use http::StatusCode;
  use tempfile::tempdir;

  use crate::test_helpers::{
    TEST_INSTANCE_ID, TEST_SLUG, TEST_TEMPLATE_ID, TEST_TEMPLATE_SCOPE, TEST_VARIANT,
    body_to_bytes, body_to_string, test_app_state, test_instance_config, write_bytes,
    write_instance_content, write_zip,
  };

  use super::*;

  fn app_state_with_instance(content_root: &std::path::Path) -> AppState {
    test_app_state(
      content_root.to_path_buf(),
      vec![test_instance_config(TEST_SLUG)],
    )
  }

  #[tokio::test]
  async fn serve_template_from_zip_happy_path() {
    let dir = tempdir().unwrap();
    write_zip(
      dir.path(),
      TEST_TEMPLATE_SCOPE,
      TEST_TEMPLATE_ID,
      &[("index.html", b"<html>ok</html>")],
    );
    let state = app_state_with_instance(dir.path());
    let response = serve_template_from_zip(
      State(state),
      Path((
        TEST_TEMPLATE_SCOPE.to_string(),
        TEST_TEMPLATE_ID.to_string(),
        "index.html".to_string(),
      )),
    )
    .await
    .expect("200");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
      response.headers().get(header::CONTENT_TYPE).unwrap(),
      "text/html"
    );
    assert_eq!(
      body_to_string(response.into_body()).await,
      "<html>ok</html>"
    );
  }

  #[tokio::test]
  async fn serve_template_from_zip_missing_zip() {
    let dir = tempdir().unwrap();
    let state = app_state_with_instance(dir.path());
    let err = serve_template_from_zip(
      State(state),
      Path((
        TEST_TEMPLATE_SCOPE.to_string(),
        TEST_TEMPLATE_ID.to_string(),
        "index.html".to_string(),
      )),
    )
    .await
    .unwrap_err();
    assert_eq!(err, StatusCode::NOT_FOUND);
  }

  #[tokio::test]
  async fn serve_template_from_zip_corrupt_zip() {
    let dir = tempdir().unwrap();
    let zip_path = dir.path().join(format!(
      "templates/{TEST_TEMPLATE_SCOPE}/{TEST_TEMPLATE_ID}.zip"
    ));
    write_bytes(&zip_path, b"this is not a zip file");
    let state = app_state_with_instance(dir.path());
    let err = serve_template_from_zip(
      State(state),
      Path((
        TEST_TEMPLATE_SCOPE.to_string(),
        TEST_TEMPLATE_ID.to_string(),
        "index.html".to_string(),
      )),
    )
    .await
    .unwrap_err();
    assert_eq!(err, StatusCode::INTERNAL_SERVER_ERROR);
  }

  #[tokio::test]
  async fn serve_template_from_zip_missing_file_in_zip() {
    let dir = tempdir().unwrap();
    write_zip(
      dir.path(),
      TEST_TEMPLATE_SCOPE,
      TEST_TEMPLATE_ID,
      &[("index.html", b"<html>ok</html>")],
    );
    let state = app_state_with_instance(dir.path());
    let err = serve_template_from_zip(
      State(state),
      Path((
        TEST_TEMPLATE_SCOPE.to_string(),
        TEST_TEMPLATE_ID.to_string(),
        "missing.html".to_string(),
      )),
    )
    .await
    .unwrap_err();
    assert_eq!(err, StatusCode::NOT_FOUND);
  }

  #[tokio::test]
  async fn serve_template_from_zip_default_mime_type() {
    let dir = tempdir().unwrap();
    write_zip(
      dir.path(),
      TEST_TEMPLATE_SCOPE,
      TEST_TEMPLATE_ID,
      &[("data/noext", b"raw-bytes")],
    );
    let state = app_state_with_instance(dir.path());
    let response = serve_template_from_zip(
      State(state),
      Path((
        TEST_TEMPLATE_SCOPE.to_string(),
        TEST_TEMPLATE_ID.to_string(),
        "data/noext".to_string(),
      )),
    )
    .await
    .expect("200");
    assert_eq!(
      response.headers().get(header::CONTENT_TYPE).unwrap(),
      "application/octet-stream"
    );
    assert_eq!(body_to_bytes(response.into_body()).await, b"raw-bytes");
  }

  #[tokio::test]
  async fn serve_query_cdn_bridge_happy_path() {
    let dir = tempdir().unwrap();
    write_instance_content(
      dir.path(),
      TEST_INSTANCE_ID,
      TEST_VARIANT,
      r#"{"name":"John","note":"café"}"#,
    );
    let state = app_state_with_instance(dir.path());
    let response = serve_query_cdn_bridge(State(state), Path(TEST_SLUG.to_string()))
      .await
      .expect("200");
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
      response.headers().get(header::CONTENT_TYPE).unwrap(),
      "application/javascript"
    );
    let body = body_to_string(response.into_body()).await;
    assert!(body.contains("JSON.parse("));
    assert!(body.contains("caf"));
  }

  #[tokio::test]
  async fn serve_query_cdn_bridge_malicious_content_json() {
    let dir = tempdir().unwrap();
    let malicious =
      r#"{"x":"</script><script>alert(1)</script>","y":"\"}; alert(1);//","z":"café"}"#;
    write_instance_content(dir.path(), TEST_INSTANCE_ID, TEST_VARIANT, malicious);
    let state = app_state_with_instance(dir.path());
    let response = serve_query_cdn_bridge(State(state), Path(TEST_SLUG.to_string()))
      .await
      .expect("200");
    let body = body_to_string(response.into_body()).await;
    assert!(body.contains("JSON.parse("));
    let embedded = serde_json::to_string(malicious).expect("embed");
    assert!(
      body.contains(&embedded),
      "file content must be JSON-string-embedded in JSON.parse(...)"
    );
    let roundtrip: String = serde_json::from_str(&embedded).expect("roundtrip");
    assert_eq!(roundtrip, malicious);
  }

  #[tokio::test]
  async fn serve_query_cdn_bridge_missing_content_json() {
    let dir = tempdir().unwrap();
    let state = app_state_with_instance(dir.path());
    let err = serve_query_cdn_bridge(State(state), Path(TEST_SLUG.to_string()))
      .await
      .unwrap_err();
    assert_eq!(err, StatusCode::NOT_FOUND);
  }

  #[tokio::test]
  async fn serve_query_cdn_bridge_missing_instance_config() {
    let dir = tempdir().unwrap();
    write_instance_content(
      dir.path(),
      TEST_INSTANCE_ID,
      TEST_VARIANT,
      r#"{"name":"John"}"#,
    );
    let state = app_state_with_instance(dir.path());
    let err = serve_query_cdn_bridge(State(state), Path("unknown-slüg".to_string()))
      .await
      .unwrap_err();
    assert_eq!(err, StatusCode::NOT_FOUND);
  }
}
