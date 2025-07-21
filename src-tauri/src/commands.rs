use crate::model::*;
use crate::state::*;
use ollama_rs::generation::chat::request::ChatMessageRequest;
use ollama_rs::generation::chat::{ChatMessage, MessageRole};
use ollama_rs::generation::completion::request::GenerationRequest;
use ollama_rs::generation::images::Image;
use ollama_rs::Ollama;
use std::ops::DerefMut;
use tauri::{command, AppHandle, Emitter};

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
        let mut h = CHAT_HISTORY.lock().unwrap();
        h.push(ChatMessage::new(MessageRole::User, prompt));
        h.clone()
    };
    let req = ChatMessageRequest::new(model.parse().unwrap(), history_clone.clone());
    match ollama.send_chat_messages(req).await {
        Ok(response) => {
            let mut h = CHAT_HISTORY.lock().unwrap();
            h.push(ChatMessage::new(MessageRole::Assistant, response.message.content.clone()));
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
        let mut h = CHAT_HISTORY.lock().unwrap();
        h.push(ChatMessage::new(MessageRole::User, prompt));
        h.clone()
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
                    let mut h = CHAT_HISTORY.lock().unwrap();
                    h.push(ChatMessage::new(MessageRole::Assistant, responses.message.content.clone()));
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
