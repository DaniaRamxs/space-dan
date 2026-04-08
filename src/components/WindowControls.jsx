import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, X, Square } from 'lucide-react';

/**
 * WindowControls - Controles de ventana personalizados para Tauri
 * Permite maximizar, minimizar y cerrar la ventana como Discord
 */
export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Detectar si estamos en Tauri
    const checkTauri = () => {
      const tauriDetected = typeof window !== 'undefined' && (
        window.__TAURI_INTERNALS__ !== undefined ||
        window.__TAURI__ !== undefined ||
        window.location.hostname === 'tauri.localhost' ||
        window.location.protocol === 'tauri:'
      );
      setIsTauri(tauriDetected);
    };

    checkTauri();
  }, []);

  const handleMinimize = async () => {
    if (!isTauri) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.minimize();
    } catch (error) {
      console.error('Error minimizing window:', error);
    }
  };

  const handleMaximize = async () => {
    if (!isTauri) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      
      if (isMaximized) {
        await appWindow.unmaximize();
        setIsMaximized(false);
      } else {
        await appWindow.maximize();
        setIsMaximized(true);
      }
    } catch (error) {
      console.error('Error maximizing window:', error);
    }
  };

  const handleClose = async () => {
    if (!isTauri) return;
    
    try {
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.close();
    } catch (error) {
      console.error('Error closing window:', error);
    }
  };

  const handleDoubleClick = async () => {
    if (!isTauri) return;
    await handleMaximize();
  };

  // Solo mostrar controles en Tauri
  if (!isTauri) {
    return null;
  }

  return (
    <div 
      className="flex items-center gap-1 p-2 bg-[#1a1a1a] border-b border-[#2a2a2a]"
      onDoubleClick={handleDoubleClick}
      data-tauri-drag-region
    >
      {/* Drag area - espacio vacío para arrastrar la ventana */}
      <div 
        className="flex-1 h-6 cursor-move"
        data-tauri-drag-region
      />
      
      {/* Controles de ventana */}
      <div className="flex items-center gap-1">
        {/* Minimizar */}
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#2a2a2a] transition-colors"
          title="Minimizar"
        >
          <Minimize2 size={14} className="text-gray-400" />
        </button>

        {/* Maximizar/Restaurar */}
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#2a2a2a] transition-colors"
          title={isMaximized ? "Restaurar" : "Maximizar"}
        >
          {isMaximized ? (
            <Square size={14} className="text-gray-400" />
          ) : (
            <Maximize2 size={14} className="text-gray-400" />
          )}
        </button>

        {/* Cerrar */}
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 transition-colors group"
          title="Cerrar"
        >
          <X size={14} className="text-gray-400 group-hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}
