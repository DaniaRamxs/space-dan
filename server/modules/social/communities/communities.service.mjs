/**
 * Communities Service
 * Handles business logic for community operations
 */

import { supabase } from '../../../supabaseClient.mjs';

export const communitiesService = {
  /**
   * Create a new community
   */
  async createCommunity({ name, slug, description, category, creatorId, avatar, banner }) {
    const { data, error } = await supabase
      .from('communities')
      .insert([{
        name,
        slug,
        description,
        category: category || 'general',
        creator_id: creatorId,
        avatar_url: avatar || null,
        banner_url: banner || null,
        member_count: 1,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) throw error;

    // Auto-join creator as first member
    await this.joinCommunity(data.id, creatorId);

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
  async joinCommunity(communityId, userId) {
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
    const { error: memberError } = await supabase
      .from('community_members')
      .insert([{
        community_id: communityId,
        user_id: userId,
        joined_at: new Date().toISOString()
      }]);

    if (memberError) throw memberError;

    // Increment member count
    const { error: updateError } = await supabase.rpc('increment_community_members', {
      community_id: communityId
    });

    if (updateError) console.warn('[Communities] Failed to increment member count:', updateError);

    return { success: true };
  },

  /**
   * Leave a community
   */
  async leaveCommunity(communityId, userId) {
    const { error: deleteError } = await supabase
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
   * Get community members
   */
  async getCommunityMembers(communityId, { limit = 50, offset = 0 }) {
    const { data, error } = await supabase
      .from('community_members')
      .select('user:profiles!user_id(id, username, avatar_url, level)')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data.map(m => m.user);
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
