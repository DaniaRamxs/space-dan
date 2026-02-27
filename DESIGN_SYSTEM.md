# 🌌 Space-Dan Design System & Behavior Guide

Esta guía documenta el estilo visual y el comportamiento interactivo de la aplicación / blog `space-dan`. El diseño está inspirado en una estética **Y2K Dark / Cyberpunk**, mezclando elementos retro de la web temprana (como SpaceHey/MySpace) con acabados modernos (Glassmorphism).

---

## 🎨 1. Paleta de Colores y Variables (Tokens)

El sitio utiliza un tema oscuro profundo con acentos de neón vibrantes.

### Fondos y Superficies
*   **Fondo Principal (`--bg`)**: `#0b0b10` / `#050510` (Azul medianoche casi negro).
*   **Tarjetas (Glassmorphism) (`--card`)**: `rgba(255, 255, 255, 0.06)` con `backdrop-filter: blur(10px)`.
*   **Bordes (`--border`)**: `rgba(255, 255, 255, 0.14)`. Estilo cristalino delgado.

### Acentos Neón
*   **Magenta Neón (`--accent`)**: `#ff6eb4`
*   **Cyan Neón (`--cyan`)**: `#00e5ff`
*   **Verde Estado (`--status-green`)**: `#39ff14` (Usado para el indicador "Online").
*   **Brillos (Glow)**: Sombras rojas y azules dispersas (`rgba(255, 110, 180, 0.25)` y similares) para emular tubos de neón y destellos en los bordes.

### Tipografía
*   **Fuente Principal**: Familia monospace (`ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`). Esto refuerza la vibra técnica/retro.
*   **Color de Texto Principal (`--text`)**: `rgba(255, 255, 255, 0.92)` (Blanco roto).
*   **Texto Suave (`--text-soft`)**: `rgba(255, 255, 255, 0.85)`.
*   **Texto Muteado (`--text-muted`)**: `rgba(255, 255, 255, 0.65)`.

---

## 📏 2. Estructura y Espaciado

*   **Layout Principal (`.layoutOne`)**: Centrado con un ancho máximo de `760px` (`--content-max`).
*   **Radios de Borde (Rounded corners)**: 
    *   Small: `10px`
    *   Medium: `14px`
    *   Large: `18px` (Usado en las tarjetas principales).
*   **Tarjetas (`.card`)**: Tienen un borde superior degradado lineal (`transparent -> magenta -> cyan -> transparent`) simulando luz reflejada. Tienen sombras desplegadas amplias.

---

## 🕹️ 3. Elementos Retro y Comportamientos Y2K

Para mantener la nostalgia viva, el sitio tiene características icónicas de la web de los 2000s:

1.  **Cursor Personalizado**: El sitio usa `mc-cursor.png` para el puntero por defecto y el hover en interactivos, simulando un cursor de sistema antiguo o de Minecraft.
2.  **Barras de Desplazamiento Personalizadas (Scrollbars)**: `.scrollBox` tiene barras de scroll brutalistas de Windows 95/98 renderizadas con base64 pixelado.
3.  **Animaciones Continuas**:
    *   **Avatar Rotativo**: El avatar del perfil gira 360 grados permanentemente (`animation: spin 7s linear infinite`).
    *   **Nieve / Partículas**: `keyframes snowflakes-fall` para lluvia de píxeles/estrellas cayendo.
    *   **Texto Parpadeante**: Utilidad `.blinkText` y `.blinkSoft`.
4.  **Marquesinas (Marquee)**: Textos desplazables heredados de HTML antiguo.
5.  **Shoutbox Dock**: Un widget de chat fijado en la parte inferior derecha que se puede minimizar/maximizar, imitando las viejas salas de chat de webrings.
6.  **Floating Kitty**: Una imagen pixelada fija en la esquina inferior izquierda del viewport.

---

## 💅 4. Componentes Clave

### Encabezados (Gradientes)
Los `<h1>` dentro de `.card` tienen un recorte de fondo texturizado (`background-clip: text`) usando un gradiente vertical de blanco puro a blanco ligeramente transparente, dándoles un aspecto metálico/vidrioso sutil.

### NavBar (Navegación)
Botones con borde (`1px solid var(--border)`), minúsculas con espaciado ancho (`letter-spacing: 0.06em; text-transform: uppercase;`). Cuando están `.active`, el fondo se ilumina a blanco translúcido (`rgba(255, 255, 255, 0.10)`).

### SpaceHey Sections (`.shSection`)
*   Secciones inspiradas en MySpace.
*   **Cabeceras (`.shHeader`)**: Texto magenta neón con `text-shadow` del mismo color, fondo magenta translúcido al 7% y bordes inferior fijos.

### Etiquetas (Pills / Tags)
`taglinePill` intercala colores:
*   Impares: Fondo y borde magenta translúcido.
*   Pares: Fondo y borde cyan translúcido.
*   Soportan desenfoque de fondo en el pill mismo (`backdrop-filter: blur(4px)`).

---

## 🛰️ 5. Sintaxis de Sistema Space-Dan (SDSS)

SDSS es nuestra capa de comunicación técnica. Se utiliza para metadatos, estados de sistema y etiquetas de contexto, simulando un registro de terminal o telemetría espacial.

### Reglas de Estructura
*   **Conector Obligatorio**: Siempre utiliza guión bajo (`_`) en lugar de espacios.
*   **Prefijo de Señal**: Usa un guión bajo inicial (`_Palabra`) para estados críticos o activos (ej: `_En_Línea`).
*   **Casing**:
    *   `Snake_Case`: Para etiquetas descriptivas (ej: `Frecuencia_Comentarios`).
    *   `ALL_CAPS`: Para estados categóricos o rangos (ej: `SECTOR_ESTABLE`, `RANGO_ETERNAL`).

### Atributos Visuales (Tailwind Rules)
*   **Tipografía**: `font-mono`.
*   **Peso**: `font-black` (para mantener legibilidad en tamaños micro).
*   **Tamaño**: `text-[9px]` o `text-[10px]`.
*   **Espaciado**: `tracking-[0.3em]`.
*   **Color**: `text-white/25` por defecto (ruido de fondo). `text-cyan-400` o `text-purple-400` para estados activos.

### Cuándo Usar
1.  Encabezados de micro-sección (ej: Feed, Comentarios).
2.  Badge de estados (ej: Sincronización, Conexión).
3.  Metadatos de post (ej: Categoría, Tiempo).

### Cuándo NO Usar
1.  Títulos de posts de usuario.
2.  Cuerpo de texto narrativo.
3.  Botones de acción primaria (ej: "Enviar").

---

## 🔡 6. Sistema de Tipografía Calibrada

Nuestra tipografía se divide en niveles funcionales para guiar la mirada a través de la atmósfera cósmica mediante un gradiente real de densidad y peso.

### Niveles de Jerarquía y Pesos
1.  **Display (Nivel 0 - Impacto)**
    *   **Uso**: Títulos de página principales. Se siente como un objeto sólido.
    *   **Estilo**: `font-black`, `uppercase`, `tracking-tighter`.
    *   **Color**: Gradiente de blanco sólido (100% -> 40%).
2.  **Heading (Nivel 1 - Estructura)**
    *   **Uso**: Títulos de tarjetas y nombres de perfil.
    *   **Estilo**: `font-bold`, `tracking-tight`. (Sustituye al black para evitar saturación).
    *   **Color**: Blanco 90% (`text-white/90`).
3.  **Body (Nivel 2 - Contenido)**
    *   **Uso**: Contenido de posts, comentarios y mensajes.
    *   **Estilo**: `font-medium`, `leading-relaxed`.
    *   **Color**: Blanco 70% (`text-white/70`).
4.  **Meta Humano (Nivel 3 - Contexto Temporal)**
    *   **Uso**: Timestamps y lecturas de actividad humana.
    *   **Color**: Blanco 50% (`text-white/50`).
5.  **Micro / SDSS (Nivel 4 - Telemetría/Textura)**
    *   **Uso**: Sintaxis `::`, metadatos técnicos y estados.
    *   **Estilo**: `font-mono`, `font-semibold`, `tracking-[0.2em]`.
    *   **Color**: Blanco 30% (`text-white/30`) por defecto.

### Reglas para la Sintaxis `::`
*   **Textura Visual**: La sintaxis `::` funciona como una marca de agua técnica. Debe ser discreta y nunca competir con el texto humano.
*   **Consistencia**: Siempre en `font-mono` con `tracking-[0.2em]`.
