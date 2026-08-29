use std::cell::RefCell;
use std::io::Read;
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

fn _get_template_asset_path(template_scope: &String, template_name: &String) -> Result<PathBuf, String> {
  let mut template_asset_path = PathBuf::from("templates");
  if !template_scope.is_empty() {
    template_asset_path.push(template_scope);
  }
  template_asset_path.push(template_name);
  template_asset_path.set_extension("zip");
  Ok(template_asset_path)
}

pub(crate) fn read_template_schema(
  app_handle: &AppHandle,
  template_scope: &String,
  template_name: &String,
) -> Result<String, String> {
  let template_asset_path = _get_template_asset_path(template_scope, template_name)?;
  let zip_data = read_app_asset(app_handle, &template_asset_path)?;
  let mut zip = zip::ZipArchive::new(std::io::Cursor::new(zip_data))
    .map_err(|e| format!("read_template_schema: {}", e))?;

  let mut schema_file_path = PathBuf::from("dist");
  schema_file_path.push("schema");
  schema_file_path.push("main.schema.json");
  let mut schema_file = zip
    .by_path(&schema_file_path)
    .map_err(|e| format!("read_template_schema: {}", e))?;
  let mut schema_data = String::new();
  schema_file
    .read_to_string(&mut schema_data)
    .map_err(|e| format!("read_template_schema: {}", e))?;
  Ok(schema_data)
}

pub(crate) fn read_template_manifest(
  app_handle: &AppHandle,
  template_scope: &String,
  template_name: &String,
) -> Result<String, String> {
  let template_asset_path = _get_template_asset_path(template_scope, template_name)?;
  let zip_data = read_app_asset(app_handle, &template_asset_path)?;
  let mut zip = zip::ZipArchive::new(std::io::Cursor::new(zip_data))
    .map_err(|e| format!("read_template_manifest: {}", e))?;

  let mut manifest_file_path = PathBuf::from("dist");
  manifest_file_path.push("manifest.json");
  let mut manifest_file = zip
    .by_path(&manifest_file_path)
    .map_err(|e| format!("read_template_manifest: {}", e))?;
  let mut manifest_data = String::new();
  manifest_file
    .read_to_string(&mut manifest_data)
    .map_err(|e| format!("read_template_manifest: {}", e))?;
  Ok(manifest_data)
}

pub(crate) fn list_templates(app_handle: &AppHandle) -> Result<Vec<(String, String)>, String> {
  let public_dir = get_compat_os_data_dir(app_handle)?.join("public");
  let templates_dir = public_dir.join("templates");

  // Iterator #1: Scope-less templates
  let templates = std::fs::read_dir(&templates_dir).map_err(|e| format!("list_templates: {}", e))?;
  let scope_less_templates = templates.filter_map(|entry| {
    if let Ok(entry) = entry {
      let Ok(file_type) = entry.file_type() else {
        return None;
      };
      if !file_type.is_file() {
        return None;
      }
      if let Some(extension) = entry.path().extension() {
        if extension != "zip" {
          return None;
        }
      }
      return Some(("".to_string(), entry.file_name().to_string_lossy().to_string()));
    }
    None
  });

  // Iterator #2: Scoped templates
  let templates = std::fs::read_dir(&templates_dir).map_err(|e| format!("list_templates: {}", e))?;
  let mut errors: Vec<String> = Vec::new();
  let has_errors: RefCell<bool> = RefCell::new(false);
  let scoped_templates = templates.flat_map(|entry| {
    if let Ok(entry) = entry {
      let Ok(file_type) = entry.file_type() else {
        return Vec::new();
      };
      if !file_type.is_dir() {
        return Vec::new();
      }
      if !entry.file_name().to_string_lossy().starts_with("@") {
        return Vec::new();
      }
      let entries = std::fs::read_dir(entry.path());
      if let Err(e) = entries {
        *has_errors.borrow_mut() = true;
        errors.push(format!("read_dir({}) failed: {}", entry.path().to_string_lossy(), e));
        return Vec::new();
      }
      let scope_name = entry.file_name().to_string_lossy().to_string();
      let result: Vec<(String, String)> = entries.unwrap().filter_map(|entry| {
        if let Ok(entry) = entry {
          let Ok(file_type) = entry.file_type() else {
            return None;
          };
          if !file_type.is_file() {
            return None;
          }
          if let Some(extension) = entry.path().extension() {
            if extension != "zip" {
              return None;
            }
          }
          let template_name = entry.file_name().to_string_lossy().to_string();
          return Some((scope_name.clone(), template_name));
        }
        None
      }).collect();
      return result;
    }
    Vec::new()
  });

  if *has_errors.borrow() {
    Err(format!("list_templates: {}", errors.join("\n")))
  } else {
    Ok(scope_less_templates.chain(scoped_templates).collect())
  }
}

pub(crate) fn list_instances(app_handle: &AppHandle) -> Result<Vec<String>, String> {
  let public_dir = get_compat_os_data_dir(app_handle)?.join("public");
  let instances_dir = public_dir.join("instances");
  let instances = std::fs::read_dir(instances_dir).map_err(|e| format!("list_instances: {}", e))?;
  let instances: Vec<String> = instances.filter_map(|entry| {
    if let Ok(entry) = entry {
      let Ok(file_type) = entry.file_type() else {
        return None;
      };
      if !file_type.is_dir() {
        return None;
      }
      return Some(entry.file_name().to_string_lossy().to_string());
    }
    None
  }).collect();
  Ok(instances)
}