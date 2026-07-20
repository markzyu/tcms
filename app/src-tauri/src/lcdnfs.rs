use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_fs::FsExt;
use tauri_plugin_os::platform;

pub(crate) fn get_compat_os_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
  let base_dir = app_handle
    .path()
    .app_data_dir()
    .map_err(|e| format!("get_compat_os_data_dir: {}", e))?;
  let base_dir_android = base_dir.join("files");
  match platform() {
    "linux" => Ok(base_dir),
    "windows" => Ok(base_dir),
    "macos" => Ok(base_dir),
    "android" => Ok(base_dir_android),
    "ios" => Ok(base_dir),
    _ => Err(format!(
      "Unsupported operating system for ThorCMS: {}",
      platform(),
    )),
  }
}

pub(crate) fn ensure_os_data_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
  let base_dir = get_compat_os_data_dir(app_handle)?;
  if !base_dir.exists() {
    std::fs::create_dir_all(&base_dir).map_err(|e| format!("ensure_os_data_dir: {}", e))?;
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
    std::fs::create_dir_all(&template_dir).map_err(|e| format!("ensure_templates_dir: {}", e))?;
  }
  Ok(template_dir)
}

pub(crate) fn ensure_instances_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
  let public_dir = get_compat_os_data_dir(app_handle)?.join("public");
  let instances_dir = public_dir.join("instances");
  if !instances_dir.exists() {
    std::fs::create_dir_all(&instances_dir).map_err(|e| format!("ensure_instances_dir: {}", e))?;
  }
  Ok(instances_dir)
}

pub(crate) fn read_app_asset(
  app_handle: &AppHandle,
  relative_path: &PathBuf,
) -> Result<Vec<u8>, String> {
  let resource_dir_uri = app_handle
    .path()
    .resource_dir()
    .map_err(|e| format!("read_app_asset: {}", e))?;
  let resource_uri = resource_dir_uri.join("prefabs").join(relative_path);
  app_handle
    .fs()
    .read(resource_uri)
    .map_err(|e| format!("read_app_asset: {}", e))
}

pub(crate) fn copy_app_asset_to_fs(
  app_handle: &AppHandle,
  relative_path: &PathBuf,
  target_path: &PathBuf,
) -> Result<(), String> {
  let asset_bytes = read_app_asset(app_handle, relative_path)?;
  std::fs::write(&target_path, asset_bytes).map_err(|e| format!("copy_app_asset_to_fs: {}", e))
}

pub(crate) fn unzip_app_asset_to_fs(
  app_handle: &AppHandle,
  relative_path: &PathBuf,
  target_path: &PathBuf,
) -> Result<(), String> {
  if target_path.exists() {
    return Err(format!(
      "Target path already exists: {}",
      target_path.to_string_lossy()
    ));
  }

  let asset_bytes = read_app_asset(app_handle, relative_path)?;
  let mut zip = zip::ZipArchive::new(std::io::Cursor::new(asset_bytes))
    .map_err(|e| format!("unzip_app_asset_to_fs: {}", e))?;
  zip
    .extract(target_path)
    .map_err(|e| format!("unzip_app_asset_to_fs: {}", e))?;
  Ok(())
}
