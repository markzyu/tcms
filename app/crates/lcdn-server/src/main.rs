use std::path::PathBuf;

use lcdn_server::{LcdnConfig, setup_rustls, start_lcdn_server, stop_lcdn_server};

#[tokio::main]
async fn main() {
  setup_rustls();

  // read config from public/lcdn-config.json
  let Ok(config_file) = std::fs::read_to_string("public/lcdn-config.json") else {
    eprintln!("Failed to read config file: public/lcdn-config.json");
    std::process::exit(1);
  };
  let Ok(config) = serde_json::from_str::<LcdnConfig>(&config_file) else {
    eprintln!("Failed to parse config file");
    std::process::exit(1);
  };
  let port: u16 = config.port;

  println!("Starting LCDN server...");

  let result = start_lcdn_server(config, PathBuf::from("public")).await;
  if let Err(e) = result {
    eprintln!("Error: {}", e);
    std::process::exit(1);
  }

  println!("LCDN server started on port {}", port);

  if let Err(e) = tokio::signal::ctrl_c().await {
    eprintln!(
      "Failed to keep terminal session open: {}. Shutting down...",
      e
    );
  }

  let result = stop_lcdn_server().await;
  if let Err(e) = result {
    eprintln!("Failed to stop LCDN server: {}", e);
    std::process::exit(1);
  }

  std::process::exit(0);
}
