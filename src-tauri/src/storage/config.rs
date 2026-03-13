use rusqlite::Result;

pub trait ConfigStore {
    fn get_config(&self, key: &str) -> Result<Option<String>>;
    fn set_config(&self, key: &str, value: &str) -> Result<()>;
    fn get_all_config(&self) -> Result<serde_json::Value>;
}
