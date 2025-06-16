use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct LocalModelWithTemporary {
    pub name: String,
    pub size: u64,
    pub modified_at: String,
    pub temporary: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StreamChunk {
    pub content: String,
    pub done: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StreamError {
    pub error: String,
}

#[derive(Serialize, Clone)]
pub struct SerializablePullModelStatus {
    pub message: String,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
}
