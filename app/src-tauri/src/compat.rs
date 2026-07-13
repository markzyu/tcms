use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_fs::FsExt;
use tauri_plugin_os::platform;

pub(crate) fn get_compat_os_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
  let base_dir_desktop = app_handle
    .path()
    .app_data_dir()
    .map_err(|e| e.to_string())?;
  let base_dir_android = base_dir_desktop.join("files");
  match platform() {
    "linux" => Ok(base_dir_desktop),
    "windows" => Ok(base_dir_desktop),
    "macos" => Ok(base_dir_desktop),
    "android" => Ok(base_dir_android),
    _ => Err(format!(
      "Unsupported operating system for guessing OS data dir: {}",
      platform()
    )),
  }
}

pub(crate) fn ensure_os_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
  let base_dir = get_compat_os_data_dir(app_handle)?;
  if !base_dir.exists() {
    std::fs::create_dir_all(&base_dir).map_err(|e| e.to_string())?;
  }
  Ok(base_dir)
}

pub(crate) fn ensure_templates_dir(
  app_handle: &AppHandle,
  template_scope: &str,
) -> Result<PathBuf, String> {
  let public_dir = get_compat_os_data_dir(app_handle)?.join("public");
  let template_dir = public_dir.join("templates").join(template_scope);
  if !template_dir.exists() {
    std::fs::create_dir_all(&template_dir).map_err(|e| e.to_string())?;
  }
  Ok(template_dir)
}

pub(crate) fn ensure_instances_dir(
  app_handle: &AppHandle,
  instance_id: String,
  relative_path: Option<String>,
) -> Result<PathBuf, String> {
  let public_dir = get_compat_os_data_dir(app_handle)?.join("public");
  let mut instances_dir = public_dir.join("instances").join(instance_id);
  if let Some(relative_path) = relative_path {
    instances_dir = instances_dir.join(relative_path);
  }
  if !instances_dir.exists() {
    std::fs::create_dir_all(&instances_dir).map_err(|e| e.to_string())?;
  }
  Ok(instances_dir)
}

pub(crate) fn read_app_asset(
  app_handle: &AppHandle,
  relative_path: String,
) -> Result<Vec<u8>, String> {
  let resource_dir_uri = app_handle
    .path()
    .resource_dir()
    .map_err(|e| e.to_string())?;
  let resource_uri = resource_dir_uri.join("prefabs").join(relative_path);
  app_handle
    .fs()
    .read(resource_uri)
    .map_err(|e| e.to_string())
}

pub(crate) fn copy_app_asset_to_fs(
  app_handle: &AppHandle,
  relative_path: String,
  target_path: &PathBuf,
) -> Result<(), String> {
  let asset_bytes = read_app_asset(app_handle, relative_path)?;
  std::fs::write(&target_path, asset_bytes).map_err(|e| e.to_string())
}
