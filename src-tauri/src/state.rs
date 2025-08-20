use crate::model::Conversation;
use ollama_rs::generation::chat::ChatMessage;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::Mutex as TokioMutex;
use tokio_util::sync::CancellationToken;

pub static CONVERSATIONS: Lazy<Mutex<HashMap<String, Conversation>>> = Lazy::new(|| Mutex::new(HashMap::new()));
pub static CURRENT_CONVERSATION_ID: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
pub static DOWNLOADING_MODELS: Mutex<Vec<String>> = Mutex::new(Vec::new());
pub static CANCEL_TOKENS: Lazy<TokioMutex<HashMap<String, CancellationToken>>> =
    Lazy::new(|| TokioMutex::new(HashMap::new()));

// Helper functions
pub fn get_current_conversation_messages() -> Vec<ChatMessage> {
    let current_id = CURRENT_CONVERSATION_ID.lock().unwrap();
    if let Some(id) = current_id.as_ref() {
        let conversations = CONVERSATIONS.lock().unwrap();
        if let Some(conversation) = conversations.get(id) {
            return conversation.messages.clone();
        }
    }
    Vec::new()
}

pub fn add_message_to_current_conversation(message: ChatMessage) {
    let current_id = CURRENT_CONVERSATION_ID.lock().unwrap();
    if let Some(id) = current_id.as_ref() {
        let mut conversations = CONVERSATIONS.lock().unwrap();
        if let Some(conversation) = conversations.get_mut(id) {
            conversation.messages.push(message);
            conversation.update_timestamp();
            // Update name from first meaningful message
            if conversation.name == "New Conversation" {
                conversation.update_name_from_first_message();
            }
        }
    }
}
