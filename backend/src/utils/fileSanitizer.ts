import path from 'path';

const ALLOWED_VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mkv',
  '.webm',
  '.mov',
  '.avi',
  '.mpeg',
  '.mpg',
  '.m4v',
  '.ts',
  '.m2ts',
  '.flv',
  '.3gp',
  '.wmv',
]);

const ALLOWED_SUBTITLE_EXTENSIONS = new Set([
  '.srt',
  '.vtt',
  '.ass',
  '.sub',
]);

export function sanitizeFilename(filename: string): string {
  // Strip null bytes and directory traversal characters
  const basename = path.basename(filename).replace(/\0/g, '');
  // Clean special characters while retaining human readable letters, numbers, spaces, dots, dashes, underscores
  const cleaned = basename.replace(/[^a-zA-Z0-9.\-_ ()\[\]]/g, '_');
  return cleaned.substring(0, 255);
}

export function isAllowedVideoFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_VIDEO_EXTENSIONS.has(ext);
}

export function isAllowedSubtitleFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_SUBTITLE_EXTENSIONS.has(ext);
}

export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mkv':
      return 'video/x-matroska';
    case '.mov':
      return 'video/quicktime';
    case '.avi':
      return 'video/x-msvideo';
    case '.ts':
    case '.m2ts':
      return 'video/mp2t';
    case '.flv':
      return 'video/x-flv';
    case '.3gp':
      return 'video/3gpp';
    case '.wmv':
      return 'video/x-ms-wmv';
    default:
      return 'application/octet-stream';
  }
}
