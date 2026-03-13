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

    let result = null;
    let updates = {};

    switch (command) {
      case 'status':
      case undefined:
        result = this.formatStatus(pet);
        break;

      case 'feed':
        if (!pet.is_alive) {
          result = { type: 'embed', title: '🕊️', description: 'No puedes alimentar a una paloma que ya no está...', color: '#374151' };
        } else if (pet.is_sleeping) {
          result = { type: 'embed', title: '🕊️', description: 'Shhh... está durmiendo!', color: '#7c3aed' };
        } else if (pet.hunger >= 95) {
          result = { type: 'embed', title: '🕊️', description: 'Está llenita! No quiere más comida.', color: '#f97316' };
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
          result = {
            type: 'embed',
            title: `🕊️ ${pet.name}`,
            description: `Comió ${food} felizmente!`,
            color: '#22c55e',
            fields: [
              { name: '🍕 Hambre', value: `+${foodBoost}%`, inline: true },
              { name: '😊 Felicidad', value: '+5%', inline: true },
              { name: '🪙 Monedas', value: '+1 moneda', inline: true },
            ]
          };
        }
        break;

      case 'play':
        if (!pet.is_alive) {
          result = { type: 'embed', title: '💀', description: '...', color: '#374151' };
        } else if (pet.is_sleeping) {
          result = { type: 'embed', title: '🕊️', description: 'Está soñando con volar...', color: '#7c3aed' };
        } else if (pet.energy < 20) {
          result = { type: 'embed', title: '🕊️', description: 'Está muy cansada para jugar.', color: '#f97316' };
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
          result = {
            type: 'embed',
            title: `🕊️ ${pet.name}`,
            description: `Jugó ${game}!`,
            color: '#ec4899',
            fields: [
              { name: '⚡ Energía', value: '-15%', inline: true },
              { name: '😊 Felicidad', value: '+20%', inline: true },
              { name: '🍕 Hambre', value: '-10%', inline: true },
              { name: '🪙 Monedas', value: '+2 monedas', inline: true },
            ]
          };
        }
        break;

      case 'pet':
        if (!pet.is_alive) {
          result = { type: 'embed', title: '💀', description: '...', color: '#374151' };
        } else if (pet.is_sleeping) {
          result = { type: 'embed', title: '🕊️', description: 'Ronronea en sueños...', color: '#7c3aed' };
        } else {
          const petResponses = [
            'Cierra los ojitos de felicidad 🥰',
            'Hace "coo-coo-cooo" 💕',
            'Se eriza las plumas de gusto'
          ];
          const petResponse = petResponses[Math.floor(Math.random() * petResponses.length)];
          updates = {
            happiness: Math.min(100, pet.happiness + 15),
            health: Math.min(100, pet.health + 5),
            last_interaction: new Date().toISOString()
          };
          result = {
            type: 'embed',
            title: `🕊️ ${pet.name}`,
            description: `"${petResponse}"`,
            color: '#ec4899',
            fields: [
              { name: '😊 Felicidad', value: '+15%', inline: true },
              { name: '❤️ Salud', value: '+5%', inline: true },
            ]
          };
        }
        break;

      case 'clean':
        if (!pet.is_alive) {
          result = { type: 'embed', title: '💀', description: '...', color: '#374151' };
        } else if (pet.hygiene >= 90) {
          result = { type: 'embed', title: '🕊️', description: 'Ya está limpiecita!', color: '#f97316' };
        } else {
          updates = {
            hygiene: 100,
            happiness: Math.min(100, pet.happiness + 5),
            coins: pet.coins + 1,
            last_interaction: new Date().toISOString()
          };
          result = {
            type: 'embed',
            title: `🛁 ${pet.name}`,
            description: 'Ahora brilla de limpio! ✨',
            color: '#22c55e',
            fields: [
              { name: '🧼 Higiene', value: '100%', inline: true },
              { name: '😊 Felicidad', value: '+5%', inline: true },
              { name: '🪙 Monedas', value: '+1 moneda', inline: true },
            ]
          };
        }
        break;

      case 'sleep':
        if (!pet.is_alive) {
          result = { type: 'embed', title: '💀', description: '...', color: '#374151' };
        } else if (pet.is_sleeping) {
          result = { type: 'embed', title: '🕊️', description: 'Ya está dormida!', color: '#f97316' };
        } else {
          updates = {
            is_sleeping: true,
            last_interaction: new Date().toISOString()
          };
          result = {
            type: 'embed',
            title: `🌙 ${pet.name}`,
            description: 'Se fue a dormir a su palomar... Dulces sueños! 🕊️💤',
            color: '#7c3aed'
          };
        }
        break;

      case 'wake':
        if (!pet.is_alive) {
          result = { type: 'embed', title: '💀', description: '...', color: '#374151' };
        } else if (!pet.is_sleeping) {
          result = { type: 'embed', title: '🕊️', description: 'Ya está despierta!', color: '#f97316' };
        } else {
          const energyRecovered = Math.min(100, pet.energy + 30);
          updates = {
            is_sleeping: false,
            energy: energyRecovered,
            last_interaction: new Date().toISOString()
          };
          result = {
            type: 'embed',
            title: `☀️ ${pet.name}`,
            description: 'Despertó! Coo-coo-cooo! 🕊️',
            color: '#22c55e',
            fields: [
              { name: '⚡ Energía', value: '+30%', inline: true },
            ]
          };
        }
        break;

      case 'name':
      case 'rename': {
        const newName = args.join(' ');
        if (!newName) {
          result = { type: 'embed', title: '❌', description: 'Uso: /chimu name <nuevo nombre>', color: '#f97316' };
        } else if (newName.length > 20) {
          result = { type: 'embed', title: '❌', description: 'El nombre es muy largo (máx 20 caracteres)', color: '#f97316' };
        } else if (newName.length < 2) {
          result = { type: 'embed', title: '❌', description: 'El nombre es muy corto', color: '#f97316' };
        } else {
          updates = {
            name: newName,
            last_interaction: new Date().toISOString()
          };
          result = {
            type: 'embed',
            title: `🕊️ ${pet.name}`,
            description: `Ahora se llama **${newName}**! 📝`,
            color: '#6366f1'
          };
        }
        break;
      }

      case 'help':
        result = {
          type: 'embed',
          title: '🕊️ ChimuBot — Comandos',
          description: 'Tu paloma virtual personal',
          color: '#6366f1',
          fields: [
            { name: '/chimu', value: 'Ver estado de tu paloma', inline: true },
            { name: '/chimu feed', value: 'Dar de comer 🍕', inline: true },
            { name: '/chimu play', value: 'Jugar con Chimuelo 🎾', inline: true },
            { name: '/chimu pet', value: 'Acariciar 🥰', inline: true },
            { name: '/chimu clean', value: 'Limpiar 🛁', inline: true },
            { name: '/chimu sleep', value: 'Mandar a dormir 🌙', inline: true },
            { name: '/chimu wake', value: 'Despertar ☀️', inline: true },
            { name: '/chimu name <nombre>', value: 'Renombrar 📝', inline: true },
            { name: '/chimu leaderboard', value: 'Ranking del palomar 🏆', inline: false },
          ],
          footer: 'Cada acción te da monedas 🪙'
        };
        break;

      case 'leaderboard': {
        const { data: topPets, error: lbError } = await supabase
          .from('chimugotchi_pets')
          .select('name, coins, owner_id, personality')
          .eq('community_id', communityId)
          .eq('is_alive', true)
          .order('coins', { ascending: false })
          .limit(10);

        if (lbError) {
          result = { type: 'embed', title: '❌', description: 'Error al cargar el ranking', color: '#f97316' };
        } else if (!topPets || topPets.length === 0) {
          result = { type: 'embed', title: '🏆 Palomar', description: 'Aún no hay palomas en este servidor', color: '#6366f1' };
        } else {
          const medals = ['🥇', '🥈', '🥉'];
          const fields = topPets.map((p, i) => ({
            name: `${medals[i] || `${i + 1}.`} ${p.name}`,
            value: `🪙 ${p.coins} monedas · ${p.personality}`,
            inline: false
          }));
          result = {
            type: 'embed',
            title: '🏆 Ranking del Palomar',
            description: 'Las palomas más ricas de la comunidad',
            color: '#f59e0b',
            fields
          };
        }
        break;
      }

      default:
        result = { type: 'embed', title: '❓', description: 'Comando desconocido. Usa /chimu help para ver los comandos disponibles.', color: '#f97316' };
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
      return {
        type: 'embed',
        title: `💀 ${pet.name}`,
        description: 'Ha fallecido... Usa /chimu para adoptar una nueva.',
        color: '#374151'
      };
    }

    const state = this.getPetState(pet);
    const stateEmoji = this.getStateEmoji(state);

    const moodDescriptions = {
      HAPPY: 'Un palomito muy feliz',
      HUNGRY: 'Tiene mucha hambre...',
      SLEEPY: 'Está descansando',
      DIRTY: 'Necesita un baño urgente',
      SAD: 'Está triste y necesita atención',
      PLAYFUL: 'Lleno de energía y ganas de jugar!',
      SICK: 'Se siente muy mal, necesita cuidados',
      DEAD: 'Ha fallecido'
    };

    const moodColorHex = {
      HAPPY: '#22c55e',
      HUNGRY: '#f97316',
      SLEEPY: '#7c3aed',
      DIRTY: '#92400e',
      SAD: '#3b82f6',
      PLAYFUL: '#ec4899',
      SICK: '#dc2626',
      DEAD: '#374151'
    }[state] || '#22c55e';

    return {
      type: 'embed',
      title: `${stateEmoji} ${pet.name}`,
      description: moodDescriptions[state] || 'Un palomito',
      color: moodColorHex,
      thumbnail: `https://api.dicebear.com/7.x/avataaars/svg?seed=${pet.name}`,
      stats: [
        { label: '🍕 Hambre', value: pet.hunger },
        { label: '😊 Felicidad', value: pet.happiness },
        { label: '⚡ Energía', value: pet.is_sleeping ? -1 : pet.energy },
        { label: '🧼 Higiene', value: pet.hygiene },
        { label: '❤️ Salud', value: pet.health },
        { label: '🪙 Monedas', value: -2, text: `${pet.coins} monedas` },
      ],
      meta: `🎂 ${pet.age?.toFixed(1) || 0} días · 🎭 ${pet.personality}`,
      footer: '/chimu feed · play · pet · clean · sleep · wake'
    };
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
