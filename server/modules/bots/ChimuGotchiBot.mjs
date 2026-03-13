/**
 * ChimuGotchi Bot 🕊️
 * Tamagotchi-style virtual pet bot - Una paloma adorable llamada Chimuelo
 * 
 * Comandos:
 * /chimu - Ver estado de tu paloma
 * /chimu feed - Dar de comer
 * /chimu play - Jugar con Chimuelo  
 * /chimu pet - Acariciar
 * /chimu clean - Limpiar su casa
 * /chimu sleep - Dormir
 * /chimu wake - Despertar
 * /chimu name <nombre> - Cambiar nombre
 */

import { createClient } from '@supabase/supabase-js';

const CHIMU_STATES = {
  HAPPY: '🕊️',
  HUNGRY: '🥺',
  SLEEPY: '😴',
  DIRTY: '🤢',
  SAD: '😢',
  PLAYFUL: '🎾',
  SICK: '🤒',
  DEAD: '💀'
};

const CHIMU_PERSONALITIES = [
  'traviesa', 'cariñosa', 'perezosa', 'energética', 'glotona', 'limpiecita'
];

export class ChimuGotchiBot {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.tickRate = 60000; // 1 minuto
    this.startTicking();
  }

  async handleCommand(userId, communityId, command, args) {
    let chimu = await this.getOrCreateChimu(userId, communityId);
    
    switch (command) {
      case 'status':
      case undefined:
        return this.renderStatus(chimu);
      
      case 'feed':
        return await this.feedChimu(chimu);
      
      case 'play':
        return await this.playWithChimu(chimu);
      
      case 'pet':
        return await this.petChimu(chimu);
      
      case 'clean':
        return await this.cleanChimu(chimu);
      
      case 'sleep':
        return await this.sleepChimu(chimu);
      
      case 'wake':
        return await this.wakeChimu(chimu);
      
      case 'name':
        if (args.length === 0) return '❌ Uso: /chimu name <nuevo nombre>';
        return await this.renameChimu(chimu, args.join(' '));
      
      case 'gift':
        return await this.giftItem(userId, communityId, args[0], args[1]);
      
      case 'leaderboard':
        return await this.getLeaderboard(communityId);
      
      default:
        return '🕊️ **Chimuelo** no entiende ese comando. Prueba: `/chimu`, `/chimu feed`, `/chimu play`, `/chimu pet`, `/chimu clean`';
    }
  }

  async getOrCreateChimu(userId, communityId) {
    const { data, error } = await this.supabase
      .from('chimugotchi_pets')
      .select('*')
      .eq('owner_id', userId)
      .eq('community_id', communityId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (data) return data;

    // Create new Chimu
    const personality = CHIMU_PERSONALITIES[Math.floor(Math.random() * CHIMU_PERSONALITIES.length)];
    const { data: newChimu, error: createError } = await this.supabase
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
        age: 0,
        is_sleeping: false,
        is_alive: true,
        coins: 50
      })
      .select()
      .single();

    if (createError) throw createError;
    
    return newChimu;
  }

  renderStatus(chimu) {
    if (!chimu.is_alive) {
      return `💀 **${chimu.name}** ha volado al cielo de las palomas...\n_RIP ${chimu.name}_\n\nUsa \`/chimu\` para adoptar una nueva paloma.`;
    }

    const state = this.getChimuState(chimu);
    const emoji = CHIMU_STATES[state];
    const bars = {
      hunger: this.renderBar(chimu.hunger, 'hunger'),
      happiness: this.renderBar(chimu.happiness, 'happiness'),
      energy: this.renderBar(chimu.energy, 'energy'),
      hygiene: this.renderBar(chimu.hygiene, 'hygiene'),
      health: this.renderBar(chimu.health, 'health')
    };

    return {
      type: 'embed',
      title: `${emoji} ${chimu.name} el Palomito`,
      description: `*${this.getMoodDescription(state, chimu.personality)}*`,
      fields: [
        { name: '🍕 Hambre', value: bars.hunger, inline: true },
        { name: '😊 Felicidad', value: bars.happiness, inline: true },
        { name: '⚡ Energía', value: chimu.is_sleeping ? '😴 Durmiendo' : bars.energy, inline: true },
        { name: '🧼 Higiene', value: bars.hygiene, inline: true },
        { name: '❤️ Salud', value: bars.health, inline: true },
        { name: '🎂 Edad', value: `${chimu.age} días`, inline: true },
        { name: '🪙 Monedas', value: `${chimu.coins}`, inline: true },
        { name: '🎭 Personalidad', value: `${chimu.personality}`, inline: true }
      ],
      footer: `Comandos: /chimu feed | play | pet | clean | sleep | wake`,
      color: this.getMoodColor(state)
    };
  }

  renderBar(value, type) {
    const filled = Math.round(value / 10);
    const empty = 10 - filled;
    const emoji = type === 'hunger' ? '🍕' : type === 'happiness' ? '💖' : type === 'energy' ? '⚡' : type === 'hygiene' ? '🧼' : '❤️';
    return emoji.repeat(filled) + '⬜'.repeat(empty) + ` ${value}%`;
  }

  getChimuState(chimu) {
    if (!chimu.is_alive) return 'DEAD';
    if (chimu.health < 20) return 'SICK';
    if (chimu.is_sleeping) return 'SLEEPY';
    if (chimu.hygiene < 30) return 'DIRTY';
    if (chimu.hunger < 30) return 'HUNGRY';
    if (chimu.happiness > 80 && chimu.energy > 50) return 'PLAYFUL';
    if (chimu.happiness < 30) return 'SAD';
    return 'HAPPY';
  }

  getMoodDescription(state, personality) {
    const descriptions = {
      HAPPY: `Un palomito ${personality} muy feliz 🕊️`,
      HUNGRY: `Tiene hambre... ${personality} y glotona`,
      SLEEPY: `Está durmiendo como un angelito`,
      DIRTY: `Necesita un baño urgentemente!`,
      SAD: `Se siente solo... necesita cariño`,
      PLAYFUL: `Quiere jugar! Tan ${personality}!`,
      SICK: `Está enfermo! Necesita ayuda! 🚑`,
      DEAD: '...'
    };
    return descriptions[state];
  }

  getMoodColor(state) {
    const colors = {
      HAPPY: 0x00FF00,
      HUNGRY: 0xFFA500,
      SLEEPY: 0x9400D3,
      DIRTY: 0x8B4513,
      SAD: 0x4169E1,
      PLAYFUL: 0xFF69B4,
      SICK: 0xDC143C,
      DEAD: 0x000000
    };
    return colors[state];
  }

  async feedChimu(chimu) {
    if (!chimu.is_alive) return '💀 No puedes alimentar a una paloma que ya no está...';
    if (chimu.is_sleeping) return '😴 Shhh... está durmiendo!';
    if (chimu.hunger >= 95) return '🍕 Está llenita! No quiere más comida.';

    const foodBoost = Math.floor(Math.random() * 15) + 10;
    const newHunger = Math.min(100, chimu.hunger + foodBoost);
    const happinessBoost = 5;

    await this.updateChimu(chimu.id, {
      hunger: newHunger,
      happiness: Math.min(100, chimu.happiness + happinessBoost),
      coins: chimu.coins + 1
    });

    const foods = ['🌽 maíz', '🍞 pan', '🌾 semillas', '🍇 uvas', '🥜 cacahuates'];
    const food = foods[Math.floor(Math.random() * foods.length)];
    
    return `🕊️ **${chimu.name}** comió ${food} felizmente!\n🍕 +${foodBoost}% hambre | 😊 +${happinessBoost}% felicidad | 🪙 +1 moneda`;
  }

  async playWithChimu(chimu) {
    if (!chimu.is_alive) return '💀 ...';
    if (chimu.is_sleeping) return '😴 Está soñando con volar...';
    if (chimu.energy < 20) return '⚡ Está muy cansada para jugar. Dale de comer o deja que duerma.';

    const games = [
      { name: 'volar en círculos', energy: 15, happy: 20 },
      { name: 'picotear semillas', energy: 10, happy: 15 },
      { name: 'cazar palomitas de maíz', energy: 20, happy: 25 },
      { name: 'mirarse en el espejo', energy: 5, happy: 10 },
      { name: 'cantar palomadas', energy: 10, happy: 15 }
    ];

    const game = games[Math.floor(Math.random() * games.length)];

    await this.updateChimu(chimu.id, {
      energy: Math.max(0, chimu.energy - game.energy),
      happiness: Math.min(100, chimu.happiness + game.happy),
      hunger: Math.max(0, chimu.hunger - 10),
      coins: chimu.coins + 2
    });

    return `🕊️ **${chimu.name}** jugó ${game.name}!\n🎾 ¡Coo-coo-cooo! ⚡ -${game.energy}% energía | 😊 +${game.happy}% felicidad | 🍕 -10% hambre | 🪙 +2 monedas`;
  }

  async petChimu(chimu) {
    if (!chimu.is_alive) return '💀 ...';
    if (chimu.is_sleeping) return '😴 Ronronea en sueños...';

    const petResponses = [
      'Cierra los ojitos de felicidad 🥰',
      'Hace "coo-coo-cooo" 💕',
      'Se eriza las plumas de gusto',
      'Te mira con amor 🕊️',
      'Se posa en tu dedo'
    ];

    const response = petResponses[Math.floor(Math.random() * petResponses.length)];

    await this.updateChimu(chimu.id, {
      happiness: Math.min(100, chimu.happiness + 15),
      health: Math.min(100, chimu.health + 5)
    });

    return `🕊️ **${chimu.name}**: "${response}"\n😊 +15% felicidad | ❤️ +5% salud`;
  }

  async cleanChimu(chimu) {
    if (!chimu.is_alive) return '💀 ...';
    if (chimu.hygiene >= 90) return '🧼 Ya está limpiecita! Huele a jabón de paloma.';

    await this.updateChimu(chimu.id, {
      hygiene: 100,
      happiness: Math.min(100, chimu.happiness + 5),
      coins: chimu.coins + 1
    });

    return `🛁 Bañaste a **${chimu.name}**! Ahora brilla ✨\n🧼 100% higiene | 😊 +5% felicidad | 🪙 +1 moneda`;
  }

  async sleepChimu(chimu) {
    if (!chimu.is_alive) return '💀 ...';
    if (chimu.is_sleeping) return '😴 Ya está dormida! Qué tierna...';

    await this.updateChimu(chimu.id, {
      is_sleeping: true
    });

    return `🌙 **${chimu.name}** se fue a dormir a su palomar... Dulces sueños! 🕊️💤`;
  }

  async wakeChimu(chimu) {
    if (!chimu.is_alive) return '💀 ...';
    if (!chimu.is_sleeping) return '🕊️ Ya está despierta! Mira cócora.';

    const energyRecovered = Math.min(100, chimu.energy + 30);

    await this.updateChimu(chimu.id, {
      is_sleeping: false,
      energy: energyRecovered
    });

    return `☀️ **${chimu.name}** despertó! Coo-coo-cooo! 🕊️\n⚡ +${energyRecovered - chimu.energy}% energía recuperada`;
  }

  async renameChimu(chimu, newName) {
    if (!chimu.is_alive) return '💀 ...';
    if (newName.length > 20) return '❌ El nombre es muy largo (máx 20 caracteres)';
    if (newName.length < 2) return '❌ El nombre es muy corto';

    const oldName = chimu.name;
    await this.updateChimu(chimu.id, { name: newName });

    return `🕊️ **${oldName}** ahora se llama **${newName}**! Le gusta su nuevo nombre.`;
  }

  async updateChimu(id, updates) {
    const { error } = await this.supabase
      .from('chimugotchi_pets')
      .update({
        ...updates,
        last_interaction: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  // Decay system - Chimu needs care over time
  startTicking() {
    setInterval(async () => {
      try {
        const { data: chimus } = await this.supabase
          .from('chimugotchi_pets')
          .select('*')
          .eq('is_alive', true);

        for (const chimu of chimus || []) {
          if (chimu.is_sleeping) {
            // Recover while sleeping
            await this.updateChimu(chimu.id, {
              energy: Math.min(100, chimu.energy + 5),
              hunger: Math.max(0, chimu.hunger - 2)
            });
          } else {
            // Normal decay
            const newHunger = Math.max(0, chimu.hunger - 3);
            const newEnergy = Math.max(0, chimu.energy - 2);
            const newHygiene = Math.max(0, chimu.hygiene - 2);
            let newHealth = chimu.health;

            // Health drops if other stats are low
            if (newHunger < 20 || newHygiene < 20 || newEnergy < 10) {
              newHealth = Math.max(0, newHealth - 5);
            }

            // Die if health reaches 0
            const isAlive = newHealth > 0;

            await this.updateChimu(chimu.id, {
              hunger: newHunger,
              energy: newEnergy,
              hygiene: newHygiene,
              health: newHealth,
              is_alive: isAlive,
              age: chimu.age + (1/1440) // Age in days (1 min = 1/1440 day)
            });
          }
        }
      } catch (err) {
        console.error('[ChimuGotchi] Tick error:', err);
      }
    }, this.tickRate);
  }

  async getLeaderboard(communityId) {
    const { data, error } = await this.supabase
      .from('chimugotchi_pets')
      .select('*, owner:profiles(username, avatar_url)')
      .eq('community_id', communityId)
      .eq('is_alive', true)
      .order('age', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      return '🕊️ Aún no hay palomitas en esta comunidad. Sé el primero con `/chimu`!';
    }

    const leaderboard = data.map((chimu, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
      return `${medal} **${chimu.name}** de @${chimu.owner?.username} - ${chimu.age.toFixed(1)} días ${CHIMU_STATES[this.getChimuState(chimu)]}`;
    }).join('\n');

    return {
      type: 'embed',
      title: '🕊️ Palomar Leaderboard',
      description: leaderboard,
      footer: '¡Cuánto más viva tu paloma, más alta en el ranking!',
      color: 0xFFD700
    };
  }
}

export default ChimuGotchiBot;
