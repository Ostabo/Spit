use ollama_rs::generation::chat::request::ChatMessageRequest;
use ollama_rs::generation::chat::{ChatMessage, MessageRole};
use ollama_rs::generation::completion::request::GenerationRequest;
use ollama_rs::generation::images::Image;
use ollama_rs::models::LocalModel;
use ollama_rs::Ollama;
use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri::command;

static CHAT_HISTORY: Lazy<Mutex<Vec<ChatMessage>>> = Lazy::new(|| Mutex::new(Vec::new()));

#[command]
async fn call_ollama_api(prompt: String, model: String) -> Result<String, String> {
    let ollama = Ollama::default();
    let req = GenerationRequest::new(model.parse().unwrap(), &prompt);
    match ollama.generate(req).await {
        Ok(response) => Ok(response.response),
        Err(e) => Err(format!("Ollama error: {}", e)),
    }
}

#[command]
async fn call_ollama_chat(prompt: String, model: String) -> Result<String, String> {
    let ollama = Ollama::default();
    let history_clone = {
        let mut h = CHAT_HISTORY.lock().unwrap();
        h.push(ChatMessage::new(MessageRole::User, prompt));
        h.clone()
    };
    let req = ChatMessageRequest::new(model.parse().unwrap(), history_clone.clone());
    match ollama.send_chat_messages(req).await {
        Ok(response) => Ok(response.message.content),
        Err(e) => Err(format!("Ollama error: {}", e)),
    }
}

#[command]
async fn call_ollama_api_with_image(
    prompt: String,
    model: String,
    image_data_base64: String,
) -> Result<String, String> {
    let ollama = Ollama::default();

    let req = GenerationRequest::new(model.parse().unwrap(), &prompt)
        .images(vec![Image::from_base64(image_data_base64)]);

    match ollama.generate(req).await {
        Ok(response) => Ok(response.response),
        Err(e) => Err(format!("Ollama error: {}", e)),
    }
}

#[command]
async fn ollama_list() -> Result<Vec<LocalModel>, String> {
    let ollama = Ollama::default();
    match ollama.list_local_models().await {
        Ok(models) => Ok(models),
        Err(e) => Err(format!("Ollama error: {}", e)),
    }
}

#[command]
async fn ollama_add_model(name: String) -> Result<String, String> {
    let ollama = Ollama::default();
    match ollama.pull_model(name.clone(), false).await {
        Ok(res) => Ok(format!("Model '{}' added: {:?}", name, res)),
        Err(e) => Err(format!("Failed to add model: {}", e)),
    }
}

#[command]
async fn ollama_delete_model(name: String) -> Result<String, String> {
    let ollama = Ollama::default();
    match ollama.delete_model(name.clone()).await {
        Ok(_) => Ok(format!("Model '{}' deleted.", name)),
        Err(e) => Err(format!("Failed to delete model: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            call_ollama_api,
            call_ollama_chat,
            call_ollama_api_with_image,
            ollama_list,
            ollama_add_model,
            ollama_delete_model
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
