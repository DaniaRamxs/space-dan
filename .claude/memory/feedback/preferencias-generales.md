# Preferencias y Correcciones del Usuario

## 2026-04-08: Quiere soluciones reales, no manejo de errores silencioso

**Corrección:** Al reportar el error de YouTube IFrame API, el agente respondió que "el código ya maneja el error correctamente". El usuario dijo: "pero quiero que funcione el youtube".

**Regla:** No conformarse con que un error esté "manejado gracefully". Si algo falla, buscar la causa raíz y arreglarlo. Solo documentar el error como "esperado" si realmente no tiene solución técnica.

## 2026-04-08: No sugerir features que ya existen — leer el codebase primero

**Corrección:** Al sugerir features, el agente recomendó notificaciones, perfil con "ahora escuchando", onboarding guiado y más de 20 juegos en arcade — todo ya existía.

**Regla:** Antes de recomendar features o rediseños, explorar el codebase real. No asumir que algo no existe solo porque no lo vi en los archivos revisados.

**Features confirmados existentes en Spacely:**
- Sistema de notificaciones ✅
- "Ahora escuchando" en perfil (LastFM + YouTube) ✅
- Onboarding guiado con tour ✅
- 20+ juegos en arcade ✅

## 2026-04-08: Consistencia visual entre plataformas

**Preferencia:** Cuando se configuró el favicon web, el usuario pidió explícitamente usar el mismo ícono que la app Tauri (`spacelyicon.png`). Prefiere coherencia de identidad visual entre web, desktop y mobile.
