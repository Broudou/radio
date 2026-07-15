import { Playlist } from '../models/Playlist.js';
import { Track } from '../models/Track.js';
import { Schedule } from '../models/Schedule.js';
import {
  regeneratePlaylistM3u,
  regenerateAndRestart,
  regenerateAndRestartIfConfigured,
} from '../services/liquidsoapService.js';
import { handleControllerError } from '../utils/errors.js';

export async function list(_req, res) {
  const playlists = await Playlist.find().sort({ createdAt: -1 }).populate('tracks.track').lean();
  res.json(playlists);
}

export async function get(req, res) {
  const playlist = await Playlist.findById(req.params.id).populate('tracks.track').lean();
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  res.json(playlist);
}

export async function create(req, res) {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const playlist = await Playlist.create({ name: name.trim(), description: description?.trim() || '' });

    // A brand-new enabled playlist changes the set of Liquidsoap sources;
    // regenerateAndRestartIfConfigured() also writes this playlist's (empty)
    // .m3u, but tolerates a fresh install with no default playlist yet.
    await regenerateAndRestartIfConfigured();

    res.status(201).json(playlist);
  } catch (err) {
    handleControllerError(res, err, 'playlistsController.create');
  }
}

export async function update(req, res) {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    if (req.body.name !== undefined) playlist.name = req.body.name.trim();
    if (req.body.description !== undefined) playlist.description = req.body.description.trim();
    await playlist.save();

    res.json(playlist);
  } catch (err) {
    handleControllerError(res, err, 'playlistsController.update');
  }
}

export async function remove(req, res) {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const hasFutureSchedule = await Schedule.exists({
      playlist: playlist._id,
      endAt: { $gt: new Date() },
    });
    if (hasFutureSchedule) {
      return res.status(409).json({
        error: 'This playlist is referenced by a current or future schedule entry — reassign or delete those first',
      });
    }
    if (playlist.isDefault) {
      return res.status(409).json({
        error: 'Cannot delete the default playlist — set another playlist as default first',
      });
    }

    await playlist.deleteOne();
    await regenerateAndRestartIfConfigured();

    res.status(204).end();
  } catch (err) {
    handleControllerError(res, err, 'playlistsController.remove');
  }
}

export async function addTrack(req, res) {
  try {
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId is required' });

    const [playlist, track] = await Promise.all([
      Playlist.findById(req.params.id),
      Track.findById(trackId).select('_id').lean(),
    ]);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    if (!track) return res.status(404).json({ error: 'Track not found' });

    playlist.tracks.push({ track: trackId });
    await playlist.save();
    await regeneratePlaylistM3u(playlist._id);

    res.status(201).json(playlist);
  } catch (err) {
    handleControllerError(res, err, 'playlistsController.addTrack');
  }
}

export async function removeTrack(req, res) {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    playlist.tracks = playlist.tracks.filter((t) => String(t.track) !== req.params.trackId);
    await playlist.save();
    await regeneratePlaylistM3u(playlist._id);

    res.json(playlist);
  } catch (err) {
    handleControllerError(res, err, 'playlistsController.removeTrack');
  }
}

export async function reorderTracks(req, res) {
  try {
    const { trackIds } = req.body;
    if (!Array.isArray(trackIds)) return res.status(400).json({ error: 'trackIds must be an array' });

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const currentIds = playlist.tracks.map((t) => String(t.track));
    const sameSet =
      currentIds.length === trackIds.length && currentIds.every((id) => trackIds.includes(id));
    if (!sameSet) {
      return res.status(400).json({ error: 'trackIds must be a permutation of the playlist\'s current tracks' });
    }

    playlist.tracks = trackIds.map((id) => ({ track: id }));
    await playlist.save();
    await regeneratePlaylistM3u(playlist._id);

    res.json(playlist);
  } catch (err) {
    handleControllerError(res, err, 'playlistsController.reorderTracks');
  }
}

export async function setEnabled(req, res) {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be a boolean' });

    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    if (!enabled && playlist.isDefault) {
      return res.status(409).json({ error: 'Cannot disable the default playlist' });
    }

    playlist.enabled = enabled;
    await playlist.save();

    // Toggling enabled adds/removes a playlist() declaration in radio.liq —
    // a structural change even though no schedule entry changed.
    await regenerateAndRestartIfConfigured();

    res.json(playlist);
  } catch (err) {
    handleControllerError(res, err, 'playlistsController.setEnabled');
  }
}

export async function setDefault(req, res) {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    if (!playlist.enabled) {
      return res.status(409).json({ error: 'Cannot set a disabled playlist as default — enable it first' });
    }

    // Sequential unset-then-set (not a transaction — standalone mongod has
    // no replica set). The partial unique index on isDefault is the
    // DB-level safety net against the small race window this leaves.
    await Playlist.updateMany({ isDefault: true }, { isDefault: false });
    playlist.isDefault = true;
    await playlist.save();

    await regenerateAndRestart();

    res.json(playlist);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'Another playlist was just set as default — try again' });
    }
    handleControllerError(res, err, 'playlistsController.setDefault');
  }
}
