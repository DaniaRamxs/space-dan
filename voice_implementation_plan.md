# Plan de Integración de Voz (LiveKit + Supabase)

Este documento detalla los pasos para implementar salas de audio de 5 personas en Space Dan.

## 1. Infraestructura de Base de Datos (Supabase SQL)
Crearemos una tabla para gestionar las salas y habilitaremos RLS.

## 2. Generación de Tokens (Edge Function)
Implementaremos una función en Deno que valide la sesión de Supabase y genere un token de LiveKit con los permisos de `audio_only`.

## 3. Frontend (React)
- **Servicio de Voz**: Para comunicarse con la Edge Function.
- **Componente VoiceRoom**: Interfaz premium con Glassmorphism.
- **Hook useVoiceRoom**: Lógica de conexión y estados de audio.

## 4. Instalación de Dependencias
Necesitaremos:
- `livekit-client`
- `@livekit/components-react`
- `@livekit/components-styles` (opcional, usaremos estilos propios para el look Space Dan)

---
*Nota: Este plan cumple con los requisitos de MVP: Solo audio, max 5 personas, sin servidor externo.*
