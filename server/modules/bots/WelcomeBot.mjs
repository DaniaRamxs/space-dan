/**
 * WelcomeBot 🤖
 * Bot de bienvenida tipo Discord con embeds personalizables
 * 
 * Features:
 * - Mensajes de bienvenida personalizables
 * - Embed estilo Discord con colores, imágenes, campos
 * - Auto-rol opcional
 * - Mensaje privado de bienvenida
 * - Despedidas cuando alguien se va
 * - Contador de miembros
 */

import { createClient } from '@supabase/supabase-js';

const DEFAULT_WELCOME_MESSAGES = [
  "¡Bienvenido a {server}! 🎉",
  "¡{user} acaba de aterrizar! 🚀",
  "¡Mira quién llegó! Es {user} ✨",
  "¡{user} se unió a la fiesta! 🎊",
  "Dale la bienvenida a {user} 👋"
];

const DEFAULT_GOODBYE_MESSAGES = [
  "{user} se fue volando... 🕊️",
  "{user} ha abandonado el servidor 👋",
  "Hasta luego, {user} 👋",
  "{user} se marchó... 🚶"
];

export class WelcomeBot {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Genera un embed de bienvenida estilo Discord
   */
  async generateWelcomeEmbed(user, community, settings = {}) {
    const {
      customMessage,
      showAvatar = true,
      showMemberCount = true,
      showRules = false,
      accentColor = '#5865F2',
      thumbnailUrl,
      imageUrl,
      footerText,
      pingUser = false,
      autoRoleId = null,
      dmWelcome = false
    } = settings;

    // Get member count
    let memberCount = '?';
    if (showMemberCount) {
      const { count } = await this.supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', community.id);
      memberCount = count || 1;
    }

    // Select welcome message
    let welcomeText = customMessage;
    if (!welcomeText) {
      welcomeText = DEFAULT_WELCOME_MESSAGES[
        Math.floor(Math.random() * DEFAULT_WELCOME_MESSAGES.length)
      ];
    }
    welcomeText = welcomeText
      .replace(/{user}/g, `<@${user.id}>`)
      .replace(/{username}/g, user.username)
      .replace(/{server}/g, community.name)
      .replace(/{memberCount}/g, memberCount);

    // Build embed
    const embed = {
      type: 'embed',
      title: `👋 ¡Bienvenido a ${community.name}!`,
      description: welcomeText,
      color: parseInt(accentColor.replace('#', ''), 16),
      thumbnail: showAvatar ? {
        url: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
      } : undefined,
      image: imageUrl ? { url: imageUrl } : undefined,
      fields: [],
      timestamp: new Date().toISOString(),
      footer: footerText ? {
        text: footerText.replace(/{memberCount}/g, memberCount)
      } : {
        text: `Miembro #${memberCount}`
      }
    };

    // Add fields based on settings
    if (showRules) {
      embed.fields.push({
        name: '📜 Reglas Importantes',
        value: '1. Sé respetuoso\n2. No spam\n3. Diviértete 🎉',
        inline: false
      });
    }

    if (community.description) {
      embed.fields.push({
        name: 'ℹ️ Sobre nosotros',
        value: community.description.substring(0, 100) + '...',
        inline: false
      });
    }

    // Add fun stats
    embed.fields.push({
      name: '📊 En este servidor',
      value: `Somos **${memberCount}** miembros\nÚnete a la conversación!`,
      inline: true
    });

    // Add quick links if available
    if (community.invite_code) {
      embed.fields.push({
        name: '🔗 Links',
        value: `[Invitar amigos](${window.location.origin}/c/${community.slug})`,
        inline: true
      });
    }

    // Generate plain text version for non-embed channels
    const plainText = `${pingUser ? `<@${user.id}> ` : ''}${welcomeText}\n\n📜 Lee las reglas y presentate en #general!`;

    return {
      embed,
      plainText,
      shouldPing: pingUser,
      autoRoleId,
      dmWelcome
    };
  }

  /**
   * Genera un embed de despedida
   */
  async generateGoodbyeEmbed(user, community, settings = {}) {
    const {
      customMessage,
      showMemberCount = true,
      accentColor = '#ED4245',
      showDuration = true
    } = settings;

    let memberCount = '?';
    if (showMemberCount) {
      const { count } = await this.supabase
        .from('community_members')
        .select('*', { count: 'exact', head: true })
        .eq('community_id', community.id);
      memberCount = count || 0;
    }

    let goodbyeText = customMessage;
    if (!goodbyeText) {
      goodbyeText = DEFAULT_GOODBYE_MESSAGES[
        Math.floor(Math.random() * DEFAULT_GOODBYE_MESSAGES.length)
      ];
    }
    goodbyeText = goodbyeText
      .replace(/{user}/g, user.username)
      .replace(/{server}/g, community.name)
      .replace(/{memberCount}/g, memberCount);

    // Calculate membership duration if available
    let durationText = '';
    if (showDuration) {
      const { data: membership } = await this.supabase
        .from('community_members')
        .select('joined_at')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .single();

      if (membership?.joined_at) {
        const days = Math.floor((Date.now() - new Date(membership.joined_at)) / (1000 * 60 * 60 * 24));
        durationText = days > 0 ? `Estuvo con nosotros por ${days} días` : 'Esto fue breve...';
      }
    }

    const embed = {
      type: 'embed',
      title: '👋 Hasta luego',
      description: goodbyeText,
      color: parseInt(accentColor.replace('#', ''), 16),
      thumbnail: {
        url: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
      },
      fields: durationText ? [{
        name: '⏱️ Tiempo en el servidor',
        value: durationText,
        inline: false
      }] : [],
      timestamp: new Date().toISOString(),
      footer: {
        text: `Ahora somos ${memberCount} miembros`
      }
    };

    return { embed };
  }

  /**
   * Mensaje privado de bienvenida
   */
  generateDMWelcome(user, community) {
    return {
      type: 'embed',
      title: `👋 ¡Bienvenido a ${community.name}!`,
      description: `Hola **${user.username}**! 🎉\n\nGracias por unirte a **${community.name}**. Aquí tienes algunos tips para empezar:\n\n📜 **Lee las reglas** en el canal #reglas\n💬 **Preséntate** en #general\n🎭 **Explora los canales** disponibles\n\n¡Esperamos que disfrutes tu estancia!`,
      color: 0x5865F2,
      fields: [
        {
          name: '🚀 Primeros pasos',
          value: '1. Personaliza tu perfil\n2. Únete a la conversación\n3. Haz nuevos amigos',
          inline: false
        }
      ],
      thumbnail: {
        url: community.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${community.slug}`
      }
    };
  }

  /**
   * Tarjeta de presentación interactiva
   */
  generateIntroductionCard(user, community) {
    return {
      type: 'embed',
      title: '🎴 Tarjeta de Presentación',
      description: `¡Conoce a nuestro nuevo miembro!`,
      color: 0x00D4AA,
      author: {
        name: user.username,
        icon_url: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
      },
      fields: [
        {
          name: '📅 Se unió',
          value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
          inline: true
        },
        {
          name: '🏆 Reputación',
          value: `${user.reputation?.points || 0} puntos`,
          inline: true
        },
        {
          name: '🎭 Roles',
          value: 'Miembro nuevo',
          inline: true
        }
      ],
      image: {
        url: `https://api.dicebear.com/7.x/glass/svg?seed=${user.id}` // Decorative banner
      },
      footer: {
        text: `Dale la bienvenida en #general!`
      }
    };
  }

  /**
   * Sistema de niveles de bienvenida
   */
  getWelcomeTier(memberCount) {
    const tiers = [
      { count: 1, message: '🎉 ¡Primer miembro! Estás haciendo historia.', badge: '⭐' },
      { count: 10, message: '🔥 Ya somos 10, vamos creciendo!', badge: '🚀' },
      { count: 50, message: '🎊 ¡50 miembros! Esto es una fiesta.', badge: '🎈' },
      { count: 100, message: '💯 ¡100 miembros! Oficialmente populares.', badge: '💎' },
      { count: 500, message: '🌟 ¡500 miembros! Somos una comunidad increíble.', badge: '🏆' },
      { count: 1000, message: '🎆 ¡1000 MIEMBROS! ÉPICO!', badge: '👑' },
      { count: 5000, message: '🚀 ¡5000! Esto es una locura!', badge: '🌌' },
      { count: 10000, message: '👑 ¡10K MIEMBROS! LEYENDA!', badge: '⚡' }
    ];

    for (let i = tiers.length - 1; i >= 0; i--) {
      if (memberCount >= tiers[i].count) {
        return tiers[i];
      }
    }
    return tiers[0];
  }

  /**
   * Formato compacto para móvil
   */
  generateCompactWelcome(user, community) {
    return `👋 **${user.username}** se unió a ${community.name}!`;
  }

  /**
   * Guardar configuración del bot
   */
  async saveSettings(communityId, settings) {
    const { error } = await this.supabase
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
    return true;
  }

  /**
   * Obtener configuración
   */
  async getSettings(communityId) {
    const { data, error } = await this.supabase
      .from('community_bot_settings')
      .select('settings')
      .eq('community_id', communityId)
      .eq('bot_type', 'welcome')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    return data?.settings || {
      customMessage: null,
      showAvatar: true,
      showMemberCount: true,
      showRules: true,
      accentColor: '#5865F2',
      pingUser: false,
      autoRoleId: null,
      dmWelcome: true,
      enableGoodbye: true,
      goodbyeMessage: null,
      goodbyeColor: '#ED4245'
    };
  }
}

export default WelcomeBot;
