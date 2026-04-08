// Ocultar la ventana de consola en builds de release (Windows)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    spacely_lib::run()
}
