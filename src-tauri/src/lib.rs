mod commands;
mod model;
mod state;
mod tray;

use commands::*;
use tauri::Builder;
use tauri_plugin_shell;
use tauri_plugin_store::Builder as StoreBuilder;
use tauri_plugin_updater;
use tray::setup_tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(StoreBuilder::new().build())
        .setup(|app| {
            setup_tray(app)?;
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
            ollama_delete_model,
            ollama_cancel_download,
            create_new_conversation,
            get_conversations,
            switch_conversation,
            delete_conversation,
            get_current_conversation_id,
            load_conversations_from_store,
            save_conversations_to_store
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
