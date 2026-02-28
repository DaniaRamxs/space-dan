# Guía de Optimización: Voz en Móvil y MVP

Para que las salas de voz funcionen perfectamente en Android y Web (MVP), sigue estas recomendaciones:

## 1. Configuración de Audio (Auto-aplicada en LiveKit)
El SDK de LiveKit maneja por defecto el procesamiento de señales de audio, pero para asegurar baja latencia en entornos ruidosos, puedes configurar el `AudioTrack` así:

```javascript
// Opciones recomendadas para móvil
const audioTrackConstraints = {
  echoCancellation: true,    // Cancelación de eco (Esencial para altavoces)
  noiseSuppression: true,    // Supresión de ruido (Mejora experiencia en calle)
  autoGainControl: true,     // Nivela volúmenes de diferentes participantes
};

// Se aplica automáticamente al conectar el track en LiveKit
```

## 2. Buenas Prácticas para Bajo Consumo
- **Solo Audio:** Al no publicar video, el consumo de batería y datos se reduce en un ~80%.
- **Speaker Detection Interval:** No reduzcas el intervalo de detección de voz por debajo de 200ms para evitar despertar el CPU del móvil constantemente.
- **Audio Only Layout:** Mantén la UI simple (como el componente `VoiceRoomUI.jsx`) para que el renderizado de React sea ligero.

## 3. Limitación de Participantes (5 Personas)
La limitación de 5 participantes debe controlarse de dos formas:
1. **Frontend:** El botón "Unirse" debe desactivarse si `voice_rooms.current_participants >= 5`.
2. **Backend (Webhook):** LiveKit Cloud permite configurar Webhooks. Puedes escuchar `room_finished` o `participant_joined` para actualizar el contador en Supabase en tiempo real.

## 4. Notas para Capacitor (Android)
Asegúrate de añadir los permisos en `AndroidManifest.xml` si aún no los tienes:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

---
*Arquitectura diseñada para Space Dan: Segura via Supabase Edge Functions y sin servidores externos.*
