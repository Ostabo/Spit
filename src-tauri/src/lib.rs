use ollama_rs::generation::completion::request::GenerationRequest;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use ollama_rs::Ollama;

#[tauri::command]
async fn call_ollama_api(prompt: String) -> Result<String, String> {
    let ollama = Ollama::default(); // assumes local Ollama on http://localhost:11434

    let req = GenerationRequest::new("gemma3".parse().unwrap(), &prompt);
    match ollama.generate(req).await {
        Ok(response) => Ok(response.response),
        Err(e) => Err(format!("Ollama error: {}", e)),
    }
}

#[tauri::command]
async fn ollama_list() -> Result<String, String> {
    let ollama = Ollama::default();
    match ollama.list_local_models().await {
        Ok(models) => {
            let model_names: Vec<String> = models.iter().map(|m| m.name.clone()).collect();
            Ok(model_names.join(", "))
        }
        Err(e) => Err(format!("Ollama error: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![call_ollama_api, ollama_list])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
