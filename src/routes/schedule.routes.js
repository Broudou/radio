import { Router } from 'express';
import { list, get, create, update, remove } from '../controllers/scheduleController.js';

const router = Router();

router.get('/', list);
router.post('/', create);
router.get('/:id', get);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
