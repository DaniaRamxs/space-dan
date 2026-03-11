/**
 * Communities Routes
 * Defines API routes for community operations
 */

import { Router } from 'express';
import { communitiesController } from './communities.controller.mjs';

const router = Router();

// Create community
router.post('/', communitiesController.createCommunity);

// Get all communities
router.get('/', communitiesController.getCommunities);

// Get community by slug
router.get('/:slug', communitiesController.getCommunityBySlug);

// Join community
router.post('/:id/join', communitiesController.joinCommunity);

// Leave community
router.post('/:id/leave', communitiesController.leaveCommunity);

// Get community members
router.get('/:id/members', communitiesController.getCommunityMembers);

export default router;
