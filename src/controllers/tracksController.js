import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { Track } from '../models/Track.js';
import { Playlist } from '../models/Playlist.js';
import { validateAndReadMp3, validateImage } from '../services/mp3Metadata.js';
import { regeneratePlaylistsContainingTrack, regeneratePlaylistM3u } from '../services/liquidsoapService.js';
import { handleControllerError } from '../utils/errors.js';

export async function list(_req, res) {
  const tracks = await Track.find().sort({ createdAt: -1 }).lean();
  res.json(tracks);
}

export async function get(req, res) {
  const track = await Track.findById(req.params.id).lean();
  if (!track) return res.status(404).json({ error: 'Track not found' });
  res.json(track);
}

async function saveCoverIfPresent(req) {
  const coverFile = req.files?.cover?.[0];
  if (!coverFile) return undefined;

  if (coverFile.buffer.length > config.maxCoverUploadBytes) {
    const err = new Error(`Cover image exceeds the ${Math.round(config.maxCoverUploadBytes / 1024 / 1024)}MB limit`);
    err.statusCode = 400;
    throw err;
  }

  const detected = await validateImage(coverFile.buffer);
  const coverFilename = `${uuidv4()}.${detected.ext}`;
  await fs.mkdir(path.join(config.uploadDir, 'covers'), { recursive: true });
  await fs.writeFile(path.join(config.uploadDir, 'covers', coverFilename), coverFile.buffer);
  return `/uploads/covers/${coverFilename}`;
}

export async function create(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'An MP3 file is required' });
    }

    const meta = await validateAndReadMp3(req.file.buffer);

    const title = req.body.title?.trim() || meta.suggestedTitle;
    const artist = req.body.artist?.trim() || meta.suggestedArtist;
    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }
    const album = req.body.album?.trim() || meta.suggestedAlbum || '';

    const storedFilename = `${uuidv4()}.mp3`;
    await fs.mkdir(path.join(config.uploadDir, 'tracks'), { recursive: true });
    await fs.writeFile(path.join(config.uploadDir, 'tracks', storedFilename), req.file.buffer);

    const coverUrl = (await saveCoverIfPresent(req)) ?? null;

    const track = await Track.create({
      title,
      artist,
      album,
      duration: meta.duration,
      fileUrl: `/uploads/tracks/${storedFilename}`,
      storedFilename,
      originalFilename: req.file.originalname,
      fileSize: req.file.buffer.length,
      coverUrl,
    });

    res.status(201).json(track);
  } catch (err) {
    handleControllerError(res, err, 'tracksController.create');
  }
}

export async function update(req, res) {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });

    if (req.body.title !== undefined) track.title = req.body.title.trim();
    if (req.body.artist !== undefined) track.artist = req.body.artist.trim();
    if (req.body.album !== undefined) track.album = req.body.album.trim();

    const coverUrl = await saveCoverIfPresent(req);
    if (coverUrl !== undefined) track.coverUrl = coverUrl;

    await track.save();

    // Title/artist changes must propagate to any .m3u annotate: fields
    // that embed this track's metadata (track-level change, no restart).
    await regeneratePlaylistsContainingTrack(track._id);

    res.json(track);
  } catch (err) {
    handleControllerError(res, err, 'tracksController.update');
  }
}

export async function remove(req, res) {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });

    const affectedPlaylists = await Playlist.find({ 'tracks.track': track._id }).select('_id').lean();

    await Playlist.updateMany({ 'tracks.track': track._id }, { $pull: { tracks: { track: track._id } } });

    await Promise.all(affectedPlaylists.map((p) => regeneratePlaylistM3u(p._id)));

    await track.deleteOne();

    // Best-effort file cleanup — an orphaned file is a minor, later-cleanable
    // issue, not worth failing the whole delete over.
    await fs.unlink(path.join(config.uploadDir, 'tracks', track.storedFilename)).catch(() => {});
    if (track.coverUrl) {
      await fs.unlink(path.join(config.uploadDir, track.coverUrl.replace(/^\/uploads\//, ''))).catch(() => {});
    }

    res.status(204).end();
  } catch (err) {
    handleControllerError(res, err, 'tracksController.remove');
  }
}
