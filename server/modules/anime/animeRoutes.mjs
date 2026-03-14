import { Router } from 'express';
import * as animeController from './animeController.mjs';

const router = Router();

router.get('/search', animeController.search);
router.get('/info/:id', animeController.getInfo);

// Supports /api/anime/watch/:animeId/:episodeId (Most specific first)
router.get('/watch/:animeId/:episodeId', animeController.watch);

// Supports /api/anime/watch/:episodeId
router.get('/watch/:episodeId', animeController.watch);

export default router;
