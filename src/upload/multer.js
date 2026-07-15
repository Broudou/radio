import multer from 'multer';
import { config } from '../config/env.js';

// Single memoryStorage instance handling the required `track` (mp3) field
// and an optional `cover` (image) field from the same multipart form.
// Multer's fileSize limit is global to the instance (per file, not
// per-field), so it's set to the larger of the two allowances; the cover's
// own tighter size limit is enforced explicitly in the controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(config.maxTrackUploadBytes, config.maxCoverUploadBytes) },
});

export const trackAndCoverUpload = upload.fields([
  { name: 'track', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

export function attachTrackFile(req, _res, next) {
  req.file = req.files?.track?.[0];
  next();
}
