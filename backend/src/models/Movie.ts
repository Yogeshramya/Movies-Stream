import mongoose, { Schema, Document } from 'mongoose';

export interface ISubtitle {
  language: string;
  label: string;

  /**
   * Path to an external subtitle file (local storage).
   * null when the subtitle is embedded inside the video or stored in cloud.
   */
  filePath?: string | null;

  /**
   * Google Drive file ID for cloud storage.
   */
  driveFileId?: string | null;

  /**
   * Relative storage key.
   */
  storageKey?: string;

  /**
   * Subtitle format.
   */
  format: string;

  /**
   * True when subtitle is embedded inside the media container.
   */
  embedded: boolean;

  /**
   * FFprobe stream index for embedded subtitles.
   */
  streamIndex?: number | null;
}

export interface IAudioTrack {
  index: number;
  language: string;
  title: string;
  codec: string;
  channels: number;
}

export interface IMovie extends Document {
  title: string;
  originalFilename: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  duration: number; // in seconds
  width: number;
  height: number;
  resolution: string; // e.g., '1080p', '4K', '720p', '480p'
  fps: number;
  playbackPath: string;
  playbackMimeType: string;
  transcodeStatus: 'not_required' | 'pending' | 'processing' | 'completed' | 'error';
  transcodeProgress: number;
  videoCodec: string;
  audioCodec: string;
  bitrate: number;
  thumbnailPath?: string;
  subtitles: ISubtitle[];
  audioTracks: IAudioTrack[];
  status: 'processing' | 'ready' | 'error';
  processingProgress: number;
  errorMessage?: string;
  isFavorite: boolean;
  transcodeNeeded: boolean;
  hlsPath?: string;

  // Cloud & Storage Abstraction Fields
  storageProvider: 'local' | 'google_drive';
  originalStorageKey?: string;
  originalDriveFileId?: string;
  playbackStorageKey?: string;
  playbackDriveFileId?: string;
  hlsStoragePrefix?: string;
  hlsDriveFolderId?: string;
  hlsFiles?: Record<string, string>;
  thumbnailStorageKey?: string;
  thumbnailDriveFileId?: string;
  subtitleDriveFileIds?: string[];

  createdAt: Date;
  updatedAt: Date;
}

const SubtitleSchema = new Schema<ISubtitle>({
  language: {
    type: String,
    default: 'und',
  },

  label: {
    type: String,
    default: 'Default',
  },

  filePath: {
    type: String,
    required: false,
    default: null,
  },

  driveFileId: {
    type: String,
    required: false,
    default: null,
  },

  storageKey: {
    type: String,
    required: false,
  },

  format: {
    type: String,
    default: 'vtt',
  },

  embedded: {
    type: Boolean,
    default: true,
  },

  streamIndex: {
    type: Number,
    default: null,
  },
});

const AudioTrackSchema = new Schema<IAudioTrack>({
  index: { type: Number, default: 0 },
  language: { type: String, default: 'und' },
  title: { type: String, default: 'Audio Track' },
  codec: { type: String, default: 'aac' },
  channels: { type: Number, default: 2 },
});

const MovieSchema = new Schema<IMovie>(
  {
    title: { type: String, required: true, trim: true, index: true },
    originalFilename: { type: String, required: true },
    filename: { type: String, required: true, unique: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    duration: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    playbackPath: { type: String, required: true },
    playbackMimeType: { type: String, required: true },

    transcodeStatus: {
      type: String,
      enum: [
        'not_required',
        'pending',
        'processing',
        'completed',
        'error',
      ],
      default: 'not_required',
    },

    transcodeProgress: {
      type: Number,
      default: 0,
    },
    height: { type: Number, default: 0 },
    resolution: { type: String, default: 'Unknown' },
    fps: { type: Number, default: 0 },
    videoCodec: { type: String, default: 'unknown' },
    audioCodec: { type: String, default: 'unknown' },
    bitrate: { type: Number, default: 0 },
    thumbnailPath: { type: String },
    subtitles: [SubtitleSchema],
    audioTracks: [AudioTrackSchema],
    status: {
      type: String,
      enum: ['processing', 'ready', 'error'],
      default: 'processing',
      index: true,
    },
    processingProgress: { type: Number, default: 0 },
    errorMessage: { type: String },
    isFavorite: { type: Boolean, default: false, index: true },
    transcodeNeeded: { type: Boolean, default: false },
    hlsPath: { type: String },

    // Cloud storage fields
    storageProvider: {
      type: String,
      enum: ['local', 'google_drive'],
      default: 'local',
      index: true,
    },
    originalStorageKey: { type: String },
    originalDriveFileId: { type: String },
    playbackStorageKey: { type: String },
    playbackDriveFileId: { type: String },
    hlsStoragePrefix: { type: String },
    hlsDriveFolderId: { type: String },
    hlsFiles: { type: Schema.Types.Mixed, default: {} },
    thumbnailStorageKey: { type: String },
    thumbnailDriveFileId: { type: String },
    subtitleDriveFileIds: [{ type: String }],
  },

  {
    timestamps: true,
  }
);

// Search Index on title and originalFilename
MovieSchema.index({ title: 'text', originalFilename: 'text' });
MovieSchema.index({ createdAt: -1 });
MovieSchema.index({ duration: -1 });
MovieSchema.index({ fileSize: -1 });

export const Movie = mongoose.model<IMovie>('Movie', MovieSchema);
export default Movie;

