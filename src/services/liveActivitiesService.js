/**
 * Live Activities Service
 * Client-side service for activity operations
 */

import { supabase } from '../supabaseClient';

// Use dynamic URL from env (Railway production)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://spacely-server-production.up.railway.app';

// Helper to get auth headers
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
  };
}

export const liveActivitiesService = {
  /**
   * Create a new activity
   */
  async createActivity({ type, title, communityId, roomName, metadata }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers,
      credentials: 'omit',
      body: JSON.stringify({ type, title, communityId, roomName, metadata })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create activity');
    }

    return response.json();
  },

  /**
   * Get trending activities
   */
  async getTrendingActivities({ limit = 10, type = null } = {}) {
    const params = new URLSearchParams({ limit });
    if (type) params.append('type', type);

    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/activities/trending?${params}`, {
      headers,
      credentials: 'omit'
    });

    if (!response.ok) throw new Error('Failed to fetch trending activities');
    return response.json();
  },

  /**
   * Get activity by ID
   */
  async getActivityById(id) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/activities/${id}`, {
      headers,
      credentials: 'omit'
    });

    if (!response.ok) throw new Error('Activity not found');
    return response.json();
  },

  /**
   * Join an activity
   */
  async joinActivity(activityId, isSpectator = false) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/activities/${activityId}/join`, {
      method: 'POST',
      headers,
      credentials: 'omit',
      body: JSON.stringify({ isSpectator })
    });

    if (!response.ok) throw new Error('Failed to join activity');
    return response.json();
  },

  /**
   * Leave an activity
   */
  async leaveActivity(activityId) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/activities/${activityId}/leave`, {
      method: 'POST',
      headers,
      credentials: 'omit'
    });

    if (!response.ok) throw new Error('Failed to leave activity');
    return response.json();
  },

  /**
   * End an activity (host only)
   */
  async endActivity(activityId) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/activities/${activityId}/end`, {
      method: 'POST',
      headers,
      credentials: 'omit'
    });

    if (!response.ok) throw new Error('Failed to end activity');
    return response.json();
  },

  /**
   * Get user's current activity
   */
  async getUserCurrentActivity() {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/activities/user/current`, {
      headers,
      credentials: 'omit'
    });

    if (!response.ok) throw new Error('Failed to fetch current activity');
    return response.json();
  }
};
