use axum::{
  body::Body,
  extract::Path,
  response::Response,
};
use http::{HeaderValue, StatusCode, header};
use std::{
  fs::File,
  io::BufReader,
  io::Read,
};

use crate::store::{INSTANCE_CONFIGS, LCDN_CONFIG};
use zip::ZipArchive;

// TODO: Rely on tauri fs to read the zip file from assets
// TODO: Also, consider adding a TLS cache only for small files in the ZIP to reduce fs overhead
//       (large files are not gonna be cache-able on the phone anyways)
pub(crate) async fn serve_template_from_zip(
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
pub(crate) async fn serve_query_cdn_bridge(Path(slug): Path<String>) -> Result<Response, StatusCode> {
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
