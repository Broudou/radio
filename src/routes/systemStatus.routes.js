import { Router } from 'express';
import { getStatus } from '../controllers/systemStatusController.js';

const router = Router();

router.get('/', getStatus);

export default router;
