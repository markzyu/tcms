use std::io::Write;
use std::path::PathBuf;

use lcdn_server::{
  AppState, LcdnConfig, reload_configs, setup_rustls, start_lcdn_server, stop_lcdn_server,
};

#[tokio::main]
async fn main() {
  setup_rustls();

  // read config from public/lcdn-config.json
  let public_content_path = PathBuf::from("public");
  let config_path = public_content_path.join("lcdn-config.json");
  let Ok(config_file) = std::fs::read_to_string(config_path) else {
    eprintln!("Failed to read config file: public/lcdn-config.json");
    std::process::exit(1);
  };
  let Ok(config) = serde_json::from_str::<LcdnConfig>(&config_file) else {
    eprintln!("Failed to parse config file");
    std::process::exit(1);
  };
  let port: u16 = config.port;

  println!("Starting LCDN server...");

  let app_state = AppState::from_config(config, public_content_path);
  let app_state_copy = if let Ok(app_state) = app_state {
    start_lcdn_server(app_state.clone())
      .await
      .and_then(|_| Ok(app_state))
  } else {
    app_state
  };
  if let Err(e) = app_state_copy {
    eprintln!("Error: {}", e);
    std::process::exit(1);
  }

  println!("LCDN server started on port {}", port);

  loop {
    if let Err(e) = tokio::signal::ctrl_c().await {
      eprintln!(
        "Failed to keep terminal session open: {}. Shutting down...",
        e
      );
    }

    // Ask user for desired action (stop / reload / restart)
    let mut input = String::new();
    print!("\nCommand (stop / reload / restart. default is to stop): ");
    std::io::stdout().flush().unwrap();
    std::io::stdin().read_line(&mut input).unwrap();
    let input = input.trim();
    if input == "reload" {
      eprintln!("Reloading LCDN server configs...");
      if let Err(e) = reload_configs(std::time::Duration::from_secs(2)).await {
        eprintln!("Failed to reload configs: {}", e);
      }
    } else if input == "restart" {
      eprintln!("Restarting LCDN server...");
      if let Err(e) = stop_lcdn_server().await {
        eprintln!("Failed to stop LCDN server: {}", e);
        std::process::exit(1);
      }
      if let Err(e) = start_lcdn_server(app_state_copy.as_ref().unwrap().clone()).await {
        eprintln!("Failed to start LCDN server: {}", e);
        std::process::exit(1);
      }
      eprintln!("LCDN server restarted");
    } else {
      eprintln!("Stopping LCDN server...");
      break;
    }
  }

  let result = stop_lcdn_server().await;
  if let Err(e) = result {
    eprintln!("Failed to stop LCDN server: {}", e);
    std::process::exit(1);
  }

  std::process::exit(0);
}
