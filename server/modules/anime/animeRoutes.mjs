import { Router } from 'express';
import * as animeController from './animeController.mjs';

const router = Router();

router.get('/search', animeController.search);
router.get('/info/:id', animeController.getInfo);

// Supports both legacy /watch/:animeId/:episodeId and new /watch/:episodeId
router.get('/watch/:id1/:id2?', animeController.watch);

export default router;
