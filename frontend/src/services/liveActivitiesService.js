/**
 * Live Activities Service
 * Client-side service for activity operations
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://spacely-server-production.up.railway.app';

export const liveActivitiesService = {
  /**
   * Create a new activity
   */
  async createActivity({ type, title, communityId, roomName, metadata }) {
    const response = await fetch(`${API_URL}/api/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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
  async getTrendingActivities({ limit = 20, type = null } = {}) {
    const params = new URLSearchParams({ limit });
    if (type) params.append('type', type);

    const response = await fetch(`${API_URL}/api/activities/trending?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch trending activities');
    return response.json();
  },

  /**
   * Get activity by ID
   */
  async getActivityById(id) {
    const response = await fetch(`${API_URL}/api/activities/${id}`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Activity not found');
    return response.json();
  },

  /**
   * Join an activity
   */
  async joinActivity(activityId, isSpectator = false) {
    const response = await fetch(`${API_URL}/api/activities/${activityId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isSpectator })
    });

    if (!response.ok) throw new Error('Failed to join activity');
    return response.json();
  },

  /**
   * Leave an activity
   */
  async leaveActivity(activityId) {
    const response = await fetch(`${API_URL}/api/activities/${activityId}/leave`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to leave activity');
    return response.json();
  },

  /**
   * End an activity (host only)
   */
  async endActivity(activityId) {
    const response = await fetch(`${API_URL}/api/activities/${activityId}/end`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to end activity');
    return response.json();
  },

  /**
   * Get user's current activity
   */
  async getUserCurrentActivity() {
    const response = await fetch(`${API_URL}/api/activities/user/current`, {
      credentials: 'include'
    });

    if (!response.ok) throw new Error('Failed to fetch current activity');
    return response.json();
  }
};
