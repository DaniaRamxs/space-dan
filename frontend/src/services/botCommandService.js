/**
 * Bot command service
 * Detecta y ejecuta comandos de bot como /chimu
 */

import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'https://spacely-server-production.up.railway.app';

export const botCommandService = {
  /**
   * Verifica si el mensaje es un comando de bot
   */
  isBotCommand(content) {
    if (!content) return false;
    return content.trim().startsWith('/');
  },

  /**
   * Parsea el comando y argumentos
   * /chimu feed arg1 arg2 -> { command: 'feed', args: ['arg1', 'arg2'] }
   */
  parseCommand(content) {
    const parts = content.trim().substring(1).split(' ');
    const botName = parts[0]; // 'chimu'
    const command = parts[1] || 'status'; // 'feed', 'play', etc. o 'status' por defecto
    const args = parts.slice(2); // argumentos restantes
    
    return { botName, command, args };
  },

  /**
   * Ejecuta un comando de bot
   */
  async executeCommand(content, communityId, userId, profile = null) {
    if (!this.isBotCommand(content)) {
      return { isBotCommand: false };
    }

    const { botName, command, args } = this.parseCommand(content);

    try {
      // Para ChimuGotchi usamos Supabase directamente (más rápido)
      if (botName === 'chimu') {
        return await this.executeChimuCommand(command, args, communityId, userId);
      }
      
      // Para WelcomeBot
      if (botName === 'welcome') {
        return await this.executeWelcomeCommand(command, args, communityId, userId, profile);
      }

      // Para otros bots usaríamos la API
      const response = await fetch(`${API_URL}/api/bots/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communityId,
          botType: botName,
          command,
          args,
          userId
        })
      });

      const data = await response.json();
      return { isBotCommand: true, ...data };
    } catch (error) {
      console.error('[BotCommandService] Error:', error);
      return {
        isBotCommand: true,
        error: true,
        message: '❌ Error al ejecutar comando'
      };
    }
  },

  /**
   * Ejecuta comando de ChimuGotchi directamente
   */
  async executeChimuCommand(command, args, communityId, userId) {
    // Get or create pet
    let { data: pet, error } = await supabase
      .from('chimugotchi_pets')
      .select('*')
      .eq('owner_id', userId)
      .eq('community_id', communityId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Create new pet if doesn't exist
    if (!pet) {
      const personalities = ['traviesa', 'cariñosa', 'perezosa', 'energética', 'glotona', 'limpiecita'];
      const personality = personalities[Math.floor(Math.random() * personalities.length)];
      
      const { data: newPet, error: createError } = await supabase
        .from('chimugotchi_pets')
        .insert({
          owner_id: userId,
          community_id: communityId,
          name: 'Chimuelo',
          personality,
          hunger: 80,
          happiness: 60,
          energy: 100,
          hygiene: 90,
          health: 100,
          coins: 50
        })
        .select()
        .single();

      if (createError) throw createError;
      pet = newPet;
    }

    let result = '';
    let updates = {};

    switch (command) {
      case 'status':
      case undefined:
        result = this.formatStatus(pet);
        break;

      case 'feed':
        if (!pet.is_alive) {
          result = '💀 No puedes alimentar a una paloma que ya no está...';
        } else if (pet.is_sleeping) {
          result = '😴 Shhh... está durmiendo!';
        } else if (pet.hunger >= 95) {
          result = '🍕 Está llenita! No quiere más comida.';
        } else {
          const foodBoost = Math.floor(Math.random() * 15) + 10;
          updates = {
            hunger: Math.min(100, pet.hunger + foodBoost),
            happiness: Math.min(100, pet.happiness + 5),
            coins: pet.coins + 1,
            last_interaction: new Date().toISOString()
          };
          const foods = ['🌽 maíz', '🍞 pan', '🌾 semillas'];
          const food = foods[Math.floor(Math.random() * foods.length)];
          result = `🕊️ **${pet.name}** comió ${food} felizmente!\n🍕 +${foodBoost}% hambre | 😊 +5% felicidad | 🪙 +1 moneda`;
        }
        break;

      case 'play':
        if (!pet.is_alive) {
          result = '💀 ...';
        } else if (pet.is_sleeping) {
          result = '😴 Está soñando con volar...';
        } else if (pet.energy < 20) {
          result = '⚡ Está muy cansada para jugar.';
        } else {
          const games = ['volar en círculos', 'picotear semillas', 'cantar palomadas'];
          const game = games[Math.floor(Math.random() * games.length)];
          updates = {
            energy: Math.max(0, pet.energy - 15),
            happiness: Math.min(100, pet.happiness + 20),
            hunger: Math.max(0, pet.hunger - 10),
            coins: pet.coins + 2,
            last_interaction: new Date().toISOString()
          };
          result = `🕊️ **${pet.name}** jugó ${game}!\n⚡ -15% energía | 😊 +20% felicidad | 🍕 -10% hambre | 🪙 +2 monedas`;
        }
        break;

      case 'pet':
        if (!pet.is_alive) {
          result = '💀 ...';
        } else if (pet.is_sleeping) {
          result = '😴 Ronronea en sueños...';
        } else {
          const responses = [
            'Cierra los ojitos de felicidad 🥰',
            'Hace "coo-coo-cooo" 💕',
            'Se eriza las plumas de gusto'
          ];
          const response = responses[Math.floor(Math.random() * responses.length)];
          updates = {
            happiness: Math.min(100, pet.happiness + 15),
            health: Math.min(100, pet.health + 5),
            last_interaction: new Date().toISOString()
          };
          result = `🕊️ **${pet.name}**: "${response}"\n😊 +15% felicidad | ❤️ +5% salud`;
        }
        break;

      case 'clean':
        if (!pet.is_alive) {
          result = '💀 ...';
        } else if (pet.hygiene >= 90) {
          result = '🧼 Ya está limpiecita!';
        } else {
          updates = {
            hygiene: 100,
            happiness: Math.min(100, pet.happiness + 5),
            coins: pet.coins + 1,
            last_interaction: new Date().toISOString()
          };
          result = `🛁 Bañaste a **${pet.name}**! Ahora brilla ✨\n🧼 100% higiene | 😊 +5% felicidad | 🪙 +1 moneda`;
        }
        break;

      case 'sleep':
        if (!pet.is_alive) {
          result = '💀 ...';
        } else if (pet.is_sleeping) {
          result = '😴 Ya está dormida!';
        } else {
          updates = { 
            is_sleeping: true,
            last_interaction: new Date().toISOString()
          };
          result = `🌙 **${pet.name}** se fue a dormir a su palomar... Dulces sueños! 🕊️💤`;
        }
        break;

      case 'wake':
        if (!pet.is_alive) {
          result = '💀 ...';
        } else if (!pet.is_sleeping) {
          result = '🕊️ Ya está despierta!';
        } else {
          const energyRecovered = Math.min(100, pet.energy + 30);
          updates = { 
            is_sleeping: false,
            energy: energyRecovered,
            last_interaction: new Date().toISOString()
          };
          result = `☀️ **${pet.name}** despertó! Coo-coo-cooo! 🕊️\n⚡ +30% energía`;
        }
        break;

      case 'name':
      case 'rename':
        const newName = args.join(' ');
        if (!newName) {
          result = '❌ Uso: /chimu name <nuevo nombre>';
        } else if (newName.length > 20) {
          result = '❌ El nombre es muy largo (máx 20 caracteres)';
        } else if (newName.length < 2) {
          result = '❌ El nombre es muy corto';
        } else {
          updates = { 
            name: newName,
            last_interaction: new Date().toISOString()
          };
          result = `🕊️ **${pet.name}** ahora se llama **${newName}**!`;
        }
        break;

      case 'help':
        result = `🕊️ **Comandos de ChimuGotchi:**
• /chimu - Ver estado
• /chimu feed - Alimentar
• /chimu play - Jugar
• /chimu pet - Acariciar
• /chimu clean - Limpiar
• /chimu sleep - Dormir
• /chimu wake - Despertar
• /chimu name <nombre> - Renombrar`;
        break;

      default:
        result = `❓ Comando desconocido. Usa /chimu help para ver los comandos disponibles.`;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('chimugotchi_pets')
        .update(updates)
        .eq('id', pet.id);

      if (updateError) throw updateError;
    }

    return {
      isBotCommand: true,
      result,
      pet: { ...pet, ...updates }
    };
  },

  formatStatus(pet) {
    if (!pet.is_alive) {
      return `💀 **${pet.name}** ha fallecido... Usa /chimu para adoptar una nueva.`;
    }

    const state = this.getPetState(pet);
    const emoji = this.getStateEmoji(state);

    const bars = {
      hunger: this.renderBar(pet.hunger),
      happiness: this.renderBar(pet.happiness),
      energy: this.renderBar(pet.energy),
      hygiene: this.renderBar(pet.hygiene),
      health: this.renderBar(pet.health)
    };

    return `${emoji} Chimuelo el Palomo ${pet.personality === 'glotona' ? 'gloton' : pet.personality}

🍕 Hambre: ${bars.hunger} ${pet.hunger}%
😊 Felicidad: ${bars.happiness} ${pet.happiness}%
⚡ Energía: ${pet.is_sleeping ? '😴 Durmiendo' : `${bars.energy} ${pet.energy}%`}
🧼 Higiene: ${bars.hygiene} ${pet.hygiene}%
❤️ Salud: ${bars.health} ${pet.health}%

🪙 ${pet.coins} monedas | 🎂 ${pet.age?.toFixed(1) || 0} días`;
  },

  getPetState(pet) {
    if (!pet.is_alive) return 'DEAD';
    if (pet.health < 20) return 'SICK';
    if (pet.is_sleeping) return 'SLEEPY';
    if (pet.hygiene < 30) return 'DIRTY';
    if (pet.hunger < 30) return 'HUNGRY';
    if (pet.happiness > 80 && pet.energy > 50) return 'PLAYFUL';
    if (pet.happiness < 30) return 'SAD';
    return 'HAPPY';
  },

  getStateEmoji(state) {
    const emojis = {
      HAPPY: '🕊️', HUNGRY: '🥺', SLEEPY: '😴', DIRTY: '🤢',
      SAD: '😢', PLAYFUL: '🎾', SICK: '🤒', DEAD: '💀'
    };
    return emojis[state] || '🕊️';
  },

  renderBar(value) {
    const filled = Math.round(value / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  },

  /**
   * Ejecuta comando de WelcomeBot
   */
  async executeWelcomeCommand(command, args, communityId, userId, profile = null) {
    // Check if user is community owner
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('creator_id')
      .eq('id', communityId)
      .single();
    
    if (communityError) {
      return { isBotCommand: true, result: '❌ Error al verificar permisos' };
    }
    
    const isOwner = community?.creator_id === userId;
    
    if (!isOwner) {
      return { 
        isBotCommand: true, 
        result: '❌ Solo el owner de la comunidad puede configurar el WelcomeBot' 
      };
    }

    // Load current settings for commands that need them
    const currentSettings = await this.getWelcomeSettings(communityId);

    switch (command) {
      case 'setup': {
        const msg = currentSettings.customMessage || '(mensaje aleatorio)';
        const color = currentSettings.accentColor || '#5865F2';
        const ping = currentSettings.pingUser ? '✅ activado' : '❌ desactivado';
        const rules = currentSettings.showRules ? '✅ activadas' : '❌ desactivadas';
        const goodbye = currentSettings.enableGoodbye ? '✅ activado' : '❌ desactivado';
        return {
          isBotCommand: true,
          result: `🤖 **WelcomeBot — Configuración actual**

💬 Mensaje: ${msg}
🎨 Color: ${color}
📣 Ping al usuario: ${ping}
📜 Mostrar reglas: ${rules}
👋 Despedidas: ${goodbye}

✏️ Comandos:
\`/welcome message <texto>\` — Cambiar mensaje
\`/welcome color #RRGGBB\` — Cambiar color
\`/welcome ping on|off\` — Activar/desactivar ping
\`/welcome rules on|off\` — Mostrar/ocultar reglas
\`/welcome goodbye on|off\` — Activar/desactivar despedidas
\`/welcome test\` — Ver previa del mensaje

💡 Variables: \`{user}\` \`{username}\` \`{server}\` \`{memberCount}\``
        };
      }

      case 'message': {
        const message = args.join(' ');
        if (!message) {
          return { isBotCommand: true, result: '❌ Uso: /welcome message <tu mensaje>' };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, customMessage: message });
        return { isBotCommand: true, result: `✅ Mensaje actualizado:\n"${message}"` };
      }

      case 'color': {
        const color = args[0];
        if (!color || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
          return { isBotCommand: true, result: '❌ Uso: /welcome color #RRGGBB (ej: #5865F2)' };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, accentColor: color });
        return { isBotCommand: true, result: `✅ Color actualizado a ${color}` };
      }

      case 'ping': {
        const val = args[0]?.toLowerCase();
        if (val !== 'on' && val !== 'off') {
          return { isBotCommand: true, result: '❌ Uso: /welcome ping on|off' };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, pingUser: val === 'on' });
        return { isBotCommand: true, result: `✅ Ping al usuario: ${val === 'on' ? 'activado' : 'desactivado'}` };
      }

      case 'rules': {
        const val = args[0]?.toLowerCase();
        if (val !== 'on' && val !== 'off') {
          return { isBotCommand: true, result: '❌ Uso: /welcome rules on|off' };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, showRules: val === 'on' });
        return { isBotCommand: true, result: `✅ Reglas en bienvenida: ${val === 'on' ? 'activadas' : 'desactivadas'}` };
      }

      case 'goodbye': {
        const val = args[0]?.toLowerCase();
        if (val !== 'on' && val !== 'off') {
          return { isBotCommand: true, result: '❌ Uso: /welcome goodbye on|off' };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, enableGoodbye: val === 'on' });
        return { isBotCommand: true, result: `✅ Despedidas: ${val === 'on' ? 'activadas' : 'desactivadas'}` };
      }

      case 'test': {
        const welcomeMsg = currentSettings.customMessage || '¡{user} acaba de aterrizar! 🚀';
        const preview = welcomeMsg
          .replace(/{user}/g, `@${profile?.username || 'tú'}`)
          .replace(/{username}/g, profile?.username || 'tú')
          .replace(/{server}/g, 'este servidor')
          .replace(/{memberCount}/g, '?');
        const rules = currentSettings.showRules
          ? '\n\n📜 **Reglas**\n1. Sé respetuoso\n2. No spam\n3. Diviértete 🎉'
          : '';
        return {
          isBotCommand: true,
          result: `👋 **Vista previa del mensaje de bienvenida:**\n\n${preview}${rules}\n\n🎨 Color: ${currentSettings.accentColor || '#5865F2'}`
        };
      }

      case 'help':
      default:
        return {
          isBotCommand: true,
          result: `🤖 **WelcomeBot Comandos:**

• /welcome setup — Ver configuración actual
• /welcome message <texto> — Cambiar mensaje
• /welcome color #RRGGBB — Cambiar color
• /welcome ping on|off — Mencionar al nuevo miembro
• /welcome rules on|off — Mostrar reglas en bienvenida
• /welcome goodbye on|off — Mensajes de despedida
• /welcome test — Previa del mensaje

Variables: {user}, {username}, {server}, {memberCount}`
        };
    }
  },

  async saveWelcomeSettings(communityId, settings) {
    const { error } = await supabase
      .from('community_bot_settings')
      .upsert({
        community_id: communityId,
        bot_type: 'welcome',
        settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'community_id,bot_type'
      });

    if (error) throw error;
  },

  async getWelcomeSettings(communityId) {
    const { data } = await supabase
      .from('community_bot_settings')
      .select('settings')
      .eq('community_id', communityId)
      .eq('bot_type', 'welcome')
      .single();

    return data?.settings || {
      customMessage: null,
      showAvatar: true,
      showMemberCount: true,
      showRules: false,
      accentColor: '#5865F2',
      pingUser: false,
      enableGoodbye: false,
    };
  }
};

export default botCommandService;
