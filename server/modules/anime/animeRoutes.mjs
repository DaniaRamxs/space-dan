import { Router } from 'express';
import * as animeController from './animeController.mjs';

const router = Router();

router.get('/search', animeController.search);
router.get('/info/:id', animeController.getInfo);
router.get('/watch/:episodeId', animeController.watch);

export default router;
