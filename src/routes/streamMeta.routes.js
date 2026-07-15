import { Router } from 'express';
import { getStreamMeta } from '../controllers/streamMetaController.js';

const router = Router();

router.get('/', getStreamMeta);

export default router;
