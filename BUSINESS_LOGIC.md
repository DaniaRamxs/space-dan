# Spacely — Business Logic

> Plataforma social gamificada con temática espacial. Los usuarios construyen su identidad digital, se vinculan con otros, juegan mini-juegos, y acumulan una economía virtual en un universo persistente.

---

## Propuesta de Valor

Spacely es una red social de nicho con capa de juego. A diferencia de redes sociales convencionales, el engagement se mantiene vivo con economía virtual, progresión de personaje, mini-juegos y un sistema de vínculos entre usuarios que recompensa la interacción sostenida.

**Usuario target:** Comunidades de jóvenes hispanohablantes con intereses en anime, música, gaming y cultura digital.

---

## Plataformas

| Plataforma | Tecnología | Estado |
|------------|------------|--------|
| Web | Next.js 16 + Supabase | Activo |
| Desktop | Tauri (Windows) | v1.0.0 |
| Mobile | Capacitor (Android APK) | v1.3.6 |

---

## Entidades Principales

### Usuario / Perfil
- Registro vía Supabase Auth (email + password)
- Onboarding obligatorio: elección de username único
- Perfil público con: avatar, marco, rol, nickname style, balance, nivel, HoloCard
- Campos clave en `profiles`: `username`, `balance`, `last_daily_at`, `is_premium`

### Economía Virtual — ◈ (Starlys)
La moneda interna del universo. Todo gira en torno a ella.

| Fuente de ingresos | Detalle |
|-------------------|---------|
| Daily Bonus | Reclamable 1 vez cada 24h |
| Mini-juegos | Puntaje → recompensa |
| Stellar Pass | Recompensas por nivel |
| Logros | Primer desbloqueo |
| Banco (préstamo) | Starlys adelantados con condiciones |

| Fuente de gasto | Detalle |
|----------------|---------|
| Tienda | Items cosméticos |
| Tienda Galáctica | Items premium |
| Mercado Negro | Items raros / especiales |
| Cofres | Loot boxes aleatorios |

**Tablas:** `profiles.balance`, `transactions`, `user_loans`

---

## Sistemas Core

### 1. Stellar Pass (Battle Pass)
Sistema de progresión con niveles y temporadas.

- El usuario acumula XP realizando acciones en la plataforma
- Cada nivel desbloquea recompensas (cosméticos, monedas, items especiales)
- Existe tier gratuito y tier premium (`is_premium`)
- **Tabla:** `stellar_pass_progression`, `stellar_pass_rewards`

### 2. Vínculos (Sistema de Parejas/Bonds)
El feature más diferenciador. Dos usuarios pueden crear un vínculo permanente.

- Un usuario envía solicitud de vínculo → el otro acepta
- Solo se puede tener **un vínculo activo** a la vez
- El vínculo tiene estadísticas propias: `visit_count`, `sync_hits`, días transcurridos
- Se desbloquean **milestones** según tiempo y actividad compartida:
  - 7 días, 30 días, 90 días, 180 días, 365 días
  - Sincronías (online al mismo tiempo)
  - Visitas al universo compartido
- Cada vínculo tiene un **universo privado** con galería de fotos y notas compartidas
- **Tabla:** `vinculos`, `vinculo_stats`, `vinculo_notes`, `vinculo_gallery`

### 3. Sistema de Afinidad
Cuestionario de compatibilidad entre usuarios.

- Se responde una vez (escala 1-5 por pregunta)
- Calcula compatibilidad con otros usuarios
- Resultado influye en sugerencias de vínculo
- **Tabla:** `affinity_answers`, `affinity_questions`

### 4. Tienda / Cosméticos
Los usuarios personalizan su identidad comprando items con ◈.

| Categoría | Descripción |
|-----------|-------------|
| `nickname_style` | Estilos visuales del nombre |
| `frame` | Marcos del avatar |
| `role` | Roles especiales (badge de rol) |
| `chat_effect` | Efectos visuales en chat |
| `chat_badge` | Emblemas en mensajes |
| `radio` | Radios equipables (música de fondo) |
| `holocard` | Tarjeta de identidad holográfica |
| `chest` | Cofres con recompensas aleatorias |

- Items se compran → van a inventario → se equipan desde perfil
- **Tablas:** `shop_items`, `user_inventory`, `equipped_items`

### 5. Mini-juegos
Arcade integrado con 12 juegos. Guardan puntaje y dan recompensas.

| Juego | Tipo |
|-------|------|
| Snake | Clásico |
| TicTacToe | Estrategia |
| Memory | Memoria |
| Whack-a-Mole | Reflejos |
| ColorMatch | Percepción |
| ReactionTime | Velocidad |
| 2048 | Puzzle |
| Blackjack | Cartas |
| Sliding Puzzle | Lógica |
| Pong | Arcade |
| Space Invaders | Acción |
| Breakout | Acción |

- Los puntajes se guardan en `scores` y alimentan el `leaderboard` global
- Completar juegos puede desbloquear logros
- **Tablas:** `scores`, `leaderboard`

### 6. Logros (Achievements)
Sistema de logros desbloqueables por acciones específicas.

- Se guardan localmente (localStorage) y se sincronizan a Supabase en login
- Desbloquear ciertos logros otorga ◈
- **Tabla:** `achievements`, `user_achievements`

### 7. Comunidades
Espacios públicos con canales de comunicación.

- Usuarios pueden crear y unirse a comunidades
- Cada comunidad tiene canales de texto
- **Tablas:** `communities`, `community_channels`, `community_members`

### 8. Chat Global
Chat en tiempo real disponible para todos los usuarios autenticados.

- Mensajes con efectos visuales equipados
- **Tabla:** `messages` (realtime via Supabase)

### 9. Música & Medios (Jukebox DJ v2)
Centro de entretenimiento sincronizado para espacios sociales.

- **Sync de Estado (Colyseus):** Sincronización nativa de alta fidelidad. Los late-joiners se sincronizan al milisegundo.
- **Queue por Prioridad (Stellar Boost):** Los usuarios pueden usar ◈ para inyectar "energía" a una canción. La canción con más ◈ acumulados sube al primer puesto de la cola.
- **Sistema de Propinas:** Los oyentes pueden enviar ◈ al DJ que añadió la canción actual.
- **YouTube Integration:** Pre-carga el IFrame API para reproducción fluida.
- **Radios Equipables:** Items de tienda que cambian la música de fondo del perfil de forma privada.

### 10. Universo / Mapa Estelar
- Mapa interactivo que representa el ecosistema social
- Cada usuario tiene su propio "universo" (espacio de perfil extendido)
- El universo de un vínculo es privado y compartido entre los dos

### 11. Banco (Stellar Pact)
Sistema de préstamos de moneda virtual.

- Los usuarios pueden solicitar préstamos de ◈
- Existe un sistema de elegibilidad (`check_stellar_pact_eligibility` RPC)
- Monto mínimo: 100 ◈
- **Tablas:** `user_loans`, `transactions`

### 12. Facebook Sharing (Social Cinema)
Actividad interactiva para descubrir y compartir videos/reels de Facebook.

- **Discovery Feed:** Un muro de videos curados (Mocked API / Curated List) para cuando el usuario no sabe qué ver.
- **Direct Input:** Campo para pegar enlaces directos de Reels o Videos.
- **Integración:** Uso de SDK de Facebook para embebido nativo.
- **Modo Social:** Posibilidad de compartir el video actual al Chat Global.
- **Estética:** Liquid Glass con fondos dinámicos.

---

## Flujos Críticos

### Registro y Onboarding
```
Signup (email/password) → Supabase crea sesión
→ Redirect a /onboarding
→ Usuario elige username único
→ Se crea perfil en `profiles`
→ Se migran achievements locales a DB
→ Redirect a home
```

### Ciclo de Economía Diaria
```
Usuario entra a la app
→ EconomyContext carga balance desde `profiles.balance`
→ Si canClaimDaily() → mostrar botón de daily bonus
→ Usuario reclama → se suma ◈ al balance + se registra en `transactions`
→ `last_daily_at` se actualiza → botón desaparece 24h
```

### Compra en Tienda
```
Usuario selecciona item → Ve precio en ◈
→ balance >= precio → habilitar compra
→ Se descuenta balance + se agrega a `user_inventory`
→ Item queda equipable desde perfil
→ Si es primer item de categoría → posible unlock de logro
```

### Crear Vínculo
```
Usuario A envía solicitud a Usuario B
→ B recibe notificación / ve solicitud en /vinculos
→ B acepta → se crea registro en `vinculos` con fecha de inicio
→ Se genera universo privado compartido
→ Milestones comienzan a contar desde esa fecha
```

---

## Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Comandos

```bash
npm run dev        # Desarrollo (puerto auto-detect 3000-3006)
npm run build      # Build producción web
npm run typecheck  # Verificar tipos TypeScript
npm run lint       # ESLint
```

---

## Estado del Proyecto

- Auth: ✅ Supabase Email/Password
- Economía: ✅ Balance + Daily + Transacciones
- Tienda: ✅ Categorías + Inventario
- Stellar Pass: ✅ Progresión + Recompensas
- Vínculos: ✅ Solicitudes + Stats + Universo privado
- Mini-juegos: ✅ 12 juegos + Leaderboard
- Logros: ✅ Local + Sync a DB
- Comunidades: ✅ Con canales
- Chat Global: ✅ Realtime
- Música/YouTube: ✅ IFrame API precargado
- Facebook Sharing: 🏗️ En construcción (Phase: Design)
- Apps nativas: ✅ Tauri Desktop + Capacitor Android
