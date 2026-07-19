use std::{
  fs::{self, File},
  io::Write,
  path::{Path, PathBuf},
  time::SystemTime,
};

use http_body_util::BodyExt;
use zip::ZipWriter;
use zip::write::SimpleFileOptions;

use crate::types::{AppState, InstanceConfig, LcdnConfig};

pub const TEST_INSTANCE_ID: &str = "id-ü";
pub const TEST_SLUG: &str = "café-card";
pub const TEST_TEMPLATE_SCOPE: &str = "@tcms";
pub const TEST_TEMPLATE_ID: &str = "tmpl-日本語";
pub const TEST_VARIANT: &str = "en";

pub fn test_instance_config(slug: &str) -> InstanceConfig {
  InstanceConfig {
    instance_id: TEST_INSTANCE_ID.to_string(),
    name: "Test Card".to_string(),
    slug: slug.to_string(),
    template_scope: TEST_TEMPLATE_SCOPE.to_string(),
    template_id: TEST_TEMPLATE_ID.to_string(),
    template_version: "1.0.0".to_string(),
    current_variant: TEST_VARIANT.to_string(),
    variants: vec![TEST_VARIANT.to_string()],
    created_at: SystemTime::now(),
    updated_at: SystemTime::now(),
  }
}

pub fn test_lcdn_config(port: u16) -> LcdnConfig {
  LcdnConfig {
    port,
    same_origin_domains: vec!["localhost".to_string()],
    ..LcdnConfig::default()
  }
}

pub fn test_app_state(public_content_path: PathBuf, instances: Vec<InstanceConfig>) -> AppState {
  AppState::from_complete_configs(test_lcdn_config(8088), instances, public_content_path)
}

pub fn write_zip(
  public_content_path: &Path,
  template_scope: &str,
  template_id: &str,
  entries: &[(&str, &[u8])],
) -> PathBuf {
  let mut zip_dir = public_content_path.to_path_buf();
  zip_dir.push("templates");
  zip_dir.push(template_scope);
  fs::create_dir_all(&zip_dir).expect("create template dir");
  let zip_path = zip_dir.join(format!("{template_id}.zip"));
  let file = File::create(&zip_path).expect("create zip file");
  let mut zip = ZipWriter::new(file);
  let options = SimpleFileOptions::default();
  for (name, content) in entries {
    zip.start_file(*name, options).expect("start zip entry");
    zip.write_all(content).expect("write zip entry");
  }
  zip.finish().expect("finish zip");
  zip_path
}

pub fn write_bytes(path: &Path, content: &[u8]) {
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).expect("create parent dirs");
  }
  fs::write(path, content).expect("write bytes");
}

pub fn write_instance_content(
  public_content_path: &Path,
  instance_id: &str,
  variant: &str,
  json: &str,
) -> PathBuf {
  let mut path = public_content_path.to_path_buf();
  path.push("instances");
  path.push(instance_id);
  path.push("content");
  path.push(&format!("main.{variant}.json"));
  write_bytes(&path, json.as_bytes());
  path
}

pub fn write_instance_asset(
  public_content_path: &Path,
  instance_id: &str,
  rel_path: &str,
  content: &[u8],
) -> PathBuf {
  let mut path = public_content_path.to_path_buf();
  path.push("instances");
  path.push(instance_id);
  path.push(rel_path);
  write_bytes(&path, content);
  path
}

pub async fn body_to_bytes(body: axum::body::Body) -> Vec<u8> {
  body
    .collect()
    .await
    .expect("collect body")
    .to_bytes()
    .to_vec()
}

pub async fn body_to_string(body: axum::body::Body) -> String {
  String::from_utf8(body_to_bytes(body).await).expect("utf8 body")
}

/// Minimal on-disk fixture for integration tests and happy-path handler tests.
pub fn setup_integration_fixture(public_content_path: &Path) {
  write_zip(
    public_content_path,
    TEST_TEMPLATE_SCOPE,
    TEST_TEMPLATE_ID,
    &[
      ("index.html", b"<html>caf\xc3\xa9 index</html>"),
      ("pages/a-propos.html", b"<html>page \xc3\xa0</html>"),
      ("data/noext", b"binary-no-extension"),
    ],
  );
  write_instance_content(
    public_content_path,
    TEST_INSTANCE_ID,
    TEST_VARIANT,
    r#"{"name":"John","note":"café"}"#,
  );
  write_instance_asset(
    public_content_path,
    TEST_INSTANCE_ID,
    "assets/hero.jpg",
    b"fake-jpeg-bytes",
  );
}
