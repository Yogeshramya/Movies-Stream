import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWatchHistory extends Document {
  movieId: Types.ObjectId;
  position: number; // in seconds
  duration: number; // in seconds
  completed: boolean;
  progressPercentage: number;
  lastWatchedAt: Date;
}

const WatchHistorySchema = new Schema<IWatchHistory>(
  {
    movieId: {
      type: Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
      index: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      default: 0,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    progressPercentage: {
      type: Number,
      default: 0,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate progress percentage before saving
WatchHistorySchema.pre('save', function (next) {
  if (this.duration > 0) {
    this.progressPercentage = Math.min(100, Math.round((this.position / this.duration) * 100));
    // Consider completed if watched > 92%
    if (this.progressPercentage >= 92) {
      this.completed = true;
    }
  }
  this.lastWatchedAt = new Date();
  next();
});

export const WatchHistory = mongoose.model<IWatchHistory>('WatchHistory', WatchHistorySchema);
