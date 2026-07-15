import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema(
  {
    playlist: { type: mongoose.Schema.Types.ObjectId, ref: 'Playlist', required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    label: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

ScheduleSchema.pre('validate', function validateRange(next) {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    next(new Error('endAt must be after startAt'));
    return;
  }
  next();
});

export const Schedule = mongoose.models.Schedule ?? mongoose.model('Schedule', ScheduleSchema);
