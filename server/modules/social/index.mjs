/**
 * Social Module Index
 * Aggregates all social API routes
 */

import { Router } from 'express';
import communitiesRoutes from './communities/communities.routes.mjs';
import activitiesRoutes from './activities/activities.routes.mjs';

const router = Router();

// Mount routes
router.use('/communities', communitiesRoutes);
router.use('/activities', activitiesRoutes);

export default router;
