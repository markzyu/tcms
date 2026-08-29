mod lcdnfs;

use std::path::PathBuf;

use lcdn_server::{AppState, LcdnConfig, LcdnStatus};
use tauri::AppHandle;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
  format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn get_template_install_dir(
  app_handle: AppHandle,
  template_scope: &str,
  template_name: &str,
) -> Result<PathBuf, String> {
  let public_path = lcdnfs::ensure_templates_dir(&app_handle, template_scope)?;
  let public_path = public_path.join(format!("{}.zip", template_name));
  let mut template_asset_path = PathBuf::from("templates");
  template_asset_path.push(template_scope);
  template_asset_path.push(format!("{}.zip", template_name));
  lcdnfs::copy_app_asset_to_fs(&app_handle, &template_asset_path, &public_path)?;
  Ok(public_path)
}

const EXAMPLE_INSTANCE_ID: &'static str = "6fa27a2f-2f1e-413d-a842-424242424242";

#[tauri::command]
async fn get_prefab_instance_install_dir(
  app_handle: AppHandle,
  instance_id: String,
) -> Result<PathBuf, String> {
  let instances_dir = lcdnfs::ensure_instances_dir(&app_handle)?;
  let instance_id_dir = instances_dir.join(&instance_id);
  let mut instance_asset_path = PathBuf::from("instances");
  instance_asset_path.push(format!("{}.zip", instance_id));
  lcdnfs::unzip_app_asset_to_fs(&app_handle, &instance_asset_path, &instance_id_dir)?;
  Ok(instance_id_dir)
}

#[tauri::command]
async fn perform_first_time_setup(app_handle: AppHandle) -> Result<(), String> {
  lcdnfs::ensure_os_data_dir(&app_handle)?;
  get_template_install_dir(app_handle.clone(), "@tcms", "template-example-info-card1").await?;
  get_template_install_dir(app_handle.clone(), "@tcms", "template-game-dropnclick").await?;
  get_prefab_instance_install_dir(app_handle, EXAMPLE_INSTANCE_ID.to_string()).await?;
  Ok(())
}

#[tauri::command]
async fn ensure_os_data_dir(app_handle: AppHandle) -> Result<PathBuf, String> {
  lcdnfs::ensure_os_data_dir(&app_handle)
}

#[tauri::command]
async fn read_template_schema(
  app_handle: AppHandle,
  template_scope: String,
  template_name: String,
) -> Result<String, String> {
  lcdnfs::read_template_schema(&app_handle, &template_scope, &template_name)
}

#[tauri::command]
async fn read_template_manifest(
  app_handle: AppHandle,
  template_scope: String,
  template_name: String,
) -> Result<String, String> {
  lcdnfs::read_template_manifest(&app_handle, &template_scope, &template_name)
}

#[tauri::command]
async fn lcdn_start(lcdn_config: LcdnConfig, public_content_path: String) -> Result<(), String> {
  let app_state = AppState::from_config(lcdn_config, PathBuf::from(public_content_path))
    .map_err(|e| e.to_string())?;
  lcdn_server::start_lcdn_server(app_state)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn lcdn_stop() -> Result<(), String> {
  lcdn_server::stop_lcdn_server()
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn lcdn_reload_configs() -> Result<(), String> {
  lcdn_server::reload_configs(std::time::Duration::from_secs(2))
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn lcdn_status() -> LcdnStatus {
  lcdn_server::get_lcdn_server_status()
}

#[tauri::command]
async fn list_templates(app_handle: AppHandle) -> Result<Vec<(String, String)>, String> {
  lcdnfs::list_templates(&app_handle)
}

#[tauri::command]
async fn list_instances(app_handle: AppHandle) -> Result<Vec<String>, String> {
  lcdnfs::list_instances(&app_handle)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Setup the Reqwest client to use Ring/Rustls
  lcdn_server::setup_rustls();

  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      ensure_os_data_dir,
      get_prefab_instance_install_dir,
      get_template_install_dir,
      greet,
      perform_first_time_setup,
      read_template_manifest,
      read_template_schema,
      lcdn_start,
      lcdn_stop,
      lcdn_reload_configs,
      lcdn_status,
      list_templates,
      list_instances,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
