import fs from 'fs';
import path from 'path';
import { ENV } from './env';
import { logger } from '../utils/logger';

export function initializeStorage(): void {
  const dirs = [
    ENV.STORAGE_ROOT,
    ENV.MOVIES_PATH,
    ENV.THUMBNAILS_PATH,
    ENV.SUBTITLES_PATH,
    ENV.TEMP_PATH,
    ENV.TRANSCODED_PATH,
    ENV.HLS_PATH,
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created storage directory: ${dir}`);
      } catch (err: any) {
        logger.error(`Failed to create storage directory: ${dir}`, err.message);
      }
    }
  }

  // Cleanup orphaned temporary folders to free up disk space
  cleanupTempStorage();
}

export function cleanupTempStorage(maxAgeMs = 1000 * 60 * 30): void {
  try {
    if (!fs.existsSync(ENV.TEMP_PATH)) return;

    const entries = fs.readdirSync(ENV.TEMP_PATH);
    const now = Date.now();

    for (const entry of entries) {
      if (entry === '.gitkeep') continue;
      const fullPath = path.join(ENV.TEMP_PATH, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (now - stat.mtimeMs > maxAgeMs) {
          if (stat.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(fullPath);
          }
          logger.info(`[STORAGE:cleanup] Cleaned up orphaned temp files: ${entry}`);
        }
      } catch {}
    }
  } catch (err: any) {
    logger.warn('[STORAGE:cleanup] Temp cleanup error:', err.message);
  }
}

