import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const ROOT_STORAGE = path.resolve(__dirname, '../../../storage');
const TEMP_STORAGE = process.env.TEMP_MEDIA_PATH || process.env.TEMP_STORAGE_PATH || path.join(ROOT_STORAGE, 'temp');

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/yrstream',
  
  // Storage settings
  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER || 'local').toLowerCase() as 'local' | 'google_drive',
  STORAGE_ROOT: process.env.STORAGE_PATH || ROOT_STORAGE,
  MOVIES_PATH: process.env.VIDEO_STORAGE_PATH || path.join(ROOT_STORAGE, 'movies'),
  THUMBNAILS_PATH: process.env.THUMBNAIL_STORAGE_PATH || path.join(ROOT_STORAGE, 'thumbnails'),
  SUBTITLES_PATH: process.env.SUBTITLE_STORAGE_PATH || path.join(ROOT_STORAGE, 'subtitles'),
  TEMP_PATH: TEMP_STORAGE,
  TRANSCODED_PATH: process.env.TRANSCODE_STORAGE_PATH || path.join(ROOT_STORAGE, 'transcoded'),
  HLS_PATH: process.env.HLS_STORAGE_PATH || path.join(ROOT_STORAGE, 'hls'),

  // Google Drive configuration
  GOOGLE_DRIVE_ROOT_FOLDER_ID: (() => {
    const raw = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim();
    if (raw.includes('/folders/')) {
      const match = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : raw;
    }
    return raw;
  })(),
  // OAuth2 credentials
  GOOGLE_DRIVE_CLIENT_ID: (process.env.GOOGLE_DRIVE_CLIENT_ID || '').trim(),
  GOOGLE_DRIVE_CLIENT_SECRET: (process.env.GOOGLE_DRIVE_CLIENT_SECRET || '').trim(),
  GOOGLE_DRIVE_REFRESH_TOKEN: (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '').trim(),
  GOOGLE_DRIVE_REDIRECT_URI: (process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://developers.google.com/oauthplayground').trim(),
  // Service Account credentials (alternative)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim(),

  // Media worker configuration
  MEDIA_WORKER_CONCURRENCY: parseInt(process.env.MEDIA_WORKER_CONCURRENCY || '1', 10),

  // URLs & limits
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  MAX_FILE_SIZE: 20 * 1024 * 1024 * 1024, // 20 GB limit default
  CHUNK_SIZE: 10 * 1024 * 1024, // 10 MB per chunk default
};

