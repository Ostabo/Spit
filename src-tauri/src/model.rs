use serde::{Serialize, Deserialize};
use ollama_rs::generation::chat::ChatMessage;

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

#[derive(Serialize, Deserialize, Clone)]
pub struct Conversation {
    pub id: String,
    pub name: String,
    pub messages: Vec<ChatMessage>,
    pub created_at: String,
    pub updated_at: String,
}

impl Conversation {
    pub fn new(id: String) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id,
            name: "New Conversation".to_string(),
            messages: Vec::new(),
            created_at: now.clone(),
            updated_at: now,
        }
    }

    pub fn update_name_from_first_message(&mut self) {
        if let Some(first_message) = self.messages.iter().find(|msg| !msg.content.is_empty()) {
            let content = first_message.content.clone();
            // Take first 50 characters and remove line breaks
            self.name = content
                .chars()
                .take(50)
                .collect::<String>()
                .replace('\n', " ")
                .replace('\r', " ")
                .trim()
                .to_string();
            
            if self.name.is_empty() {
                self.name = "New Conversation".to_string();
            }
        }
    }

    pub fn update_timestamp(&mut self) {
        self.updated_at = chrono::Utc::now().to_rfc3339();
    }
}
