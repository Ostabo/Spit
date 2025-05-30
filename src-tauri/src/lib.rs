use ollama_rs::generation::chat::request::ChatMessageRequest;
use ollama_rs::generation::chat::{ChatMessage, MessageRole};
use ollama_rs::generation::completion::request::GenerationRequest;
use ollama_rs::generation::images::Image;
use ollama_rs::Ollama;
use once_cell::sync::Lazy;
use serde::Serialize;
use std::ops::DerefMut;
use std::sync::Mutex;
use tauri::command;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

#[derive(Serialize, Clone)]
struct LocalModelWithTemporary {
    name: String,
    size: u64,
    modified_at: String,
    temporary: bool,
}

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
async fn ollama_add_model(name: String) -> Result<String, String> {
    let ollama = Ollama::default();
    let name = match name.contains(":") {
        true => name,
        false => format!("{}:latest", name),
    };
    {
        let mut downloading = DOWNLOADING_MODELS.lock().unwrap();
        if downloading.contains(&name) {
            return Err(format!("Model '{}' is already being downloaded.", name));
        }
        downloading.push(name.clone());
    }
    let res = match ollama.pull_model(name.clone(), false).await {
        Ok(res) => Ok(format!("Model '{}' added: {:?}", name, res)),
        Err(e) => Err(format!("Failed to add model: {}", e)),
    };
    {
        let mut downloading = DOWNLOADING_MODELS.lock().unwrap();
        if let Some(pos) = downloading.iter().position(|x| x == &name) {
            downloading.remove(pos);
        }
    }
    res
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
            ollama_list,
            ollama_add_model,
            ollama_delete_model
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
