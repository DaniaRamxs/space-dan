/**
 * Bot command service
 * Detecta y ejecuta comandos de bot como /chimu
 */

import { supabase } from '../supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://spacely-server-production.up.railway.app';

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

      if (botName === 'poll') {
        const rawText = content.trim().slice('/poll'.length).trim();
        return await this.executePollCommand(rawText, communityId, userId);
      }
      if (botName === 'announce') {
        const rawText = content.trim().slice('/announce'.length).trim();
        return await this.executeAnnounceCommand(rawText, communityId, userId);
      }
      if (botName === 'rules') {
        return await this.executeRulesCommand(command, args, communityId, userId);
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
      return { isBotCommand: true, result: { type: 'embed', title: '❌ Error', description: 'Error al verificar permisos', color: '#f97316' } };
    }

    const isOwner = community?.creator_id === userId;

    if (!isOwner) {
      return {
        isBotCommand: true,
        result: { type: 'embed', title: '❌ Sin permisos', description: 'Solo el owner de la comunidad puede configurar el WelcomeBot', color: '#f97316' }
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
        const fields = [
          { name: '💬 Mensaje', value: msg, inline: false },
          { name: '🎨 Color', value: color, inline: true },
          { name: '📣 Ping', value: ping, inline: true },
          { name: '📜 Reglas', value: rules, inline: true },
          { name: '👋 Despedidas', value: goodbye, inline: true },
        ];
        if (currentSettings.imageUrl) {
          fields.push({ name: '🖼️ Imagen', value: currentSettings.imageUrl, inline: false });
        }
        if (currentSettings.footerText) {
          fields.push({ name: '📝 Footer', value: currentSettings.footerText, inline: false });
        }
        fields.push({ name: '✏️ Comandos', value: '`/welcome message` `/welcome color` `/welcome ping` `/welcome rules` `/welcome goodbye` `/welcome image` `/welcome footer` `/welcome test`', inline: false });
        return {
          isBotCommand: true,
          result: {
            type: 'embed',
            title: '🤖 WelcomeBot — Configuración actual',
            description: 'Variables disponibles: `{user}` `{username}` `{server}` `{memberCount}`',
            color: '#5865F2',
            fields,
          }
        };
      }

      case 'message': {
        const message = args.join(' ');
        if (!message) {
          return { isBotCommand: true, result: { type: 'embed', title: '❌ Uso incorrecto', description: 'Uso: /welcome message <tu mensaje>', color: '#f97316' } };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, customMessage: message });
        return { isBotCommand: true, result: { type: 'embed', title: '✅ Mensaje actualizado', description: `"${message}"`, color: '#22c55e' } };
      }

      case 'color': {
        const color = args[0];
        if (!color || !color.match(/^#[0-9A-Fa-f]{6}$/)) {
          return { isBotCommand: true, result: { type: 'embed', title: '❌ Uso incorrecto', description: 'Uso: /welcome color #RRGGBB (ej: #5865F2)', color: '#f97316' } };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, accentColor: color });
        return { isBotCommand: true, result: { type: 'embed', title: '✅ Color actualizado', description: `Color cambiado a ${color}`, color } };
      }

      case 'ping': {
        const val = args[0]?.toLowerCase();
        if (val !== 'on' && val !== 'off') {
          return { isBotCommand: true, result: { type: 'embed', title: '❌ Uso incorrecto', description: 'Uso: /welcome ping on|off', color: '#f97316' } };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, pingUser: val === 'on' });
        return { isBotCommand: true, result: { type: 'embed', title: '✅ Ping actualizado', description: `Ping al usuario: ${val === 'on' ? 'activado' : 'desactivado'}`, color: '#22c55e' } };
      }

      case 'rules': {
        const val = args[0]?.toLowerCase();
        if (val !== 'on' && val !== 'off') {
          return { isBotCommand: true, result: { type: 'embed', title: '❌ Uso incorrecto', description: 'Uso: /welcome rules on|off', color: '#f97316' } };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, showRules: val === 'on' });
        return { isBotCommand: true, result: { type: 'embed', title: '✅ Reglas actualizadas', description: `Reglas en bienvenida: ${val === 'on' ? 'activadas' : 'desactivadas'}`, color: '#22c55e' } };
      }

      case 'goodbye': {
        const val = args[0]?.toLowerCase();
        if (val !== 'on' && val !== 'off') {
          return { isBotCommand: true, result: { type: 'embed', title: '❌ Uso incorrecto', description: 'Uso: /welcome goodbye on|off', color: '#f97316' } };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, enableGoodbye: val === 'on' });
        return { isBotCommand: true, result: { type: 'embed', title: '✅ Despedidas actualizadas', description: `Despedidas: ${val === 'on' ? 'activadas' : 'desactivadas'}`, color: '#22c55e' } };
      }

      case 'image': {
        const imageUrl = args[0];
        if (!imageUrl || !imageUrl.startsWith('http')) {
          return { isBotCommand: true, result: { type: 'embed', title: '❌ URL inválida', description: 'Uso: /welcome image <url> (debe empezar con http)', color: '#f97316' } };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, imageUrl });
        return { isBotCommand: true, result: { type: 'embed', title: '✅ Imagen actualizada', description: `Imagen configurada correctamente`, color: '#22c55e' } };
      }

      case 'footer': {
        const footerText = args.join(' ');
        if (!footerText) {
          return { isBotCommand: true, result: { type: 'embed', title: '❌ Uso incorrecto', description: 'Uso: /welcome footer <texto>', color: '#f97316' } };
        }
        await this.saveWelcomeSettings(communityId, { ...currentSettings, footerText });
        return { isBotCommand: true, result: { type: 'embed', title: '✅ Footer actualizado', description: `"${footerText}"`, color: '#22c55e' } };
      }

      case 'test': {
        const welcomeMsg = currentSettings.customMessage || '¡{user} acaba de aterrizar! 🚀';
        const preview = welcomeMsg
          .replace(/{user}/g, `@${profile?.username || 'tú'}`)
          .replace(/{username}/g, profile?.username || 'tú')
          .replace(/{server}/g, 'este servidor')
          .replace(/{memberCount}/g, '?');
        const fields = [];
        if (currentSettings.showRules) {
          fields.push({ name: '📜 Reglas', value: '• Sé respetuoso\n• No spam\n• ¡Diviértete!', inline: false });
        }
        return {
          isBotCommand: true,
          result: {
            type: 'embed',
            title: '👋 Vista previa — Mensaje de bienvenida',
            description: preview,
            color: currentSettings.accentColor || '#5865F2',
            fields,
            footer: currentSettings.footerText || undefined,
          }
        };
      }

      case 'help':
      default:
        return {
          isBotCommand: true,
          result: {
            type: 'embed',
            title: '🤖 WelcomeBot — Comandos',
            description: 'Configura los mensajes de bienvenida de tu comunidad',
            color: '#5865F2',
            fields: [
              { name: '/welcome setup', value: 'Ver configuración actual', inline: true },
              { name: '/welcome message <texto>', value: 'Cambiar mensaje', inline: true },
              { name: '/welcome color #RRGGBB', value: 'Cambiar color', inline: true },
              { name: '/welcome ping on|off', value: 'Mencionar al nuevo miembro', inline: true },
              { name: '/welcome rules on|off', value: 'Mostrar reglas en bienvenida', inline: true },
              { name: '/welcome goodbye on|off', value: 'Mensajes de despedida', inline: true },
              { name: '/welcome image <url>', value: 'Imagen de bienvenida', inline: true },
              { name: '/welcome footer <texto>', value: 'Texto del footer', inline: true },
              { name: '/welcome test', value: 'Previa del mensaje', inline: true },
            ],
            footer: 'Variables: {user}, {username}, {server}, {memberCount}',
          }
        };
    }
  },

  /**
   * Ejecuta comando de PollBot
   */
  async executePollCommand(rawText, communityId, userId) {
    const parts = rawText.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length < 3) {
      return {
        isBotCommand: true,
        botName: 'PollBot 📊',
        result: {
          type: 'embed',
          title: '❌ Formato incorrecto',
          description: 'Uso: `/poll ¿Pregunta? | Opción 1 | Opción 2 | ...`\nSe requiere al menos 2 opciones.',
          color: '#f97316',
        }
      };
    }

    const question = parts[0];
    const options = parts.slice(1, 11); // máx 10 opciones
    const letters = ['🇦','🇧','🇨','🇩','🇪','🇫','🇬','🇭','🇮','🇯'];

    return {
      isBotCommand: true,
      botName: 'PollBot 📊',
      result: {
        type: 'embed',
        title: `📊 ${question}`,
        description: 'Vota con /vote A, /vote B...',
        color: '#6366f1',
        fields: options.map((opt, i) => ({
          name: `${letters[i]} ${opt}`,
          value: '0 votos',
          inline: true
        })),
        footer: `Encuesta · ${options.length} opciones`
      }
    };
  },

  /**
   * Ejecuta comando de AnnounceBot
   */
  async executeAnnounceCommand(text, communityId, userId) {
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('creator_id, name')
      .eq('id', communityId)
      .single();

    if (communityError) {
      return {
        isBotCommand: true,
        botName: 'AnnounceBot 📢',
        result: { type: 'embed', title: '❌ Error', description: 'No se pudo verificar permisos', color: '#f97316' }
      };
    }

    if (community.creator_id !== userId) {
      return {
        isBotCommand: true,
        botName: 'AnnounceBot 📢',
        result: { type: 'embed', title: '❌ Sin permisos', description: 'Solo el owner puede hacer anuncios oficiales', color: '#f97316' }
      };
    }

    if (!text) {
      return {
        isBotCommand: true,
        botName: 'AnnounceBot 📢',
        result: {
          type: 'embed',
          title: '📢 AnnounceBot — Ayuda',
          description: 'Uso: `/announce <texto del anuncio>`',
          color: '#f59e0b',
          footer: `Solo el owner de ${community.name} puede usar este comando`
        }
      };
    }

    return {
      isBotCommand: true,
      botName: 'AnnounceBot 📢',
      result: {
        type: 'embed',
        title: `📢 Anuncio — ${community.name}`,
        description: text,
        color: '#f59e0b',
        footer: `Anuncio oficial · ${community.name}`
      }
    };
  },

  /**
   * Ejecuta comando de RulesBot
   */
  async executeRulesCommand(command, args, communityId, userId) {
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('creator_id, name')
      .eq('id', communityId)
      .single();

    if (communityError) {
      return {
        isBotCommand: true,
        botName: 'RulesBot 📜',
        result: { type: 'embed', title: '❌ Error', description: 'No se pudo acceder a los datos de la comunidad', color: '#f97316' }
      };
    }

    if (command === 'set') {
      if (community.creator_id !== userId) {
        return {
          isBotCommand: true,
          botName: 'RulesBot 📜',
          result: { type: 'embed', title: '❌ Sin permisos', description: 'Solo el owner puede configurar las reglas', color: '#f97316' }
        };
      }
      const rulesText = args.join(' ');
      if (!rulesText) {
        return {
          isBotCommand: true,
          botName: 'RulesBot 📜',
          result: { type: 'embed', title: '❌ Uso incorrecto', description: 'Uso: `/rules set <reglas separadas por \\n>`', color: '#f97316' }
        };
      }
      await this.saveRulesSettings(communityId, { rules: rulesText });
      return {
        isBotCommand: true,
        botName: 'RulesBot 📜',
        result: { type: 'embed', title: '✅ Reglas actualizadas', description: 'Las reglas de la comunidad han sido guardadas', color: '#22c55e' }
      };
    }

    // Mostrar reglas (default)
    const settings = await this.getRulesSettings(communityId);

    if (!settings?.rules) {
      return {
        isBotCommand: true,
        botName: 'RulesBot 📜',
        result: {
          type: 'embed',
          title: `📜 Reglas — ${community.name}`,
          description: 'Esta comunidad aún no tiene reglas configuradas.\nUsa `/rules set <reglas>` para establecerlas.',
          color: '#6366f1',
        }
      };
    }

    const lines = settings.rules.split('\n').filter(Boolean);
    let fields;
    let description;
    if (lines.length > 1) {
      fields = lines.map((line, i) => ({
        name: `${i + 1}.`,
        value: line,
        inline: false
      }));
      description = undefined;
    } else {
      description = settings.rules;
      fields = undefined;
    }

    return {
      isBotCommand: true,
      botName: 'RulesBot 📜',
      result: {
        type: 'embed',
        title: `📜 Reglas — ${community.name}`,
        description,
        color: '#6366f1',
        fields,
        footer: `${community.name} · Reglas de la comunidad`
      }
    };
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
  },

  async saveRulesSettings(communityId, settings) {
    const { error } = await supabase
      .from('community_bot_settings')
      .upsert({
        community_id: communityId,
        bot_type: 'moderation',
        settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'community_id,bot_type' });
    if (error) throw error;
  },

  async getRulesSettings(communityId) {
    const { data } = await supabase
      .from('community_bot_settings')
      .select('settings')
      .eq('community_id', communityId)
      .eq('bot_type', 'moderation')
      .single();
    return data?.settings || null;
  },
};

export default botCommandService;
