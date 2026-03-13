/**
 * Communities Service
 * Client-side service for community operations
 */

import { supabase } from '../supabaseClient';

// Use dynamic URL from env (Railway production)
const API_URL = import.meta.env.VITE_API_URL || 'https://spacely-server-production.up.railway.app';

// Helper to get auth headers
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
  };
}

export const communitiesService = {
  /**
   * Create a new community
   */
  async createCommunity({ name, slug, description, category, avatar, banner }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/communities`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ name, slug, description, category, avatar, banner })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create community');
    }

    return response.json();
  },

  /**
   * Get all communities
   */
  async getCommunities({ limit = 20, offset = 0, category = null, search = null } = {}) {
    const params = new URLSearchParams({ limit, offset });
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/communities?${params}`, {
      headers,
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch communities');
    return response.json();
  },

  /**
   * Get community by slug
   */
  async getCommunityBySlug(slug) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/communities/${slug}`, {
      headers,
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch community');
    return response.json();
  },

  /**
   * Join a community
   */
  async joinCommunity(communityId) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/communities/${communityId}/join`, {
      method: 'POST',
      headers,
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to join community');
    return response.json();
  },

  /**
   * Leave a community
   */
  async leaveCommunity(communityId) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/communities/${communityId}/leave`, {
      method: 'POST',
      headers,
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to leave community');
    return response.json();
  },

  /**
   * Get community members
   */
  async getCommunityMembers(communityId, { limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams({ limit, offset });
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/communities/${communityId}/members?${params}`, {
      headers,
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch members');
    return response.json();
  },

  /**
   * Check if current user is a member of a community
   */
  async checkMembership(communityId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[Communities] Check membership error:', error);
      return false;
    }

    return !!data;
  }
};
