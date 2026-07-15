import mongoose from 'mongoose';

const TrackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    album: { type: String, default: '', trim: true },
    duration: { type: Number, required: true }, // seconds, always server-derived
    fileUrl: { type: String, required: true },
    storedFilename: { type: String, required: true },
    originalFilename: { type: String, required: true },
    fileSize: { type: Number, required: true },
    coverUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export const Track = mongoose.models.Track ?? mongoose.model('Track', TrackSchema);
