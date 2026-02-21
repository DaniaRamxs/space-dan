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

## 🔧 Notas de Implementación (Comportamiento)
*   **Responsividad**: El contenedor se contrae en pantallas móviles absorbiendo el margen de `12px` lateral.
*   **Bordes Luminosos**: Casi todo contenedor destaca su existencia con `border: 1px solid rgba(255, 255, 255, 0.X)`.
*   **Interactividad**: El efecto hover normal en links (`.postLink:hover`) realiza una sutil elevación física (`transform: translateY(-1px)`).
