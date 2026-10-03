import { Request, Response } from 'express';
import { storageProvider } from '../storage';
import { logger } from '../utils/logger';

export class StreamingService {
  /**
   * Stream a video supporting HTTP 206 Partial Content range requests
   * backed by StorageProvider (Local Disk or Google Drive API).
   */
  static async streamVideo(
    storageIdentifier: string,
    req: Request,
    res: Response,
    customMime?: string,
    fileSizeHint?: number
  ): Promise<void> {
    try {
      let fileSize = fileSizeHint || 0;
      let mimeType = customMime || 'video/mp4';

      // Retrieve metadata if size is not provided
      if (!fileSize) {
        try {
          const meta = await storageProvider.getMetadata(storageIdentifier);
          fileSize = meta.size;
          mimeType = customMime || meta.mimeType || 'video/mp4';
        } catch (metaErr: any) {
          logger.error(`Error reading metadata for stream [${storageIdentifier}]:`, metaErr.message);
          res.status(404).json({ error: 'Video media not found on storage provider' });
          return;
        }
      }

      const range = req.headers.range;

      if (!range) {
        // 200 OK: Full file stream
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        });

        const stream = await storageProvider.getReadStream(storageIdentifier);
        stream.pipe(res);

        stream.on('error', (streamErr: any) => {
          logger.error(`Stream error on [${storageIdentifier}]:`, streamErr.message);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });

        req.on('close', () => {
          if (typeof (stream as any).destroy === 'function') {
            (stream as any).destroy();
          }
        });

        return;
      }

      // ------------------------------------------------------------
      // Parse HTTP Range Header (e.g. "bytes=0-1048575" or "bytes=1048576-")
      // ------------------------------------------------------------
      const parts = range.replace(/bytes=/, '').split('-');
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start)) {
        start = 0;
      }
      if (isNaN(end) || end >= fileSize) {
        end = fileSize - 1;
      }

      if (start >= fileSize || start > end) {
        res
          .status(416)
          .set({
            'Content-Range': `bytes */${fileSize}`,
          })
          .send('Requested range not satisfiable');
        return;
      }

      const chunkSize = end - start + 1;

      // 206 Partial Content
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      });

      const rangeStream = await storageProvider.getReadStream(storageIdentifier, { start, end });
      rangeStream.pipe(res);

      rangeStream.on('error', (streamErr: any) => {
        logger.error(`Range stream error on [${storageIdentifier}]:`, streamErr.message);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      req.on('close', () => {
        if (typeof (rangeStream as any).destroy === 'function') {
          (rangeStream as any).destroy();
        }
      });
    } catch (err: any) {
      logger.error(`Failed to handle video stream for [${storageIdentifier}]:`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming service error' });
      }
    }
  }
}
