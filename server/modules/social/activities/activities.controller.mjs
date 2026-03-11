/**
 * Activities Controller
 * Handles HTTP requests for activity endpoints
 */

import { activitiesService } from './activities.service.mjs';

export const activitiesController = {
  /**
   * POST /api/activities
   * Create a new activity
   */
  async createActivity(req, res) {
    try {
      const { type, title, communityId, roomName, metadata } = req.body;
      const hostId = req.user?.id;

      if (!hostId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!type || !title || !roomName) {
        return res.status(400).json({ error: 'Type, title, and roomName are required' });
      }

      const activity = await activitiesService.createActivity({
        type,
        title,
        communityId,
        hostId,
        roomName,
        metadata
      });

      res.status(201).json(activity);
    } catch (error) {
      console.error('[Activities] Create error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/activities/trending
   * Get trending activities
   */
  async getTrendingActivities(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const type = req.query.type || null;

      const activities = await activitiesService.getTrendingActivities({ limit, type });
      res.json(activities);
    } catch (error) {
      console.error('[Activities] Get trending error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/activities/:id
   * Get activity by ID
   */
  async getActivityById(req, res) {
    try {
      const { id } = req.params;
      const activity = await activitiesService.getActivityById(id);

      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }

      res.json(activity);
    } catch (error) {
      console.error('[Activities] Get by ID error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/activities/:id/join
   * Join an activity
   */
  async joinActivity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const isSpectator = req.body.isSpectator || false;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await activitiesService.joinActivity(id, userId, isSpectator);
      res.json(result);
    } catch (error) {
      console.error('[Activities] Join error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/activities/:id/leave
   * Leave an activity
   */
  async leaveActivity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await activitiesService.leaveActivity(id, userId);
      res.json(result);
    } catch (error) {
      console.error('[Activities] Leave error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/activities/:id/end
   * End an activity (host only)
   */
  async endActivity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify host
      const activity = await activitiesService.getActivityById(id);
      if (activity.host_id !== userId) {
        return res.status(403).json({ error: 'Only the host can end this activity' });
      }

      const result = await activitiesService.endActivity(id);
      res.json(result);
    } catch (error) {
      console.error('[Activities] End error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/activities/user/current
   * Get user's current activity
   */
  async getUserCurrentActivity(req, res) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const activity = await activitiesService.getUserCurrentActivity(userId);
      res.json(activity);
    } catch (error) {
      console.error('[Activities] Get user current error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
