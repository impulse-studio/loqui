mod activeapp;
mod agent;
mod audio;
mod commands;
mod error;
mod hotkey;
pub mod llm;
mod model_manager;
mod paste;
mod security;
mod stt;
mod state;
mod storage;
mod window;

use state::AppState;
use std::sync::Mutex;
use storage::config::ConfigStore;
use storage::database::Database;
use storage::profiles::{ProfileRow, ProfileStore};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp_millis()
        .init();

    let db = Database::new().expect("Failed to initialize database");
    db.run_migrations().expect("Failed to run migrations");

    // Insert default profile if none exists
    if db.get_profiles().unwrap_or_default().is_empty() {
        let default_profile = ProfileRow {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Casual".to_string(),
            system_prompt: "Keep the natural tone but fix grammar, remove filler words, and clean up the text.".to_string(),
            app_mappings: "[]".to_string(),
            is_default: true,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            llm_model: String::new(),
            context_size: 4096,
            llm_enabled: true,
            llm_provider: "disabled".to_string(),
        };
        let _ = db.save_profile(&default_profile);
    }

    let hotkey_target = hotkey::handler::new_target();

    // Load saved hotkey into target
    if let Ok(Some(saved_hotkey)) = db.get_config("hotkey") {
        let keys = hotkey::handler::parse_shortcut(&saved_hotkey);
        log::info!("Loaded hotkey from config: {saved_hotkey:?} → keys: {keys:?}");
        *hotkey_target.lock().unwrap() = keys;
    } else {
        log::warn!("No hotkey configured — hotkey handler will not fire");
    }

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ));

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .plugin(tauri_nspanel::init())
            .plugin(tauri_plugin_macos_permissions::init());
    }

    builder
        .manage(AppState {
            db: Mutex::new(db),
            whisper: Mutex::new(None),
            loaded_model_id: Mutex::new(None),
            audio_capture: Mutex::new(None),
            download_cancel: Mutex::new(None),
            hotkey_target: hotkey_target.clone(),
            recording_context: Mutex::new(None),
            llm: Mutex::new(None),
            loaded_llm_id: Mutex::new(None),
            llm_download_cancel: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::config::get_platform,
            commands::config::get_config,
            commands::config::set_config,
            commands::config::clear_all_data,
            commands::transcripts::get_transcripts,
            commands::transcripts::get_transcript,
            commands::transcripts::delete_transcript,
            commands::transcripts::get_transcript_stats,
            commands::transcripts::get_activity,
            commands::profiles::get_profiles,
            commands::profiles::get_profile,
            commands::profiles::save_profile,
            commands::profiles::delete_profile,
            commands::stt::get_models,
            commands::stt::download_model,
            commands::stt::cancel_download,
            commands::stt::verify_model,
            commands::hotkey::set_hotkey,
            commands::audio::get_audio_devices,
            commands::audio::load_stt_model,
            commands::audio::start_recording,
            commands::audio::stop_recording,
            commands::llm::get_llm_models,
            commands::llm::download_llm_model,
            commands::llm::cancel_llm_download,
            commands::llm::verify_llm_model,
            commands::llm::load_llm_model,
            commands::llm::unload_llm_model,
            commands::llm::test_refactor,
            commands::llm::get_detected_apps,
            commands::llm::get_llm_api_key_status,
            commands::llm::fetch_remote_models,
            commands::llm_keys::save_llm_api_key,
            commands::llm_keys::has_llm_api_key,
            commands::llm_keys::delete_llm_api_key,
            commands::stt_cloud::save_stt_api_key,
            commands::stt_cloud::has_stt_api_key,
            commands::stt_cloud::delete_stt_api_key,
            commands::stt_cloud::test_stt_provider,
            commands::config::export_transcripts,
            commands::widget::apply_widget_settings,
        ])
        .setup(|app| {
            // Start global keyboard listener for hotkey detection
            hotkey::handler::start_listener(app.handle().clone(), hotkey_target);

            let _main_window = app.get_webview_window("main");

            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::NSWindowCollectionBehavior;
                use tauri_nspanel::WebviewWindowExt;

                if let Some(widget) = app.get_webview_window("widget") {
                    let panel = widget.to_panel().unwrap();

                    let non_activating: i32 = 1 << 7;
                    panel.set_style_mask(non_activating);
                    panel.set_level(3);
                    panel.set_collection_behaviour(
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces,
                    );
                    panel.set_hides_on_deactivate(false);
                }
            }

            // System tray
            if let Err(e) = window::tray::setup(app.handle()) {
                log::error!("Failed to setup tray: {e}");
            }

            // Auto-show widget + auto-load model if onboarding is complete
            {
                let state = app.state::<AppState>();
                let onboarding_done = {
                    let db = state.db.lock().unwrap();
                    db.get_config("onboardingComplete")
                        .ok()
                        .flatten()
                        .map_or(false, |v| v == "true")
                };

                log::info!("Onboarding complete: {onboarding_done}");

                if onboarding_done {
                    if let Some(widget) = app.get_webview_window("widget") {
                        let (position, size) = {
                            let db = state.db.lock().unwrap();
                            let pos = db
                                .get_config("widgetPosition")
                                .ok()
                                .flatten()
                                .unwrap_or_else(|| "bottom-center".to_string());
                            let sz = db
                                .get_config("widgetSize")
                                .ok()
                                .flatten()
                                .unwrap_or_else(|| "medium".to_string());
                            (pos, sz)
                        };
                        let _ =
                            window::widget::apply_position_and_size(&widget, &position, &size);
                        let _ = widget.show();
                    }

                    // Load STT model in background
                    let model_id = {
                        let db = state.db.lock().unwrap();
                        db.get_config("sttModel")
                            .ok()
                            .flatten()
                            .unwrap_or_else(|| "whisper-base".to_string())
                    };

                    log::info!("Auto-loading STT model: {model_id}");
                    let handle = app.handle().clone();
                    std::thread::spawn(move || {
                        let state = handle.state::<AppState>();
                        // Skip if already loaded
                        {
                            let guard = state.loaded_model_id.lock().unwrap();
                            if guard.as_deref() == Some(&model_id) {
                                let _ = handle.emit(
                                    "model-loaded",
                                    serde_json::json!({ "modelId": model_id }),
                                );
                                return;
                            }
                        }
                        match stt::model_manager::get_model_path(&model_id) {
                            Ok(path) => match stt::whisper::WhisperEngine::load(&path) {
                                Ok(engine) => {
                                    *state.whisper.lock().unwrap() = Some(engine);
                                    *state.loaded_model_id.lock().unwrap() =
                                        Some(model_id.clone());
                                    log::info!("STT model loaded successfully: {model_id}");
                                    let _ = handle.emit(
                                        "model-loaded",
                                        serde_json::json!({ "modelId": model_id }),
                                    );
                                }
                                Err(e) => log::error!("Failed to load whisper model: {e}"),
                            },
                            Err(e) => log::error!("Model path not found: {e}"),
                        }
                    });
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

