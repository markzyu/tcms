use std::path::PathBuf;

use lcdn_server::{AppState, LcdnConfig, LcdnStatus};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
  format!("Hello, {}! You've been greeted from Rust!", name)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      greet,
      lcdn_start,
      lcdn_stop,
      lcdn_reload_configs,
      lcdn_status
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
