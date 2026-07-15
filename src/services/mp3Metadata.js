import { fileTypeFromBuffer } from 'file-type';
import { parseBuffer } from 'music-metadata';

/**
 * Validates that a buffer is really an MP3 (magic-byte check, not just the
 * client-claimed extension/mimetype) and extracts server-authoritative
 * metadata. Throws with a user-facing message on invalid input.
 */
export async function validateAndReadMp3(buffer) {
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || detected.ext !== 'mp3' || detected.mime !== 'audio/mpeg') {
    const err = new Error('Invalid MP3 file');
    err.statusCode = 400;
    throw err;
  }

  let parsed;
  try {
    parsed = await parseBuffer(buffer, { mimeType: 'audio/mpeg' });
  } catch (cause) {
    const err = new Error('Could not read MP3 metadata');
    err.statusCode = 400;
    throw err;
  }

  const duration = parsed.format.duration;
  if (!duration || !Number.isFinite(duration) || duration <= 0) {
    const err = new Error('Could not determine track duration');
    err.statusCode = 400;
    throw err;
  }

  return {
    duration: Math.round(duration),
    suggestedTitle: parsed.common.title || null,
    suggestedArtist: parsed.common.artist || null,
    suggestedAlbum: parsed.common.album || null,
  };
}

export async function validateImage(buffer, allowedMimes = ['image/jpeg', 'image/png', 'image/webp']) {
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !allowedMimes.includes(detected.mime)) {
    const err = new Error('Invalid image file');
    err.statusCode = 400;
    throw err;
  }
  return detected; // { ext, mime }
}
