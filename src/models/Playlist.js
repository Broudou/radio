import mongoose from 'mongoose';

const PlaylistTrackSchema = new mongoose.Schema(
  {
    track: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', required: true },
  },
  { _id: false }
);

const PlaylistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    tracks: { type: [PlaylistTrackSchema], default: [] }, // array index IS play order
    enabled: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// DB-level safety net: at most one playlist can ever have isDefault:true,
// even under a race between the two writes in the set-default flow.
PlaylistSchema.index(
  { isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

export const Playlist = mongoose.models.Playlist ?? mongoose.model('Playlist', PlaylistSchema);
