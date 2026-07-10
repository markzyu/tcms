use arc_swap::ArcSwapOption;
use dashmap::DashMap;
use tokio::sync::mpsc::Sender;

use crate::types::{InstanceConfig, LcdnConfig};

// Note: Though these are thread-safe, please don't obtain write-guards from async code.
//       (Write guards should only be held onto, within a synchronous function)
//       (Reads guards, and atomic writes, are ok within async code)
pub(crate) static SHUTDOWN_CHANNEL: ArcSwapOption<Sender<()>> = ArcSwapOption::const_empty();
pub(crate) static LCDN_CONFIG: ArcSwapOption<LcdnConfig> = ArcSwapOption::const_empty();
pub(crate) static INSTANCE_CONFIGS: ArcSwapOption<DashMap<String, InstanceConfig>> =
  ArcSwapOption::const_empty();
