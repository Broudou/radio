import { Router } from 'express';
import {
  list,
  get,
  create,
  update,
  remove,
  addTrack,
  removeTrack,
  reorderTracks,
  setEnabled,
  setDefault,
} from '../controllers/playlistsController.js';

const router = Router();

router.get('/', list);
router.post('/', create);
router.get('/:id', get);
router.put('/:id', update);
router.delete('/:id', remove);
router.post('/:id/tracks', addTrack);
router.delete('/:id/tracks/:trackId', removeTrack);
router.patch('/:id/tracks/reorder', reorderTracks);
router.patch('/:id/enable', setEnabled);
router.patch('/:id/set-default', setDefault);

export default router;
