use rusqlite::{Result, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileRow {
    pub id: String,
    pub name: String,
    pub system_prompt: String,
    pub app_mappings: String,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
    pub llm_model: String,
    pub context_size: i64,
    pub llm_enabled: bool,
    pub llm_provider: String,
}

impl ProfileRow {
    pub fn from_row(row: &Row) -> Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            system_prompt: row.get("system_prompt")?,
            app_mappings: row.get("app_mappings")?,
            is_default: row.get("is_default")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            llm_model: row.get("llm_model")?,
            context_size: row.get("context_size")?,
            llm_enabled: row.get("llm_enabled")?,
            llm_provider: row.get("llm_provider")?,
        })
    }
}

pub trait ProfileStore {
    fn get_profiles(&self) -> Result<Vec<ProfileRow>>;
    fn get_profile(&self, id: &str) -> Result<ProfileRow>;
    fn save_profile(&self, profile: &ProfileRow) -> Result<()>;
    fn delete_profile(&self, id: &str) -> Result<()>;
}
