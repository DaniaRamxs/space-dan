# Logo Spacely — Referencia de Asset

## Ubicación
- **Archivo SVG:** `D:\Saas Factory\mi-saas\public\logo-spacely.svg`
- **Ruta pública (Next.js):** `/logo-spacely.svg`
- **Uso en código:** `<img src="/logo-spacely.svg" />` o como componente inline

## Dimensiones
- ViewBox: `0 0 800 300`
- Proporción: horizontal / landscape (aprox. 2.67:1)
- Responsive: usar `width="100%"` con viewBox fijo

## Identidad visual

### Gradiente principal (`brandGradient`)
- Dirección: horizontal (izquierda → derecha)
- Color inicio: `#4B76F7` (azul medio)
- Color fin: `#3ED9ED` (cyan/turquesa)
- Aplicado a: icono completo + texto "Spacely"

### Tipografía del wordmark
- Fuente: Arial, sans-serif
- Peso: 800 (extra bold)
- Tamaño: 110px
- Letter-spacing: -2px
- Posición: x=280, y=175
- Fill: `url(#brandGradient)`

## Estructura del icono (g transform="translate(50,50)")

### Líneas de conexión (red/grafo)
- Conectan los 4 nodos entre sí
- Path: `M190 40 L160 160 M190 40 L90 70 M160 160 L90 70 M90 70 L50 110 M160 160 L50 110`
- Stroke: `url(#brandGradient)`, width 5, opacity 0.9, linecap/linejoin round

### El Arco (Swoosh) — forma principal
- Fill sólido con gradiente
- Path: `M22 135 C 25 180, 100 170, 195 45 C 130 110, 50 160, 22 135 Z`
- Cola del arco: `M22 135 C 15 110, 40 100, 65 105` (stroke, no fill)

### Nodos (puntos del grafo)
| Nodo              | cx  | cy  | r  |
|-------------------|-----|-----|----|
| Superior derecho  | 190 | 40  | 14 |
| Inferior derecho  | 160 | 160 | 11 |
| Central izquierdo | 90  | 70  | 10 |
| Inferior izquierdo| 50  | 110 | 7  |

Todos con `fill="url(#brandGradient)"`

## Notas de uso
- El filtro `glow` está definido pero es opcional (resplandor suave en nodos)
- Para fondo oscuro: el gradiente funciona bien sin cambios
- Para favicon o versión pequeña: usar solo el `<g transform="translate(50,50)">` sin el texto
- El wordmark "Spacely" arranca en x=280, dejando ~230px a la izquierda para el icono
- Creado: 2026-04-08
