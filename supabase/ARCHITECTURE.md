# space-dan :: Arquitectura del Sistema de Economía y Socialización

## Índice
1. [Situación actual vs objetivo](#1-situación-actual-vs-objetivo)
2. [Diagrama de base de datos](#2-diagrama-de-base-de-datos)
3. [Plan de migración](#3-plan-de-migración)
4. [Estructura de carpetas React](#4-estructura-de-carpetas-react)
5. [Seguridad](#5-seguridad)
6. [Sistema económico y anti-inflación](#6-sistema-económico-y-anti-inflación)
7. [Pet Accessories — SVG Architecture](#7-pet-accessories--svg-architecture)
8. [Leaderboard — Tabs y queries](#8-leaderboard--tabs-y-queries)
9. [Fondo Comunitario — Estrategia](#9-fondo-comunitario--estrategia)
10. [Escalabilidad futura](#10-escalabilidad-futura)
11. [Riesgos y advertencias](#11-riesgos-y-advertencias)

---

## 1. Situación actual vs objetivo

### ANTES (localStorage)
```
Browser ──► localStorage['space-dan-coins'] ──► cualquiera puede modificar en DevTools
```
**Problema crítico**: El balance no es confiable. Un usuario puede ponerse 999999 coins
abriendo la consola y haciendo `localStorage.setItem('space-dan-coins', '999999')`.

### DESPUÉS (Supabase SECURITY DEFINER)
```
Frontend ──► supabase.rpc('award_coins') ──► PostgreSQL function ──► UPDATE profiles SET balance
                                         └──► INSERT transactions  (ledger inmutable)
```
El frontend **nunca** puede escribir `balance` directamente. Solo las funciones
`SECURITY DEFINER` (que corren con permisos de servidor) pueden modificarlo.

---

## 2. Diagrama de base de datos

```
auth.users (Supabase interno)
    │
    ▼ ON INSERT trigger
profiles ──────────────────────────────────────────────────┐
  id (PK = auth.users.id)                                  │
  username, avatar_url, bio                                │
  balance         ← SOLO funciones SECURITY DEFINER        │
  banner_color    ← hex '#RRGGBB' (usuario puede editar)   │
  banner_item_id  ──► store_items                          │
  frame_item_id   ──► store_items                          │
  equipped_items  jsonb (cache de slots activos)           │
  last_daily_at                                            │
    │                                                      │
    ├──► user_achievements                                 │
    ├──► user_items ──► store_items                       │
    ├──► pet_loadouts ──► store_items (5 slots)            │
    ├──► transactions (ledger inmutable)                   │
    ├──► transfers (from/to)                               │
    ├──► balance_snapshots (por semana ISO)                │
    └──► fund_contributions ──► community_fund             │

store_items                                               │
  id (text)                                               │
  category: banner|frame|pet_accessory|cursor|theme|...   │
  price, rarity, metadata (jsonb)                         │
  max_supply, sold_count (para items limitados)           │
  available_until (para items temporales)                 │◄┘
```

### Flujo de una compra
```
Usuario hace click "Comprar"
  │
  ▼
supabase.rpc('purchase_item', { user_id, item_id })
  │
  ▼ (PostgreSQL — SECURITY DEFINER)
1. Verifica que item existe y está activo
2. Verifica que no está agotado (max_supply)
3. FOR UPDATE lock en profiles row
4. Verifica balance >= precio
5. UPDATE profiles SET balance = balance - precio
6. INSERT user_items (user_id, item_id)
7. UPDATE store_items SET sold_count = sold_count + 1
8. INSERT transactions (ledger)
  │
  ▼
Retorna { success: true, new_balance: N }
```

---

## 3. Plan de migración

### Fase 0: Preparar BD (inmediato)
```bash
# En Supabase SQL Editor, ejecutar en orden:
1. schema.sql          (ya existe)
2. economy.sql         (nuevo — toda la economía)
3. store_items_seed.sql (nuevo — items a la DB)
```

### Fase 1: Envolver EconomyProvider (en main.jsx o App.jsx)
```jsx
// main.jsx
import { EconomyProvider } from './contexts/EconomyContext';
import { AuthProvider } from './contexts/AuthContext';

<AuthProvider>
  <EconomyProvider>
    <App />
  </EconomyProvider>
</AuthProvider>
```

### Fase 2: La migración de localStorage es automática
Cuando el usuario inicia sesión por primera vez con el nuevo sistema,
`EconomyContext` llama automáticamente a `migrateLegacyCoins()` que:
1. Lee `localStorage['space-dan-coins']`
2. Llama `supabase.rpc('migrate_localstorage_coins')` (máx 2000 coins)
3. Borra localStorage
4. Marca en localStorage que ya se migró (para no repetir)

El servidor tiene una salvaguarda: solo se puede llamar una vez por usuario.

### Fase 3: Actualizar componentes que usan useStarlys
Búsqueda y reemplazo gradual:
```
useStarlys()      →  useEconomy()
awardCoins(amt)    →  economy.awardCoins(amt, 'game_reward')
spend(amt)         →  purchaseItem() via store service
```

### Fase 4: Actualizar ShopPage
La ShopPage actual usa `SHOP_ITEMS` hardcodeado en JS.
Reemplazar por:
```js
const items = await getStoreItems();  // desde services/store.js
```

---

## 4. Estructura de carpetas React

```
src/
├── contexts/
│   ├── AuthContext.jsx          ✅ existente
│   └── EconomyContext.jsx       🆕 NUEVO — reemplaza useStarlys localStorage
│
├── services/                   🆕 NUEVO (capa de datos)
│   ├── supabaseNotifications.js ✅ existente
│   ├── supabaseScores.js        ✅ existente
│   ├── economy.js               🆕 balance, transfers, daily, migration
│   ├── store.js                 🆕 catálogo, inventario, compra, equip
│   └── leaderboard.js           🆕 todas las pestañas del leaderboard
│
├── hooks/
│   ├── useAuth.js               ✅ existente (sin cambios)
│   ├── useAchievements.js       ⚠️ ACTUALIZAR: llamar awardCoins vía EconomyContext
│   ├── useHighScore.js          ✅ existente (sin cambios)
│   └── useTheme.js              ✅ existente (sin cambios)
│
├── pages/
│   ├── ShopPage.jsx             ⚠️ REFACTORIZAR: usar services/store.js
│   ├── ProfilePage.jsx          ⚠️ EXTENDER: wallet pública, banner, frame, pet
│   ├── GlobalLeaderboardPage.jsx ⚠️ EXTENDER: pestañas economía/crecimiento/generosidad
│   ├── WalletPage.jsx           🆕 NUEVO: historial de transacciones + transferencias
│   └── CommunityFundPage.jsx    🆕 NUEVO: fondo comunitario
│
└── components/
    ├── economy/
    │   ├── WalletBadge.jsx       🆕 balance visible en header/navbar
    │   ├── TransferModal.jsx     🆕 modal de transferencia entre usuarios
    │   └── TransactionList.jsx   🆕 lista de transacciones con tipos/iconos
    │
    ├── shop/
    │   ├── ShopGrid.jsx          🆕 grid de items con filtros
    │   └── ShopCard.jsx          🆕 tarjeta individual de item (rareza, precio)
    │
    ├── profile/
    │   ├── ProfileBanner.jsx     🆕 banner_color vs banner_item (gradient/fx)
    │   ├── ProfileFrame.jsx      🆕 marco sobre avatar
    │   └── WalletPublic.jsx      🆕 balance visible en perfiles ajenos
    │
    └── pet/
        ├── PetRenderer.jsx       🆕 renderiza SVG layers por slots
        └── PetLoadout.jsx        🆕 UI para equipar accesorios de mascota
```

---

## 5. Seguridad

### Regla de oro
> El frontend NUNCA escribe `balance` directamente. Solo lee.
> Toda mutación económica va por funciones `SECURITY DEFINER` en PostgreSQL.

### RLS por tabla

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | público | solo el dueño | solo el dueño (campos permitidos) | ❌ |
| `transactions` | solo el dueño | ❌ solo funciones | ❌ | ❌ |
| `transfers` | emisor y receptor | ❌ solo funciones | ❌ | ❌ |
| `user_items` | público | ❌ solo funciones | ❌ solo funciones | ❌ |
| `store_items` | público (activos) | ❌ solo admin | ❌ solo admin | ❌ |
| `balance_snapshots` | público | ❌ solo funciones | ❌ solo funciones | ❌ |
| `community_fund` | público | ❌ solo admin | ❌ solo funciones | ❌ |
| `fund_contributions` | público | ❌ solo funciones | ❌ | ❌ |
| `pet_loadouts` | público | solo el dueño | solo el dueño | ❌ |

### Qué NUNCA hacer en el frontend
```js
// ❌ NUNCA — manipulación directa de balance
await supabase.from('profiles').update({ balance: 999 }).eq('id', userId);

// ❌ NUNCA — insertar transacciones directamente
await supabase.from('transactions').insert({ user_id, amount: 500, type: 'achievement' });

// ❌ NUNCA — confiar en el precio del cliente
const price = req.body.price;  // ← esto solo existe en backend real, pero aplica para edge functions

// ✅ CORRECTO — pasar por función SECURITY DEFINER
await supabase.rpc('award_coins', { p_user_id: userId, p_amount: 50, p_type: 'achievement' });
```

### Validaciones en funciones PostgreSQL
- `auth.uid() != p_user_id` → no puedes actuar por otro usuario
- `balance >= 0 CHECK` → el balance nunca puede ser negativo (constraint DB)
- `FOR UPDATE` lock → previene race conditions en compras/transfers simultáneas
- Rate limiting en transfers → 5 tx/hora, 1000 coins/hora de volumen
- Daily bonus → verificado en el ledger, no en un campo que el usuario pueda manipular
- Caps diarios por tipo de transacción

---

## 6. Sistema económico y anti-inflación

### Fuentes de coins (income)
| Fuente | Cantidad | Cap diario |
|--------|----------|------------|
| Logro desbloqueado | variable (20-500) | sin cap (logros son únicos) |
| Bonus diario | 30 | 1 vez/20h |
| Visitar página nueva | 5 | 100/día |
| Récord de juego | 50 | 500/día total juegos |
| Recompensa de fondo | variable | según evento |

### Salidas de coins (sinks)
- Compras en tienda (permanentes — coins destruidos)
- Comisión de transferencia 5% (coins destruidos — deflacionario)
- Donaciones al fondo (redistribuidas)

### Estrategias anti-inflación
1. **Caps diarios por tipo** — ya implementados en `award_coins()`
2. **Items caros de rareza alta** — el endgame cuesta 300-500 coins
3. **Comisión de transferencia** — destruye coins en cada transfer
4. **Items limitados** — `max_supply` crea escasez artificial
5. **Fondos con metas altas** — drenan coins del sistema periódicamente
6. **Sin generación infinita** — logros son únicos, no repetibles

### Señales de inflación a monitorear (queries útiles)
```sql
-- Total de coins en circulación
SELECT SUM(balance) FROM profiles;

-- Coins generados vs destruidos esta semana
SELECT type, SUM(amount) FROM transactions
WHERE created_at > now() - interval '7 days'
GROUP BY type ORDER BY SUM(amount) DESC;

-- Usuarios con balance extremo (posibles bots/exploits)
SELECT username, balance FROM profiles
WHERE balance > 10000 ORDER BY balance DESC;
```

---

## 7. Pet Accessories — SVG Architecture

### Estructura de layers
```
PetRenderer.jsx
└── <div className="pet-container">
    ├── <img src="bg_svg" className="pet-layer pet-bg" />
    ├── <img src="pet_base.svg" className="pet-layer pet-base" />
    ├── <img src="body_svg" className="pet-layer pet-body" />
    ├── <img src="head_svg" className="pet-layer pet-head" />
    ├── <img src="extra_svg" className="pet-layer pet-extra" />
    └── <img src="hand_svg" className="pet-layer pet-hand" />
```

### Donde almacenar los SVGs
**Opción A (recomendada): Supabase Storage**
```
supabase/storage/pet-accessories/
  ├── hat_cap.svg
  ├── hat_wizard.svg
  ├── bg_space.svg
  └── ...
```
El campo `metadata.svg_id` en `store_items` actúa como key para construir la URL:
```js
const svgUrl = `${supabaseUrl}/storage/v1/object/public/pet-accessories/${svgId}.svg`;
```

**Opción B: Assets en el proyecto**
```
public/pets/
  ├── hat_cap.svg
  ├── hat_wizard.svg
  └── ...
```
Más simple, pero require redeploy para agregar accesorios.

### CSS para layers
```css
.pet-container {
  position: relative;
  width: 120px;
  height: 120px;
}
.pet-layer {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}
.pet-base   { z-index: 1; }
.pet-bg     { z-index: 0; }
.pet-body   { z-index: 2; }
.pet-head   { z-index: 3; }
.pet-extra  { z-index: 4; }
.pet-hand   { z-index: 5; }
```

---

## 8. Leaderboard — Tabs y queries

| Tab | Función SQL | Métrica |
|-----|-------------|---------|
| 🎮 Juegos | `get_leaderboard(game_id)` | mejor score por juego |
| 🌍 Global | `get_global_leaderboard()` | suma de mejores scores |
| 💰 Economía | `get_wealth_leaderboard()` | balance actual |
| 📈 Crecimiento | `get_weekly_growth_leaderboard()` | Δbalance esta semana |
| 🤝 Generosos | `get_generosity_leaderboard()` | total donado al fondo |
| 🏆 Logros | `get_achievement_leaderboard()` | cantidad de logros |

### Sobre el crecimiento semanal
La tabla `balance_snapshots` guarda el balance al final de cada semana ISO.
Al inicio de la semana siguiente se calcula `balance_actual - balance_semana_anterior`.
Esto **no** captura el ciclo completo sino el estado al momento de la query,
lo cual es correcto para mostrar "quién más creció esta semana en términos netos".

---

## 9. Fondo Comunitario — Estrategia

### Por qué `proportional` es mejor que `equal`
- **Equal**: todos reciben lo mismo sin importar su contribución.
  Incentivo para donar lo mínimo y esperar a otros.
  (Problema del "free rider" — dilema del prisionero)

- **Proportional**: quien más dona, más recibe.
  Incentiva donaciones grandes, pero puede concentrar recompensas en los más ricos.

### Recomendación: **Hybrid**
```
Si donaste >= 10% del objetivo → tier "Fundador" → item exclusivo + coins
Si donaste >= 1% del objetivo  → tier "Colaborador" → coins proporcionales
Si donaste algo                → tier "Participante" → badge cosmético
```
Esto combina exclusividad (fundadores) con inclusividad (cualquiera puede participar).
Implementación: una función `distribute_fund_rewards()` que se ejecuta al completarse el fondo.

---

## 10. Escalabilidad futura

### Corto plazo
- [ ] Edge Functions para lógica más compleja (ej. anti-cheat en juegos)
- [ ] `pg_cron` para snapshots automáticos semanales
- [ ] Admin panel (puede ser tabla `admin_roles` + policies)

### Mediano plazo
- [ ] Sistema de temporadas económicas (reset parcial de balance)
- [ ] Subasta de items limitados entre usuarios
- [ ] Staking: "bloquear" coins por X días para multiplicador
- [ ] NFT-like: items transferibles (actualmente no hay marketplace)

### Largo plazo
- [ ] Multi-tenant si el proyecto crece a otros usuarios/comunidades
- [ ] API pública de Starlys (con rate limiting por API key)
- [ ] Integración con webhooks externos (Twitch bits → Starlys, etc.)

---

## 11. Riesgos y advertencias

### Riesgos económicos
⚠️ **Inflación sin control**: Si se agregan nuevas fuentes de coins sin nuevos sinks,
el balance promedio sube indefinidamente y los precios de tienda pierden valor.
→ **Mitigation**: monitorear `SUM(balance)` semanalmente. Si sube >20% sin nuevos items, subir precios o agregar un evento de fondo.

⚠️ **Grinding bots**: Usuarios que automatizan visitas/juegos para farmear coins.
→ **Mitigation**: caps diarios, CAPTCHAs en juegos de alto reward, análisis de patrones.

⚠️ **Rich get richer**: Los usuarios con más coins pueden dominar todos los leaderboards.
→ **Mitigation**: leaderboard de crecimiento % (favorece a quienes parten de menos).

### Riesgos sociales
⚠️ **Toxicidad por economía**: Rankings económicos pueden crear resentimiento.
→ **Mitigation**: no mostrar balance exacto de otros usuarios en el leaderboard principal,
solo el ranking. El balance exacto es opcional en el perfil.

⚠️ **Transferencias como extorsión**: "Págame o te reporto".
→ **Mitigation**: transferencias opcionales (no obligatorias), sin deuda, rate limiting.

⚠️ **FOMO por items limitados**: Usuarios que se sienten excluidos.
→ **Mitigation**: nunca items limitados que afecten gameplay, solo cosméticos.
Siempre tener una "temporada" futura con items equivalentes.

### Riesgos técnicos
⚠️ **Race conditions en compras**: Dos clicks simultáneos comprando el último item limitado.
→ **Mitigation**: `FOR UPDATE` lock en `purchase_item()` ya resuelve esto.

⚠️ **Costo de Supabase**: Con muchos usuarios, las funciones y realtime tienen costo.
→ **Mitigation**: balance_snapshots evita queries pesadas; funciones son eficientes.
