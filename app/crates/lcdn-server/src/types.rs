use arc_swap::ArcSwap;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use serde_with::{DurationMilliSeconds, TimestampMilliSeconds, serde_as};
use std::{
  fs::File,
  path::PathBuf,
  sync::Arc,
  time::{Duration, SystemTime},
};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LcdnError {
  #[error("Failed to start LCDN server: {0:?}")]
  CannotRun(std::io::Error),
  #[error("Failed to check why LCDN server failed")]
  CannotRunAndJoin,
  #[error("Failed to stop LCDN server: channel is already closed")]
  CannotStop,
  #[error("Healthcheck error: {0:?}")]
  HealthcheckError(reqwest::Error),
  #[error("Healthcheck failed, status code: {0}")]
  HealthcheckFailed(u16),
  #[error("Instance config not found: {0}")]
  InstanceConfigNotFound(String),
  #[error("Instance config invalid: {0}: {1:#?}")]
  InstanceConfigInvalid(String, serde_json::Error),
  #[error("Another shutdown request is in progress")]
  ShutdownInProgress,
}

#[serde_as]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LcdnConfig {
  pub port: u16,
  #[serde_as(as = "DurationMilliSeconds<u64>")]
  pub startup_timeout: Duration,
  pub instance_ids: Vec<String>,
}

#[serde_as]
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceConfig {
  pub instance_id: String,
  pub slug: String,
  pub name: String,
  pub template_scope: String,
  pub template_id: String,
  pub template_version: String,
  #[serde_as(as = "TimestampMilliSeconds<i64>")]
  pub created_at: SystemTime,
  #[serde_as(as = "TimestampMilliSeconds<i64>")]
  pub updated_at: SystemTime,
  pub current_variant: String,
  pub variants: Vec<String>,
}

impl Default for LcdnConfig {
  fn default() -> Self {
    Self {
      port: 8088,
      startup_timeout: Duration::from_millis(3000),
      instance_ids: vec![],
    }
  }
}

#[derive(Clone, Debug)]
pub struct AppState {
  pub lcdn_config: Arc<ArcSwap<LcdnConfig>>,
  pub instance_configs: Arc<ArcSwap<DashMap<String, InstanceConfig>>>,
  // Path to the public content directory, containing /instances and /templates
  pub public_content_path: Arc<PathBuf>,
}

impl AppState {
  pub(crate) fn replace_configs(
    &self,
    lcdn_config: LcdnConfig,
    instance_configs: DashMap<String, InstanceConfig>,
  ) {
    self.lcdn_config.store(Arc::new(lcdn_config));
    self.instance_configs.store(Arc::new(instance_configs));
  }

  pub(crate) fn from_complete_configs(
    mut lcdn_config: LcdnConfig,
    instance_configs_raw: Vec<InstanceConfig>,
    public_content_path: PathBuf,
  ) -> Self {
    let instance_configs: DashMap<String, InstanceConfig> = DashMap::new();
    for instance_config in instance_configs_raw.iter() {
      instance_configs.insert(instance_config.slug.clone(), instance_config.clone());
    }
    lcdn_config.instance_ids = instance_configs_raw
      .iter()
      .map(|instance_config| instance_config.instance_id.clone())
      .collect();

    Self {
      lcdn_config: Arc::new(ArcSwap::new(Arc::new(lcdn_config))),
      instance_configs: Arc::new(ArcSwap::new(Arc::new(instance_configs))),
      public_content_path: Arc::new(public_content_path),
    }
  }

  pub fn from_config(
    lcdn_config: LcdnConfig,
    public_content_path: PathBuf,
  ) -> Result<Self, LcdnError> {
    let mut instance_configs: Vec<InstanceConfig> = Vec::new();
    for instance_id in lcdn_config.instance_ids.iter() {
      let config_path =
        public_content_path.join(format!("instances/{}/instance.json", instance_id));
      let config_file = File::open(config_path)
        .map_err(|_| LcdnError::InstanceConfigNotFound(instance_id.clone()))?;
      let config = serde_json::from_reader::<File, InstanceConfig>(config_file)
        .map_err(|e| LcdnError::InstanceConfigInvalid(instance_id.clone(), e))?;
      instance_configs.push(config);
    }
    Ok(Self::from_complete_configs(
      lcdn_config,
      instance_configs,
      public_content_path,
    ))
  }
}
