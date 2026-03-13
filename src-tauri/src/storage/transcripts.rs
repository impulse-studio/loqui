use rusqlite::{Result, Row};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptRow {
    pub id: String,
    pub raw_text: String,
    pub refactored_text: Option<String>,
    pub app_name: String,
    pub window_title: String,
    pub profile_id: Option<String>,
    pub profile_name: Option<String>,
    pub word_count: i64,
    pub duration: f64,
    pub words_per_second: f64,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: String,
    pub llm_provider: String,
    pub llm_model_used: String,
    pub llm_input_tokens: i64,
    pub llm_output_tokens: i64,
    pub llm_cost: f64,
}

impl TranscriptRow {
    pub fn from_row(row: &Row) -> Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            raw_text: row.get("raw_text")?,
            refactored_text: row.get("refactored_text")?,
            app_name: row.get("app_name")?,
            window_title: row.get("window_title")?,
            profile_id: row.get("profile_id")?,
            profile_name: row.get("profile_name")?,
            word_count: row.get("word_count")?,
            duration: row.get("duration")?,
            words_per_second: row.get("words_per_second")?,
            status: row.get("status")?,
            error_message: row.get("error_message")?,
            created_at: row.get("created_at")?,
            llm_provider: row.get("llm_provider")?,
            llm_model_used: row.get("llm_model_used")?,
            llm_input_tokens: row.get("llm_input_tokens")?,
            llm_output_tokens: row.get("llm_output_tokens")?,
            llm_cost: row.get("llm_cost")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityRow {
    pub date: String,
    pub count: i64,
    pub words: i64,
}

pub trait TranscriptStore {
    fn get_transcripts(
        &self,
        search: Option<String>,
        filter: Option<String>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<TranscriptRow>>;
    fn get_transcript(&self, id: &str) -> Result<TranscriptRow>;
    fn save_transcript(&self, transcript: &TranscriptRow) -> Result<()>;
    fn delete_transcript(&self, id: &str) -> Result<()>;
    fn get_transcript_stats(&self) -> Result<serde_json::Value>;
    fn get_activity(&self, days: i64) -> Result<Vec<ActivityRow>>;
    fn get_detected_apps(&self) -> Result<Vec<String>>;
    fn get_db_size(&self) -> Result<i64>;
    fn prune_transcripts(&self, max_bytes: i64) -> Result<i64>;
}
