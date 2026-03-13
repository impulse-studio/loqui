use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus<T: Clone> {
    #[serde(flatten)]
    pub info: T,
    pub downloaded: bool,
}
