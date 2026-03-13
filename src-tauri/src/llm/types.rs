use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmModelInfo {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub size: u64,
    pub sha256: String,
    pub url: String,
    pub context_window: u64,
    pub description: String,
}

impl crate::model_manager::download::ModelInfo for LlmModelInfo {
    fn id(&self) -> &str {
        &self.id
    }
    fn file_name(&self) -> &str {
        &self.file_name
    }
    fn size(&self) -> u64 {
        self.size
    }
    fn url(&self) -> &str {
        &self.url
    }
    fn sha256(&self) -> &str {
        &self.sha256
    }
}

pub type LlmModelStatus = crate::model_manager::types::ModelStatus<LlmModelInfo>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefactorResult {
    pub text: String,
    pub model_used: String,
    pub duration_ms: u64,
    pub input_tokens: u64,
    pub output_tokens: u64,
}
