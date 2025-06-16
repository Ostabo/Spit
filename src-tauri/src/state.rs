use ollama_rs::generation::chat::ChatMessage;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::Mutex as TokioMutex;
use tokio_util::sync::CancellationToken;

pub static CHAT_HISTORY: Lazy<Mutex<Vec<ChatMessage>>> = Lazy::new(|| Mutex::new(Vec::new()));
pub static DOWNLOADING_MODELS: Mutex<Vec<String>> = Mutex::new(Vec::new());
pub static CANCEL_TOKENS: Lazy<TokioMutex<HashMap<String, CancellationToken>>> =
    Lazy::new(|| TokioMutex::new(HashMap::new()));
