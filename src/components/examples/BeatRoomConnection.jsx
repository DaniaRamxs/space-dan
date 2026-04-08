import { useState, useEffect, useRef } from 'react';
import { client } from '../../services/colyseusClient';

/**
 * Componente de ejemplo para conectarse a la room "beat-room" de Colyseus
 * Incluye:
 * - Conexión automática con WebSocket seguro (wss://)
 * - Manejo de errores
 * - Reconexión automática
 * - Logs detallados para debugging
 */

// Generar nombre de jugador único fuera del componente
const generatePlayerName = () => `Player_${Math.random().toString(36).substring(7)}`;

export default function BeatRoomConnection() {
  const [room, setRoom] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [logs, setLogs] = useState([]);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const playerNameRef = useRef(generatePlayerName());
  const maxReconnectAttempts = 5;

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    console.log(`[${type.toUpperCase()}] ${timestamp}: ${message}`);
    setLogs(prev => [...prev.slice(-19), logEntry]);
  };

  const connectToRoom = async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);
      addLog('🔌 Intentando conectar a beat-room...', 'info');
      addLog(`📡 URL del servidor: ${process.env.NEXT_PUBLIC_COLYSEUS_URL || 'wss://spacely-server-production.up.railway.app'}`, 'info');

      // Conectar a la room
      const newRoom = await client.joinOrCreate('beat-room', {
        // Opciones adicionales que puedes enviar al servidor
        playerName: playerNameRef.current,
        timestamp: Date.now()
      });

      setRoom(newRoom);
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
      addLog('✅ Conectado exitosamente a beat-room', 'success');
      addLog(`🆔 Room ID: ${newRoom.id}`, 'info');
      addLog(`👥 Session ID: ${newRoom.sessionId}`, 'info');

      // Escuchar cambios en el estado del servidor
      newRoom.onStateChange((state) => {
        addLog('🔄 Estado del servidor actualizado', 'info');
        setRoomState(state);
        console.log('📊 Nuevo estado:', state);
      });

      // Escuchar mensajes del servidor
      newRoom.onMessage('*', (type, message) => {
        addLog(`📨 Mensaje recibido: ${type}`, 'info');
        console.log('📨 Mensaje del servidor:', { type, message });
      });

      // Detectar cuando se pierde la conexión
      newRoom.onLeave((code) => {
        addLog(`⚠️ Desconectado de la room (código: ${code})`, 'warning');
        setConnectionStatus('disconnected');
        setRoom(null);

        // Reconexión automática si no fue intencional
        if (code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          addLog(`🔄 Reintentando conexión en ${delay / 1000}s... (intento ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`, 'warning');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connectToRoom();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          addLog('❌ Máximo de intentos de reconexión alcanzado', 'error');
          setError('No se pudo reconectar al servidor después de múltiples intentos');
        }
      });

      // Detectar errores
      newRoom.onError((code, message) => {
        addLog(`❌ Error en la room: ${message} (código: ${code})`, 'error');
        console.error('Error de Colyseus:', { code, message });
        setError(message);
      });

    } catch (err) {
      setConnectionStatus('error');
      const errorMessage = err.message || 'Error desconocido al conectar';
      setError(errorMessage);
      addLog(`❌ Error de conexión: ${errorMessage}`, 'error');
      console.error('Error al conectar a Colyseus:', err);

      // Reintentar si es un error de red
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        addLog(`🔄 Reintentando en ${delay / 1000}s...`, 'warning');
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connectToRoom();
        }, delay);
      }
    }
  };

  const disconnect = () => {
    if (room) {
      addLog('👋 Desconectando manualmente...', 'info');
      room.leave();
      setRoom(null);
      setConnectionStatus('disconnected');
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = 0;
  };

  useEffect(() => {
    // Conectar automáticamente al montar el componente
    connectToRoom();

    // Limpiar al desmontar
    return () => {
      if (room) {
        room.leave();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">
          🎵 Conexión a Beat Room (Colyseus)
        </h2>

        {/* Estado de conexión */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{getStatusIcon()}</span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {connectionStatus === 'connected' && 'Conectado'}
            {connectionStatus === 'connecting' && 'Conectando...'}
            {connectionStatus === 'error' && 'Error de conexión'}
            {connectionStatus === 'disconnected' && 'Desconectado'}
          </span>
        </div>

        {/* Información de la room */}
        {room && (
          <div className="bg-gray-900 rounded p-4 mb-4 space-y-2 text-sm">
            <div className="text-gray-300">
              <span className="text-gray-500">Room ID:</span> {room.id}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-500">Session ID:</span> {room.sessionId}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-500">Servidor:</span> {process.env.NEXT_PUBLIC_COLYSEUS_URL || 'wss://spacely-server-production.up.railway.app'}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded p-4 mb-4">
            <p className="text-red-400 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Controles */}
        <div className="flex gap-3">
          <button
            onClick={connectToRoom}
            disabled={connectionStatus === 'connecting' || connectionStatus === 'connected'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-medium transition"
          >
            {connectionStatus === 'connecting' ? 'Conectando...' : 'Conectar'}
          </button>
          <button
            onClick={disconnect}
            disabled={!room}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-medium transition"
          >
            Desconectar
          </button>
        </div>
      </div>

      {/* Estado del servidor */}
      {roomState && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-3">📊 Estado del Servidor</h3>
          <pre className="bg-gray-900 rounded p-4 text-gray-300 text-sm overflow-auto max-h-64">
            {JSON.stringify(roomState, null, 2)}
          </pre>
        </div>
      )}

      {/* Logs de conexión */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-3">📋 Logs de Conexión</h3>
        <div className="bg-gray-900 rounded p-4 space-y-1 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay logs aún...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className={`text-sm font-mono ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'warning' ? 'text-yellow-400' :
                log.type === 'success' ? 'text-green-400' :
                'text-gray-300'
              }`}>
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-400 mb-2">ℹ️ Información</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>✅ WebSocket seguro (wss://) configurado para producción</li>
          <li>✅ Reconexión automática habilitada (máx. {maxReconnectAttempts} intentos)</li>
          <li>✅ Logs detallados en consola del navegador</li>
          <li>✅ Railway soporta WebSockets nativamente</li>
          <li>✅ Variable de entorno: VITE_COLYSEUS_URL</li>
        </ul>
      </div>
    </div>
  );
}
