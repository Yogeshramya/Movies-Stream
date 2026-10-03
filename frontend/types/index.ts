export interface ISubtitle {
  language: string;
  label: string;
  filePath?: string | null;
  driveFileId?: string | null;
  storageKey?: string;
  format: string;
  embedded?: boolean;
  streamIndex?: number | null;
}

export interface IAudioTrack {
  index: number;
  language: string;
  title: string;
  codec: string;
  channels: number;
}

export interface Movie {
  _id: string;
  title: string;
  originalFilename: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  duration: number; // in seconds
  width: number;
  height: number;
  resolution: string;
  fps: number;
  playbackPath?: string;
  playbackMimeType?: string;
  transcodeStatus?: 'not_required' | 'pending' | 'processing' | 'completed' | 'error';
  transcodeProgress?: number;
  videoCodec: string;
  audioCodec: string;
  bitrate: number;
  thumbnailPath?: string;
  thumbnailDriveFileId?: string;
  subtitles: ISubtitle[];
  audioTracks: IAudioTrack[];
  status: 'processing' | 'ready' | 'error';
  processingProgress: number;
  errorMessage?: string;
  isFavorite: boolean;
  transcodeNeeded: boolean;
  hlsPath?: string;
  storageProvider?: 'local' | 'google_drive';
  originalDriveFileId?: string;
  playbackDriveFileId?: string;
  createdAt: string;
  updatedAt: string;
  watchProgress?: {
    position: number;
    progressPercentage: number;
    completed: boolean;
    lastWatchedAt: string;
  } | null;
}


export interface WatchHistoryItem {
  _id: string;
  movie: Movie;
  position: number;
  duration: number;
  completed: boolean;
  progressPercentage: number;
  lastWatchedAt: string;
}

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: string;
  isRecommended: boolean;
}


export interface SystemStats {
  storage: {
    totalDiskBytes: number;
    usedDiskBytes: number;
    freeDiskBytes: number;
    diskUsagePercent: number;
    driveMount: string;
    totalMoviesSizeBytes: number;
  };
  library: {
    totalMovies: number;
    processingMovies: number;
    favoriteMovies: number;
  };
  network: {
    primaryIP: string;
    port: number;
    frontendPort: number;
    tvUrl: string;
    allInterfaces: NetworkInterfaceInfo[];
  };
}
