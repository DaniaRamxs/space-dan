/**
 * Communities Service
 * Client-side service for community operations
 */

// TODO: Configure VITE_API_URL in Vercel Dashboard
const API_URL = 'https://spacely-server-production.up.railway.app';

export const communitiesService = {
  /**
   * Create a new community
   */
  async createCommunity({ name, slug, description, category, avatar, banner }) {
    const response = await fetch(`${API_URL}/api/communities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    const response = await fetch(`${API_URL}/api/communities?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch communities');
    return response.json();
  },

  /**
   * Get community by slug
   */
  async getCommunityBySlug(slug) {
    const response = await fetch(`${API_URL}/api/communities/${slug}`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Community not found');
    return response.json();
  },

  /**
   * Join a community
   */
  async joinCommunity(communityId) {
    const response = await fetch(`${API_URL}/api/communities/${communityId}/join`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to join community');
    return response.json();
  },

  /**
   * Leave a community
   */
  async leaveCommunity(communityId) {
    const response = await fetch(`${API_URL}/api/communities/${communityId}/leave`, {
      method: 'POST',
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
    const response = await fetch(`${API_URL}/api/communities/${communityId}/members?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch members');
    return response.json();
  }
};
