use std::time::Duration;

pub struct ModelManagerConfig {
    pub dir_name: &'static str,
    pub event_prefix: &'static str,
    pub error_label: &'static str,
    pub connect_timeout: Option<Duration>,
}
