use crate::model::*;
use crate::state::*;
use ollama_rs::generation::chat::request::ChatMessageRequest;
use ollama_rs::generation::chat::{ChatMessage, MessageRole};
use ollama_rs::generation::completion::request::GenerationRequest;
use ollama_rs::generation::images::Image;
use ollama_rs::Ollama;
use std::ops::DerefMut;
use std::collections::HashMap;
use tauri::{command, AppHandle, Emitter};
use tauri_plugin_store::StoreExt;
use serde_json::json;

#[command]
pub async fn call_ollama_api(prompt: String, model: String) -> Result<String, String> {
    let ollama = Ollama::default();
    let req = GenerationRequest::new(model.parse().unwrap(), &prompt);
    match ollama.generate(req).await {
        Ok(response) => Ok(response.response),
        Err(e) => Err(format!("Ollama error: {}", e)),
    }
}

#[command]
pub async fn call_ollama_chat(prompt: String, model: String) -> Result<String, String> {
    let ollama = Ollama::default();
    let history_clone = {
        let user_message = ChatMessage::new(MessageRole::User, prompt);
        add_message_to_current_conversation(user_message);
        get_current_conversation_messages()
    };
    let req = ChatMessageRequest::new(model.parse().unwrap(), history_clone.clone());
    match ollama.send_chat_messages(req).await {
        Ok(response) => {
            let assistant_message = ChatMessage::new(MessageRole::Assistant, response.message.content.clone());
            add_message_to_current_conversation(assistant_message);
            Ok(response.message.content)
        }
        Err(e) => Err(format!("Ollama error: {}", e)),
    }
}

#[command]
pub async fn call_ollama_api_with_image(
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
pub async fn call_ollama_api_stream(
    app: AppHandle,
    prompt: String,
    model: String,
) -> Result<(), ()> {
    let ollama = Ollama::default();
    let req = GenerationRequest::new(model.parse().unwrap(), &prompt);
    let mut stream = match ollama.generate_stream(req).await {
        Ok(s) => s,
        Err(e) => {
            let _ = app.emit(
                "ollama_stream_error",
                StreamError {
                    error: format!("Ollama error: {}", e),
                },
            );
            return Err(());
        }
    };
    use tokio_stream::StreamExt;
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(responses) => {
                for resp in responses {
                    let _ = app.emit(
                        "ollama_stream_chunk",
                        StreamChunk {
                            content: resp.response.clone(),
                            done: resp.done,
                        },
                    );
                    if resp.done {
                        let _ = app.emit("ollama_stream_done", ());
                    }
                }
            }
            Err(e) => {
                let _ = app.emit(
                    "ollama_stream_error",
                    StreamError {
                        error: format!("Ollama error: {}", e),
                    },
                );
                return Err(());
            }
        }
    }
    Ok(())
}

#[command]
pub async fn call_ollama_chat_stream(
    app: AppHandle,
    prompt: String,
    model: String,
) -> Result<(), ()> {
    let ollama = Ollama::default();
    let history_clone = {
        let user_message = ChatMessage::new(MessageRole::User, prompt);
        add_message_to_current_conversation(user_message);
        get_current_conversation_messages()
    };
    let req = ChatMessageRequest::new(model.parse().unwrap(), history_clone.clone());
    let mut stream = match ollama.send_chat_messages_stream(req).await {
        Ok(s) => s,
        Err(e) => {
            let _ = app.emit(
                "ollama_stream_error",
                StreamError {
                    error: format!("Ollama error: {}", e),
                },
            );
            return Err(());
        }
    };
    use tokio_stream::StreamExt;
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(responses) => {
                let _ = app.emit(
                    "ollama_stream_chunk",
                    StreamChunk {
                        content: responses.message.content.clone(),
                        done: responses.done,
                    },
                );
                if responses.done {
                    let _ = app.emit("ollama_stream_done", ());
                    let assistant_message = ChatMessage::new(MessageRole::Assistant, responses.message.content.clone());
                    add_message_to_current_conversation(assistant_message);
                }
            }
            Err(e) => {
                let _ = app.emit(
                    "ollama_stream_error",
                    StreamError {
                        error: format!("Ollama error: {:?}", e),
                    },
                );
                return Err(());
            }
        }
    }
    Ok(())
}

#[command]
pub async fn call_ollama_api_with_image_stream(
    app: AppHandle,
    prompt: String,
    model: String,
    image_data_base64: String,
) -> Result<(), ()> {
    let ollama = Ollama::default();
    let req = GenerationRequest::new(model.parse().unwrap(), &prompt)
        .images(vec![Image::from_base64(image_data_base64)]);
    let mut stream = match ollama.generate_stream(req).await {
        Ok(s) => s,
        Err(e) => {
            let _ = app.emit(
                "ollama_stream_error",
                StreamError {
                    error: format!("Ollama error: {}", e),
                },
            );
            return Err(());
        }
    };
    use tokio_stream::StreamExt;
    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(responses) => {
                for resp in responses {
                    let _ = app.emit(
                        "ollama_stream_chunk",
                        StreamChunk {
                            content: resp.response.clone(),
                            done: resp.done,
                        },
                    );
                    if resp.done {
                        let _ = app.emit("ollama_stream_done", ());
                    }
                }
            }
            Err(e) => {
                let _ = app.emit(
                    "ollama_stream_error",
                    StreamError {
                        error: format!("Ollama error: {}", e),
                    },
                );
                return Err(());
            }
        }
    }
    Ok(())
}

#[command]
pub async fn ollama_list() -> Result<Vec<LocalModelWithTemporary>, String> {
    let ollama = Ollama::default();
    let current_downloading = &mut DOWNLOADING_MODELS
        .lock()
        .unwrap()
        .deref_mut()
        .iter()
        .map(|model_name| LocalModelWithTemporary {
            name: model_name.clone(),
            size: 0,
            modified_at: "N/A".to_string(),
            temporary: true,
        })
        .collect::<Vec<LocalModelWithTemporary>>();
    match ollama.list_local_models().await {
        Ok(models) => {
            let mut models: Vec<LocalModelWithTemporary> = models
                .iter()
                .map(|model| LocalModelWithTemporary {
                    name: model.name.clone(),
                    size: model.size,
                    modified_at: model.modified_at.to_string(),
                    temporary: false,
                })
                .collect();
            models.append(current_downloading);
            Ok(models)
        }
        Err(e) => Err(format!("Ollama error: {}", e)),
    }
}

#[command]
pub async fn ollama_add_model(app: AppHandle, name: String) -> Result<(), ()> {
    let ollama = Ollama::default();
    let name = if name.contains(":") {
        name
    } else {
        format!("{}:latest", name)
    };
    {
        let mut downloading = DOWNLOADING_MODELS.lock().unwrap();
        if downloading.contains(&name) {
            let _ = app.emit(
                "ollama_add_model_error",
                format!("Model '{}' is already being downloaded.", name),
            );
            return Err(());
        }
        downloading.push(name.clone());
    }
    let cancel_token = tokio_util::sync::CancellationToken::new();
    {
        let mut map = CANCEL_TOKENS.lock().await;
        map.insert(name.clone(), cancel_token.clone());
    }
    use tokio_stream::StreamExt;
    let mut had_error = false;
    match ollama.pull_model_stream(name.clone(), false).await {
        Ok(mut stream) => {
            while let Some(status) = stream.next().await {
                if cancel_token.is_cancelled() {
                    let _ = app.emit(
                        "ollama_add_model_error",
                        format!("Download for '{}' cancelled.", name),
                    );
                    had_error = true;
                    break;
                }
                match status {
                    Ok(status) => {
                        let serializable_status = SerializablePullModelStatus {
                            message: status.message,
                            digest: status.digest,
                            total: status.total,
                            completed: status.completed,
                        };
                        let _ = app.emit("ollama_add_model_status", serializable_status.clone());
                        if serializable_status
                            .message
                            .to_lowercase()
                            .contains("success")
                        {
                            break;
                        }
                    }
                    Err(e) => {
                        let msg = format!("Failed: {}", e);
                        let _ = app.emit("ollama_add_model_error", msg.clone());
                        had_error = true;
                        break;
                    }
                }
            }
        }
        Err(e) => {
            let msg = format!("Failed to add model: {}", e);
            let _ = app.emit("ollama_add_model_error", msg.clone());
            had_error = true;
        }
    }
    {
        let mut downloading = DOWNLOADING_MODELS.lock().unwrap();
        if let Some(pos) = downloading.iter().position(|x| x == &name) {
            downloading.remove(pos);
        }
    }
    {
        let mut map = CANCEL_TOKENS.lock().await;
        map.remove(&name);
    }
    if had_error { Err(()) } else { Ok(()) }
}

#[command]
pub async fn ollama_cancel_download(name: String) -> Result<(), String> {
    let name = if name.contains(":") {
        name
    } else {
        format!("{}:latest", name)
    };
    let map = CANCEL_TOKENS.lock().await;
    if let Some(token) = map.get(&name) {
        token.cancel();
        Ok(())
    } else {
        Err(format!("No active download for model '{}'.", name))
    }
}

#[command]
pub async fn ollama_delete_model(name: String) -> Result<String, String> {
    let ollama = Ollama::default();
    match ollama.delete_model(name.clone()).await {
        Ok(_) => Ok(format!("Model '{}' deleted.", name)),
        Err(e) => Err(format!("Failed to delete model: {}", e)),
    }
}

// Conversation management commands

#[command]
pub async fn create_new_conversation(app_handle: AppHandle) -> Result<String, String> {
    let conversation_id = uuid::Uuid::new_v4().to_string();
    let conversation = Conversation::new(conversation_id.clone());
    
    {
        let mut conversations = CONVERSATIONS.lock().unwrap();
        conversations.insert(conversation_id.clone(), conversation);
    }
    
    {
        let mut current_id = CURRENT_CONVERSATION_ID.lock().unwrap();
        *current_id = Some(conversation_id.clone());
    }
    
    // Save to store
    save_conversations_to_store(app_handle).await?;
    
    Ok(conversation_id)
}

#[command]
pub async fn get_conversations() -> Result<Vec<Conversation>, String> {
    let conversations = CONVERSATIONS.lock().unwrap();
    let mut conversation_list: Vec<Conversation> = conversations.values().cloned().collect();
    
    // Sort by updated_at descending (most recent first)
    conversation_list.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    
    Ok(conversation_list)
}

#[command]
pub async fn switch_conversation(conversation_id: String) -> Result<Vec<ChatMessage>, String> {
    {
        let mut current_id = CURRENT_CONVERSATION_ID.lock().unwrap();
        *current_id = Some(conversation_id.clone());
    }
    
    let conversations = CONVERSATIONS.lock().unwrap();
    if let Some(conversation) = conversations.get(&conversation_id) {
        Ok(conversation.messages.clone())
    } else {
        Err(format!("Conversation {} not found", conversation_id))
    }
}

#[command]
pub async fn delete_conversation(app_handle: AppHandle, conversation_id: String) -> Result<(), String> {
    {
        let mut conversations = CONVERSATIONS.lock().unwrap();
        if conversations.remove(&conversation_id).is_none() {
            return Err(format!("Conversation {} not found", conversation_id));
        }
    }
    
    // If this was the current conversation, set current to None
    {
        let mut current_id = CURRENT_CONVERSATION_ID.lock().unwrap();
        if current_id.as_ref() == Some(&conversation_id) {
            *current_id = None;
        }
    }
    
    // Save to store
    save_conversations_to_store(app_handle).await?;
    
    Ok(())
}

#[command]
pub async fn get_current_conversation_id() -> Result<Option<String>, String> {
    let current_id = CURRENT_CONVERSATION_ID.lock().unwrap();
    Ok(current_id.clone())
}

#[command]
pub async fn load_conversations_from_store(app_handle: AppHandle) -> Result<(), String> {
    let store = app_handle.store("conversations.json");
    
    match store {
        Ok(store) => {
            match store.get("conversations") {
                Some(value) => {
                    if let Ok(stored_conversations) = serde_json::from_value::<HashMap<String, Conversation>>(value.clone()) {
                        let mut conversations = CONVERSATIONS.lock().unwrap();
                        *conversations = stored_conversations;
                    }
                }
                None => {
                    // No conversations stored yet, this is fine
                }
            }
            
            // Load current conversation ID
            if let Some(value) = store.get("current_conversation_id") {
                if let Ok(current_id) = serde_json::from_value::<Option<String>>(value.clone()) {
                    let mut current = CURRENT_CONVERSATION_ID.lock().unwrap();
                    *current = current_id;
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to access store: {}", e));
        }
    }
    
    Ok(())
}

#[command]
pub async fn save_conversations_to_store(app_handle: AppHandle) -> Result<(), String> {
    let store = app_handle.store("conversations.json");
    
    match store {
        Ok(store) => {
            let conversations = CONVERSATIONS.lock().unwrap();
            let current_id = CURRENT_CONVERSATION_ID.lock().unwrap();
            
            store.set("conversations", json!(*conversations));
            store.set("current_conversation_id", json!(*current_id));
            
            if let Err(e) = store.save() {
                return Err(format!("Failed to save store: {}", e));
            }
        }
        Err(e) => {
            return Err(format!("Failed to access store: {}", e));
        }
    }
    
    Ok(())
}
