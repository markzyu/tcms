use std::time::Duration;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LcdnError {
  #[error("Failed to run LCDN server: {0:?}")]
  CannotRun(std::io::Error),
  #[error("Failed to run LCDN server: {0:?}")]
  CannotRun2(tokio::task::JoinError),
  #[error("Failed to stop LCDN server: channel is already closed")]
  CannotStop,
  #[error("Failed to start healthcheck: {0:?}")]
  CannotStartHealthcheck(reqwest::Error),
  #[error("Healthcheck failed, status code: {0}")]
  HealthcheckFailed(u16),
}

pub struct LcdnConfig {
  pub port: u16,
  pub startup_timeout: Duration,
  pub healthcheck_timeout: Duration,
}

impl Default for LcdnConfig {
  fn default() -> Self {
    Self {
      port: 8088,
      startup_timeout: Duration::from_millis(1500),
      healthcheck_timeout: Duration::from_secs(3),
    }
  }
}
