/**
 * Communities Controller
 * Handles HTTP requests for community endpoints
 */

import { communitiesService } from './communities.service.mjs';

export const communitiesController = {
  /**
   * POST /api/communities
   * Create a new community
   */
  async createCommunity(req, res) {
    try {
      const { name, slug, description, category, avatar, banner } = req.body;
      const creatorId = req.user?.id;

      if (!creatorId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!name || !slug) {
        return res.status(400).json({ error: 'Name and slug are required' });
      }

      const community = await communitiesService.createCommunity({
        name,
        slug,
        description,
        category,
        creatorId,
        avatar,
        banner
      });

      res.status(201).json(community);
    } catch (error) {
      console.error('[Communities] Create error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/communities
   * Get all communities with filters
   */
  async getCommunities(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const category = req.query.category || null;
      const search = req.query.search || null;

      const communities = await communitiesService.getCommunities({
        limit,
        offset,
        category,
        search
      });

      res.json(communities);
    } catch (error) {
      console.error('[Communities] Get all error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/communities/:slug
   * Get community by slug
   */
  async getCommunityBySlug(req, res) {
    try {
      const { slug } = req.params;
      const community = await communitiesService.getCommunityBySlug(slug);

      if (!community) {
        return res.status(404).json({ error: 'Community not found' });
      }

      res.json(community);
    } catch (error) {
      console.error('[Communities] Get by slug error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/communities/:id/join
   * Join a community
   */
  async joinCommunity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await communitiesService.joinCommunity(id, userId);
      res.json(result);
    } catch (error) {
      console.error('[Communities] Join error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * POST /api/communities/:id/leave
   * Leave a community
   */
  async leaveCommunity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await communitiesService.leaveCommunity(id, userId);
      res.json(result);
    } catch (error) {
      console.error('[Communities] Leave error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/communities/:id/members
   * Get community members
   */
  async getCommunityMembers(req, res) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const members = await communitiesService.getCommunityMembers(id, { limit, offset });
      res.json(members);
    } catch (error) {
      console.error('[Communities] Get members error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
