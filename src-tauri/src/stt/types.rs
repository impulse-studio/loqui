use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub size: u64,
    pub sha256: String,
    pub url: String,
    pub accuracy_tier: String,
    pub description: String,
}

impl crate::model_manager::download::ModelInfo for ModelInfo {
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

pub type ModelStatus = crate::model_manager::types::ModelStatus<ModelInfo>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionResult {
    pub text: String,
    pub duration_ms: u64,
}
