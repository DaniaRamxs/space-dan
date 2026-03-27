pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        // Allow external navigation within the WebView (required for OAuth flow:
        // the WebView must navigate to the OAuth provider and back to tauri.localhost)
        .on_navigation(|_window, _url| true)
        .run(tauri::generate_context!())
        .expect("error al iniciar la aplicación Tauri");
}
