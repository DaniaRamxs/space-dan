/**
 * Activities Routes
 * Defines API routes for activity operations
 */

import { Router } from 'express';
import { activitiesController } from './activities.controller.mjs';

const router = Router();

// Create activity
router.post('/', activitiesController.createActivity);

// Get trending activities
router.get('/trending', activitiesController.getTrendingActivities);

// Get user's current activity
router.get('/user/current', activitiesController.getUserCurrentActivity);

// Get activity by ID
router.get('/:id', activitiesController.getActivityById);

// Join activity
router.post('/:id/join', activitiesController.joinActivity);

// Leave activity
router.post('/:id/leave', activitiesController.leaveActivity);

// End activity
router.post('/:id/end', activitiesController.endActivity);

export default router;
