use ollama_rs::generation::chat::request::ChatMessageRequest;
use ollama_rs::generation::chat::{ChatMessage, MessageRole};
use ollama_rs::generation::completion::request::GenerationRequest;
use ollama_rs::generation::images::Image;
use ollama_rs::Ollama;
use once_cell::sync::Lazy;
use serde::Serialize;
use std::ops::DerefMut;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{command, AppHandle, Emitter};

#[derive(Serialize, Clone)]
struct LocalModelWithTemporary {
    name: String,
    size: u64,
    modified_at: String,
    temporary: bool,
}

static CHAT_HISTORY: Lazy<Mutex<Vec<ChatMessage>>> = Lazy::new(|| Mutex::new(Vec::new()));

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StreamChunk {
    content: String,
    done: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct StreamError {
    error: String,
}

#[derive(Serialize, Clone)]
struct SerializablePullModelStatus {
    message: String,
    digest: Option<String>,
    total: Option<u64>,
    completed: Option<u64>,
}

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
async fn call_ollama_api_stream(app: AppHandle, prompt: String, model: String) -> Result<(), ()> {
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
async fn call_ollama_chat_stream(app: AppHandle, prompt: String, model: String) -> Result<(), ()> {
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
async fn call_ollama_api_with_image_stream(
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
async fn ollama_list() -> Result<Vec<LocalModelWithTemporary>, String> {
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

static DOWNLOADING_MODELS: Mutex<Vec<String>> = Mutex::new(Vec::new());

#[command]
async fn ollama_add_model(app: AppHandle, name: String) -> Result<(), ()> {
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
    use tokio_stream::StreamExt;
    match ollama.pull_model_stream(name.clone(), false).await {
        Ok(mut stream) => {
            while let Some(status) = stream.next().await {
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
                        let _ = app.emit("ollama_add_model_error", format!("Failed: {}", e));
                        break;
                    }
                }
            }
        }
        Err(e) => {
            let _ = app.emit(
                "ollama_add_model_error",
                format!("Failed to add model: {}", e),
            );
        }
    }
    {
        let mut downloading = DOWNLOADING_MODELS.lock().unwrap();
        if let Some(pos) = downloading.iter().position(|x| x == &name) {
            downloading.remove(pos);
        }
    }
    Ok(())
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
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit Spit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;
            let _ = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {
                        println!("menu item {:?} not handled", event.id);
                    }
                })
                .icon(app.default_window_icon().unwrap().clone())
                .build(app)?;
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            call_ollama_api,
            call_ollama_chat,
            call_ollama_api_with_image,
            call_ollama_api_stream,
            call_ollama_chat_stream,
            call_ollama_api_with_image_stream,
            ollama_list,
            ollama_add_model,
            ollama_delete_model
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
