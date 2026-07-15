import { Router } from 'express';
import { trackAndCoverUpload, attachTrackFile } from '../upload/multer.js';
import { list, get, create, update, remove } from '../controllers/tracksController.js';

const router = Router();

router.get('/', list);
router.post('/', trackAndCoverUpload, attachTrackFile, create);
router.get('/:id', get);
router.put('/:id', trackAndCoverUpload, update);
router.delete('/:id', remove);

export default router;
