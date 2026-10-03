import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../utils/logger';
import fs from 'fs';

export function configureFFmpeg(): { ffmpegAvailable: boolean; ffprobeAvailable: boolean; path: string } {
  let ffmpegPath = process.env.FFMPEG_PATH || '';
  let ffprobePath = process.env.FFPROBE_PATH || '';

  // 1. Try environment variables
  if (ffmpegPath && fs.existsSync(ffmpegPath)) {
    ffmpeg.setFfmpegPath(ffmpegPath);
  } else {
    // 2. Try @ffmpeg-installer/ffmpeg
    try {
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
      if (ffmpegInstaller && ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
        ffmpegPath = ffmpegInstaller.path;
        ffmpeg.setFfmpegPath(ffmpegPath);
      }
    } catch {
      // ignore
    }
  }

  if (ffprobePath && fs.existsSync(ffprobePath)) {
    ffmpeg.setFfprobePath(ffprobePath);
  } else {
    // 2. Try @ffprobe-installer/ffprobe
    try {
      const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
      if (ffprobeInstaller && ffprobeInstaller.path && fs.existsSync(ffprobeInstaller.path)) {
        ffprobePath = ffprobeInstaller.path;
        ffmpeg.setFfprobePath(ffprobePath);
      }
    } catch {
      // ignore
    }
  }

  logger.ffmpeg(`FFmpeg binary path: ${ffmpegPath || 'System PATH'}`);
  logger.ffmpeg(`FFprobe binary path: ${ffprobePath || 'System PATH'}`);

  return {
    ffmpegAvailable: !!ffmpegPath,
    ffprobeAvailable: !!ffprobePath,
    path: ffmpegPath,
  };
}

export { ffmpeg };
