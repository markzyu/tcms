use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_with::{DurationMilliSeconds, serde_as};
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

#[serde_as]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcdnConfig {
  pub port: u16,
  #[serde_as(as = "DurationMilliSeconds<u64>")]
  pub startup_timeout: Duration,
  #[serde_as(as = "DurationMilliSeconds<u64>")]
  pub healthcheck_timeout: Duration,
  pub instance_ids: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceConfig {
  pub instance_id: String,
  pub slug: String,
  pub name: String,
  pub template_id: String,
  pub created_at: DateTime<Utc>,
  pub updated_at: DateTime<Utc>,
  pub current_variant: String,
  pub variants: Vec<String>,
}

impl Default for LcdnConfig {
  fn default() -> Self {
    Self {
      port: 8088,
      startup_timeout: Duration::from_millis(1500),
      healthcheck_timeout: Duration::from_secs(3),
      instance_ids: vec![],
    }
  }
}
