# 🤖 Bot System - Guía de Comandos

## ChimuGotchi 🕊️
Tu palomita virtual tipo Tamagotchi

### Comandos Básicos
```
/chimu              - Ver estado de tu paloma
/chimu status       - Mismo que arriba
/chimu feed         - Dar de comer
/chimu play         - Jugar con Chimuelo
/chimu pet          - Acariciar
/chimu clean        - Limpiar su casa
/chimu sleep        - Dormir
/chimu wake         - Despertar
/chimu name <nombre> - Cambiar nombre
```

### Tienda
```
/chimu shop         - Ver tienda de items
/chimu buy <item>   - Comprar item
```

### Social
```
/chimu gift <user> <item> - Regalar item a otro usuario
/chimu leaderboard  - Top palomitas de la comunidad
```

### Stats
- 🍕 **Hambre** (0-100) - Baja con el tiempo, sube al comer
- 😊 **Felicidad** (0-100) - Sube jugando/acariciando
- ⚡ **Energía** (0-100) - Baja jugando, recupera durmiendo
- 🧼 **Higiene** (0-100) - Baja con el tiempo, sube limpiando
- ❤️ **Salud** (0-100) - Baja si otros stats están bajos
- 🪙 **Monedas** - Ganas haciendo acciones, gastas en tienda

### Estados
- 🕊️ **Feliz** - Todo bien
- 🥺 **Hambrienta** - Necesita comer
- 😴 **Dormida** - Recuperando energía
- 🤢 **Sucia** - Necesita baño
- 😢 **Triste** - Necesita cariño
- 🎾 **Juguetona** - Quiere jugar
- 🤒 **Enferma** - Necesita medicina
- 💀 **Fallecida** - RIP, adopta otra

---

## WelcomeBot 🤖
Mensajes de bienvenida estilo Discord

### Comandos (Owner only)
```
/welcome setup      - Configurar mensaje de bienvenida
/welcome test       - Probar mensaje
/welcome disable    - Desactivar
/welcome enable     - Activar
```

### Variables de Mensaje
```
{user}        - Mención al usuario
{username}    - Nombre del usuario
{server}      - Nombre del servidor
{memberCount} - Número de miembros
```

### Ejemplo de Config
```
Mensaje: "¡{user} acaba de aterrizar en {server}! Somos {memberCount} miembros 🎉"
Color: #5865F2 (azul Discord)
Canal: #bienvenida
```

### Features
- ✅ Embeds con color personalizable
- ✅ Thumbnail del avatar del usuario
- ✅ Footer con contador de miembros
- ✅ Campos personalizables (reglas, about)
- ✅ Mensaje privado opcional
- ✅ Auto-rol opcional
- ✅ Mensaje de despedida

---

## Cómo Integrar en el Frontend

### ChimuGotchi Component
```jsx
import ChimuGotchi from './components/Bots/ChimuGotchi';

// En tu página de comunidad:
<ChimuGotchi communityId={community.id} userId={user.id} />
```

### WelcomeBot Integration
El WelcomeBot se integra automáticamente cuando un usuario se une:

```javascript
// En tu servicio de comunidades:
import WelcomeBot from '../modules/bots/WelcomeBot.mjs';

const welcomeBot = new WelcomeBot(supabaseUrl, supabaseKey);

// Cuando alguien se une:
const welcomeMsg = await welcomeBot.generateWelcomeEmbed(user, community, settings);
// Enviar welcomeMsg.embed al canal de bienvenida
```

---

## Setup Inicial

### 1. Ejecutar SQL
```sql
-- En Supabase SQL Editor, ejecutar:
-- supabase/bot_system_schema.sql
```

### 2. Items por Defecto
Ya están insertados automáticamente:
- 🌽 Maíz (5 monedas)
- 🍞 Pan (8 monedas)
- 🍇 Uvas (15 monedas)
- ⚽ Pelota (20 monedas)
- 💊 Medicina (50 monedas)
- 👑 Corona (500 monedas)

### 3. Configurar WelcomeBot (Opcional)
En tu panel de admin:
1. Ir a Configuración → Bots
2. Activar WelcomeBot
3. Personalizar mensaje y color
4. Seleccionar canal

---

## Tips

### ChimuGotchi
- Tu paloma pierde stats cada minuto (hunger -3, hygiene -2)
- Recupera energía durmiendo (+5/min)
- Si salud llega a 0, la paloma muere
- Usa `/chimu leaderboard` para ver quién tiene la paloma más longeva

### WelcomeBot  
- Puedes tener mensajes diferentes para milestones:
  - 1er miembro: "🎉 ¡Eres el primero!"
  - 100 miembros: "💯 ¡Oficialmente populares!"
  - 1000 miembros: "👑 ¡LEYENDA!"

---

## Troubleshooting

### "No tengo una paloma"
Ejecuta `/chimu` - se creará automáticamente

### "Mi paloma murió"
Usa `/chimu` de nuevo para adoptar una nueva (pero pierdes todo)

### "No puedo comprar"
Necesitas más monedas. Haz `/chimu feed`, `/chimu play`, `/chimu clean` para ganar.

### "Welcome no funciona"
Verifica que:
1. El bot está habilitado en settings
2. Hay un canal seleccionado
3. El mensaje no está vacío

---

## API Endpoints

### Bot Commands
```
POST /api/bots/command
Body: { communityId, botType: "chimugotchi", command, args, userId }
```

### Get/Set Settings
```
GET  /api/bots/settings/:communityId/:botType
POST /api/bots/settings/:communityId/:botType
Body: { settings }
```

### Leaderboard
```
GET /api/bots/chimugotchi/leaderboard/:communityId
```

### Shop
```
GET /api/bots/chimugotchi/shop
POST /api/bots/chimugotchi/buy
Body: { petId, itemId, userId }
```
