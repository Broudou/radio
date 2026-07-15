import { Schedule } from '../models/Schedule.js';
import { Playlist } from '../models/Playlist.js';
import { regenerateAndRestart } from '../services/liquidsoapService.js';
import { handleControllerError } from '../utils/errors.js';

export async function list(_req, res) {
  const entries = await Schedule.find().sort({ startAt: 1 }).populate('playlist').lean();
  res.json(entries);
}

export async function get(req, res) {
  const entry = await Schedule.findById(req.params.id).populate('playlist').lean();
  if (!entry) return res.status(404).json({ error: 'Schedule entry not found' });
  res.json(entry);
}

async function findConflict(startAt, endAt, excludeId) {
  const query = { startAt: { $lt: endAt }, endAt: { $gt: startAt } };
  if (excludeId) query._id = { $ne: excludeId };
  return Schedule.findOne(query).populate('playlist', 'name').lean();
}

export async function create(req, res) {
  try {
    const { playlist, startAt, endAt, label } = req.body;
    if (!playlist || !startAt || !endAt) {
      return res.status(400).json({ error: 'playlist, startAt, and endAt are required' });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'startAt/endAt must be valid dates' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ error: 'endAt must be after startAt' });
    }

    const playlistDoc = await Playlist.findById(playlist).select('_id').lean();
    if (!playlistDoc) return res.status(404).json({ error: 'Playlist not found' });

    const conflict = await findConflict(startDate, endDate);
    if (conflict) {
      return res.status(409).json({
        error: 'Schedule conflicts with an existing entry',
        conflictsWith: [conflict],
      });
    }

    const entry = await Schedule.create({
      playlist,
      startAt: startDate,
      endAt: endDate,
      label: label?.trim() || '',
    });

    await regenerateAndRestart();

    res.status(201).json(entry);
  } catch (err) {
    handleControllerError(res, err, 'scheduleController.create');
  }
}

export async function update(req, res) {
  try {
    const entry = await Schedule.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Schedule entry not found' });

    const startDate = req.body.startAt ? new Date(req.body.startAt) : entry.startAt;
    const endDate = req.body.endAt ? new Date(req.body.endAt) : entry.endAt;
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'startAt/endAt must be valid dates' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ error: 'endAt must be after startAt' });
    }

    if (req.body.playlist) {
      const playlistDoc = await Playlist.findById(req.body.playlist).select('_id').lean();
      if (!playlistDoc) return res.status(404).json({ error: 'Playlist not found' });
      entry.playlist = req.body.playlist;
    }

    const conflict = await findConflict(startDate, endDate, entry._id);
    if (conflict) {
      return res.status(409).json({
        error: 'Schedule conflicts with an existing entry',
        conflictsWith: [conflict],
      });
    }

    entry.startAt = startDate;
    entry.endAt = endDate;
    if (req.body.label !== undefined) entry.label = req.body.label.trim();
    await entry.save();

    await regenerateAndRestart();

    res.json(entry);
  } catch (err) {
    handleControllerError(res, err, 'scheduleController.update');
  }
}

export async function remove(req, res) {
  try {
    const entry = await Schedule.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Schedule entry not found' });

    await entry.deleteOne();
    await regenerateAndRestart();

    res.status(204).end();
  } catch (err) {
    handleControllerError(res, err, 'scheduleController.remove');
  }
}
