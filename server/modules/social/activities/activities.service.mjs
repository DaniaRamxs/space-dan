/**
 * Activities Service
 * Handles business logic for live activity operations
 */

import { supabase, supabaseAdmin } from '../../../supabaseClient.mjs';

export const activitiesService = {
  /**
   * Create a new activity
   */
  async createActivity({ type, title, communityId, hostId, roomName, metadata }) {
    const { data, error } = await supabaseAdmin
      .from('activities')
      .insert([{
        type,
        title,
        community_id: communityId || null,
        host_id: hostId,
        room_name: roomName,
        metadata: metadata || {},
        status: 'active',
        participant_count: 0,
        spectator_count: 0,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get activity by ID
   */
  async getActivityById(id) {
    const { data, error } = await supabase
      .from('activities')
      .select('*, host:profiles!host_id(id, username, avatar_url), community:communities(id, name, slug)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get trending activities
   * Sorted by engagement score: participants * 2 + spectators + duration_minutes
   */
  async getTrendingActivities({ limit = 20, type = null }) {
    let query = supabase
      .from('activities')
      .select('*, host:profiles!host_id(id, username, avatar_url), community:communities(id, name, slug)')
      .eq('status', 'active')
      .order('participant_count', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Calculate engagement score
    return data.map(activity => {
      const durationMinutes = Math.floor((Date.now() - new Date(activity.created_at).getTime()) / 60000);
      const score = (activity.participant_count * 2) + activity.spectator_count + Math.min(durationMinutes, 60);
      return { ...activity, engagementScore: score };
    }).sort((a, b) => b.engagementScore - a.engagementScore);
  },

  /**
   * Get activities by community
   */
  async getCommunitiesActivities(communityId, { limit = 10, status = 'active' }) {
    const { data, error } = await supabase
      .from('activities')
      .select('*, host:profiles!host_id(id, username, avatar_url)')
      .eq('community_id', communityId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Update activity participant count
   */
  async updateParticipantCount(activityId, count) {
    const { error } = await supabaseAdmin
      .from('activities')
      .update({ participant_count: count })
      .eq('id', activityId);

    if (error) console.warn('[Activities] Failed to update participant count:', error);
  },

  /**
   * Update activity spectator count
   */
  async updateSpectatorCount(activityId, count) {
    const { error } = await supabaseAdmin
      .from('activities')
      .update({ spectator_count: count })
      .eq('id', activityId);

    if (error) console.warn('[Activities] Failed to update spectator count:', error);
  },

  /**
   * End activity
   */
  async endActivity(activityId) {
    const { error } = await supabaseAdmin
      .from('activities')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', activityId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Get user's current activity
   */
  async getUserCurrentActivity(userId) {
    const { data, error } = await supabase
      .from('activity_participants')
      .select('activity:activities(*, host:profiles!host_id(id, username, avatar_url), community:communities(id, name, slug))')
      .eq('user_id', userId)
      .eq('left_at', null)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.activity || null;
  },

  /**
   * Join activity
   */
  async joinActivity(activityId, userId, isSpectator = false) {
    // Check if already in activity
    const { data: existing } = await supabase
      .from('activity_participants')
      .select('id')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .eq('left_at', null)
      .single();

    if (existing) {
      return { alreadyJoined: true };
    }

    // Add participant
    const { error } = await supabaseAdmin
      .from('activity_participants')
      .insert([{
        activity_id: activityId,
        user_id: userId,
        is_spectator: isSpectator,
        joined_at: new Date().toISOString()
      }]);

    if (error) throw error;

    // Increment count
    if (isSpectator) {
      await supabase.rpc('increment_activity_spectators', { activity_id: activityId });
    } else {
      await supabase.rpc('increment_activity_participants', { activity_id: activityId });
    }

    return { success: true };
  },

  /**
   * Leave activity
   */
  async leaveActivity(activityId, userId) {
    const { data: participant } = await supabase
      .from('activity_participants')
      .select('is_spectator')
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .eq('left_at', null)
      .single();

    if (!participant) return { notInActivity: true };

    // Mark as left
    const { error } = await supabaseAdmin
      .from('activity_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('activity_id', activityId)
      .eq('user_id', userId)
      .eq('left_at', null);

    if (error) throw error;

    // Decrement count
    if (participant.is_spectator) {
      await supabase.rpc('decrement_activity_spectators', { activity_id: activityId });
    } else {
      await supabase.rpc('decrement_activity_participants', { activity_id: activityId });
    }

    return { success: true };
  }
};
