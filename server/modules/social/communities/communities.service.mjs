/**
 * Communities Service
 * Handles business logic for community operations
 */

import { supabase, supabaseAdmin, createClientForUser } from '../../../supabaseClient.mjs';
import WelcomeBot from '../../bots/WelcomeBot.mjs';

const welcomeBot = new WelcomeBot(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const communitiesService = {
  /**
   * Create a new community
   */
  async createCommunity({ name, slug, description, category, creatorId, avatar, banner, token }) {
    console.log('[CommunitiesService] Creating community with:', {
      name,
      slug,
      category: category || 'general',
      creatorId,
      hasCreatorId: !!creatorId,
      hasToken: !!token
    });

    const insertData = {
      name,
      slug,
      description,
      category: category || 'general',
      creator_id: creatorId,
      avatar_url: avatar || null,
      banner_url: banner || null,
      member_count: 1,
      created_at: new Date().toISOString()
    };

    console.log('[CommunitiesService] Insert data:', insertData);

    const client = token ? createClientForUser(token) : supabaseAdmin;
    const { data, error } = await client
      .from('communities')
      .insert([insertData])
      .select('*')
      .single();

    if (error) {
      console.error('[CommunitiesService] Supabase insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('[CommunitiesService] Community created:', data.id);

    // Auto-join creator as first member and set as owner
    await this.joinCommunity(data.id, creatorId, token, 'owner', true);

    return data;
  },

  /**
   * Get all communities (with pagination)
   */
  async getCommunities({ limit = 20, offset = 0, category = null, search = null }) {
    let query = supabase
      .from('communities')
      .select('*, creator:profiles!creator_id(id, username, avatar_url)')
      .order('member_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data;
  },

  /**
   * Get community by slug
   */
  async getCommunityBySlug(slug) {
    const { data, error } = await supabase
      .from('communities')
      .select('*, creator:profiles!creator_id(id, username, avatar_url)')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get community by ID
   */
  async getCommunityById(id) {
    const { data, error } = await supabase
      .from('communities')
      .select('*, creator:profiles!creator_id(id, username, avatar_url)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Join a community
   */
  async joinCommunity(communityId, userId, token, role = 'member', isCreator = false) {
    // Check if already a member
    const { data: existing } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return { alreadyMember: true };
    }

    // Add member
    const client = token ? createClientForUser(token) : supabaseAdmin;
    const { error: memberError } = await client
      .from('community_members')
      .insert([{
        community_id: communityId,
        user_id: userId,
        role: role,
        joined_at: new Date().toISOString()
      }]);

    if (memberError) throw memberError;

    // Solo incrementar si NO es la creación inicial (para evitar doble conteo)
    if (!isCreator) {
      const { error: updateError } = await supabase.rpc('increment_community_members', {
        community_id: communityId
      });

      if (updateError) console.warn('[Communities] Failed to increment member count:', updateError);

      // Disparar WelcomeBot en background (fire-and-forget)
      this._sendWelcomeMessage(communityId, userId).catch(err =>
        console.error('[Communities] WelcomeBot error:', err)
      );
    }

    return { success: true };
  },

  /**
   * Leave a community
   */
  async leaveCommunity(communityId, userId, token) {
    const client = token ? createClientForUser(token) : supabaseAdmin;
    const { error: deleteError } = await client
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Decrement member count
    const { error: updateError } = await supabase.rpc('decrement_community_members', {
      community_id: communityId
    });

    if (updateError) console.warn('[Communities] Failed to decrement member count:', updateError);

    return { success: true };
  },

  /**
   * Get community members with activity stats
   */
  async getCommunityMembers(communityId, { limit = 50, offset = 0 }) {
    const { data, error } = await supabase
      .from('community_members')
      .select('user:profiles!user_id(id, username, avatar_url, level, message_count, chat_level)')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data.map(m => m.user);
  },

  /**
   * Envía el mensaje de bienvenida en el canal adecuado (fire-and-forget)
   */
  async _sendWelcomeMessage(communityId, userId) {
    // Obtener datos en paralelo
    const [communityRes, userRes, settingsRes, channelRes] = await Promise.all([
      supabase.from('communities').select('*').eq('id', communityId).single(),
      supabase.from('profiles').select('*').eq('id', userId).single(),
      welcomeBot.getSettings(communityId),
      supabase
        .from('channels')
        .select('id')
        .eq('community_id', communityId)
        .eq('type', 'text')
        .order('position', { ascending: true })
        .limit(1)
        .single()
    ]);

    if (communityRes.error || userRes.error || channelRes.error) return;

    const community = communityRes.data;
    const user = userRes.data;
    const settings = settingsRes;
    const channel = channelRes.data;

    const { plainText } = await welcomeBot.generateWelcomeEmbed(user, community, settings);

    await supabaseAdmin.from('channel_messages').insert({
      channel_id: channel.id,
      user_id: userId,
      content: plainText,
      is_bot: true,
      bot_name: 'WelcomeBot 👋',
    });
  },

  /**
   * Check if user is member
   */
  async isMember(communityId, userId) {
    const { data, error } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', userId)
      .single();

    return !!data;
  }
};
