# 🎮 Configuración de Colyseus para Spacely

Guía completa para conectar el frontend React con el backend multiplayer de Colyseus en Railway.

## 📋 URLs de Producción

- **Frontend:** `https://spacely-frontend-production.up.railway.app`
- **Backend:** `https://spacely-server-production.up.railway.app`
- **WebSocket:** `wss://spacely-server-production.up.railway.app`

## 🔧 Configuración

### 1. Variables de Entorno

Crea un archivo `.env.production` en la carpeta `frontend/`:

```env
VITE_COLYSEUS_URL=wss://spacely-server-production.up.railway.app
VITE_APP_URL=https://spacely-frontend-production.up.railway.app
```

### 2. Railway Configuration

En el dashboard de Railway para el **servicio frontend**:

**Environment Variables:**
```
VITE_COLYSEUS_URL=wss://spacely-server-production.up.railway.app
```

**Nota:** Railway soporta WebSockets nativamente, no requiere configuración adicional.

### 3. Cliente de Colyseus

El cliente está configurado en `src/services/colyseusClient.js`:

```javascript
import * as Colyseus from "colyseus.js";

const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL ||
    ((window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? `ws://${window.location.hostname}:2567`
        : "wss://spacely-server-production.up.railway.app");

export const client = new Colyseus.Client(COLYSEUS_URL);
```

## 🚀 Uso Básico

### Conectarse a una Room

```javascript
import { client } from './services/colyseusClient';

async function joinBeatRoom() {
  try {
    const room = await client.joinOrCreate('beat-room', {
      playerName: 'Player123',
      timestamp: Date.now()
    });

    console.log('✅ Conectado a beat-room');
    console.log('Room ID:', room.id);
    console.log('Session ID:', room.sessionId);

    // Escuchar cambios de estado
    room.onStateChange((state) => {
      console.log('Estado actualizado:', state);
    });

    // Escuchar mensajes
    room.onMessage('*', (type, message) => {
      console.log('Mensaje recibido:', { type, message });
    });

    // Detectar desconexión
    room.onLeave((code) => {
      console.log('Desconectado:', code);
    });

    // Detectar errores
    room.onError((code, message) => {
      console.error('Error:', { code, message });
    });

    return room;
  } catch (error) {
    console.error('Error al conectar:', error);
    throw error;
  }
}
```

## 🔄 Reconexión Automática

Ejemplo de reconexión con backoff exponencial:

```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

async function connectWithRetry() {
  try {
    const room = await client.joinOrCreate('beat-room');
    reconnectAttempts = 0; // Reset en conexión exitosa
    
    room.onLeave((code) => {
      if (code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        console.log(`Reintentando en ${delay / 1000}s...`);
        
        setTimeout(() => {
          reconnectAttempts++;
          connectWithRetry();
        }, delay);
      }
    });

    return room;
  } catch (error) {
    if (reconnectAttempts < maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
      setTimeout(() => {
        reconnectAttempts++;
        connectWithRetry();
      }, delay);
    }
  }
}
```

## 📦 Componente de Ejemplo

Usa el componente `BeatRoomConnection` para ver un ejemplo completo:

```javascript
import BeatRoomConnection from './components/examples/BeatRoomConnection';

function App() {
  return <BeatRoomConnection />;
}
```

Este componente incluye:
- ✅ Conexión automática a `beat-room`
- ✅ Manejo de errores
- ✅ Reconexión automática (máx. 5 intentos)
- ✅ Logs detallados en consola
- ✅ UI para monitorear el estado de conexión

## 🐛 Debugging

### Verificar Conexión

1. **Abrir DevTools** (F12)
2. **Ir a Console**
3. Buscar logs con formato: `[INFO] HH:MM:SS: mensaje`

### Logs Importantes

- `🔌 Intentando conectar a beat-room...` - Inicio de conexión
- `✅ Conectado exitosamente` - Conexión establecida
- `🔄 Estado del servidor actualizado` - Estado sincronizado
- `❌ Error de conexión` - Fallo en la conexión
- `⚠️ Desconectado` - Conexión perdida

### Verificar WebSocket en Network

1. **DevTools → Network**
2. **Filtrar por WS (WebSocket)**
3. Buscar conexión a `wss://spacely-server-production.up.railway.app`
4. Estado debe ser `101 Switching Protocols`

## ⚠️ Troubleshooting

### Error: "Failed to connect"

**Causa:** El servidor no está accesible.

**Solución:**
1. Verificar que el backend esté desplegado en Railway
2. Comprobar la URL: `https://spacely-server-production.up.railway.app`
3. Verificar que el servidor responda en `/` o `/health`

### Error: "WebSocket connection failed"

**Causa:** Railway no permite WebSockets o hay un problema de CORS.

**Solución:**
1. Railway soporta WebSockets nativamente, no requiere configuración
2. Verificar que el backend tenga CORS configurado para el frontend:

```javascript
// En server/index.mjs
const allowedOrigins = [
  "https://spacely-frontend-production.up.railway.app",
  "http://localhost:5173"
];
```

### Error: "Room not found"

**Causa:** La room `beat-room` no existe en el servidor.

**Solución:**
1. Verificar que el backend tenga definida la room en `server/index.mjs`:

```javascript
gameServer.define("beat-room", BeatSoundRoom);
```

## 🔒 Seguridad

### Producción (Railway)
- ✅ Usa `wss://` (WebSocket Seguro)
- ✅ HTTPS habilitado automáticamente
- ✅ Certificados SSL gestionados por Railway

### Desarrollo Local
- Usa `ws://localhost:2567` (sin SSL)
- El cliente detecta automáticamente el entorno

## 📚 Recursos

- [Documentación de Colyseus](https://docs.colyseus.io/)
- [Railway WebSocket Support](https://docs.railway.app/guides/websockets)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

## ✅ Checklist de Deployment

- [ ] Variable `VITE_COLYSEUS_URL` configurada en Railway
- [ ] Backend desplegado y accesible
- [ ] Frontend puede conectarse a `wss://spacely-server-production.up.railway.app`
- [ ] CORS configurado correctamente en el backend
- [ ] Room `beat-room` definida en el servidor
- [ ] Logs de conexión visibles en DevTools
- [ ] Reconexión automática funcionando
