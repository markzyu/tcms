use lcdn_server::{LcdnConfig, start_lcdn_server, stop_lcdn_server};

#[tokio::main]
async fn main() {
  let config = LcdnConfig::default();
  let port: u16 = config.port;

  println!("Starting LCDN server...");

  let result = start_lcdn_server(config).await;
  if let Err(e) = result {
    eprintln!("Failed to start LCDN server: {}", e);
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
