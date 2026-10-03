import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Movie } from '../models/Movie';
import { WatchHistory } from '../models/WatchHistory';
import { StreamingService } from '../services/streamingService';
import { storageProvider } from '../storage';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { emitEvent } from '../sockets/socketHandler';

export class MovieController {
  /**
   * GET /api/movies
   */
  static async getMovies(req: Request, res: Response): Promise<void> {
    try {
      const {
        search = '',
        sort = 'recent',
        filter = 'all',
        page = '1',
        limit = '24',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 24));
      const skip = (pageNum - 1) * limitNum;

      const query: any = {};

      // Filter
      if (filter === 'favorites') {
        query.isFavorite = true;
      } else if (filter === 'ready') {
        query.status = 'ready';
      }

      // Search
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        query.$or = [
          { title: searchRegex },
          { originalFilename: searchRegex },
          { resolution: searchRegex },
          { videoCodec: searchRegex },
        ];
      }

      // Sort
      let sortOptions: any = { createdAt: -1 };
      switch (sort) {
        case 'title-asc':
          sortOptions = { title: 1 };
          break;
        case 'title-desc':
          sortOptions = { title: -1 };
          break;
        case 'duration-desc':
          sortOptions = { duration: -1 };
          break;
        case 'duration-asc':
          sortOptions = { duration: 1 };
          break;
        case 'size-desc':
          sortOptions = { fileSize: -1 };
          break;
        case 'size-asc':
          sortOptions = { fileSize: 1 };
          break;
        case 'recent':
        default:
          sortOptions = { createdAt: -1 };
          break;
      }

      const [movies, total] = await Promise.all([
        Movie.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
        Movie.countDocuments(query),
      ]);

      // Enrich with watch history progress
      const movieIds = movies.map((m) => m._id);
      const histories = await WatchHistory.find({ movieId: { $in: movieIds } }).lean();
      const historyMap = new Map(histories.map((h) => [h.movieId.toString(), h]));

      const enriched = movies.map((m) => {
        const h = historyMap.get(m._id.toString());
        return {
          ...m,
          watchProgress: h
            ? {
                position: h.position,
                progressPercentage: h.progressPercentage,
                completed: h.completed,
                lastWatchedAt: h.lastWatchedAt,
              }
            : null,
        };
      });

      res.json({
        success: true,
        movies: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (err: any) {
      logger.error('Error fetching movies:', err.message);
      res.status(500).json({ error: 'Failed to fetch movie library' });
    }
  }

  /**
   * GET /api/movies/:id
   */
  static async getMovieById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const movie = await Movie.findById(id).lean();

      if (!movie) {
        res.status(404).json({ error: 'Movie not found' });
        return;
      }

      const history = await WatchHistory.findOne({ movieId: id }).lean();

      res.json({
        success: true,
        movie: {
          ...movie,
          watchProgress: history
            ? {
                position: history.position,
                progressPercentage: history.progressPercentage,
                completed: history.completed,
                lastWatchedAt: history.lastWatchedAt,
              }
            : null,
        },
      });
    } catch (err: any) {
      logger.error(`Error fetching movie ${req.params.id}:`, err.message);
      res.status(500).json({ error: 'Failed to fetch movie' });
    }
  }

  /**
   * PATCH /api/movies/:id
   */
  static async updateMovie(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, isFavorite } = req.body;

      const updateData: any = {};
      if (title !== undefined && typeof title === 'string' && title.trim()) {
        updateData.title = title.trim();
      }
      if (isFavorite !== undefined && typeof isFavorite === 'boolean') {
        updateData.isFavorite = isFavorite;
      }

      const movie = await Movie.findByIdAndUpdate(id, updateData, { new: true });
      if (!movie) {
        res.status(404).json({ error: 'Movie not found' });
        return;
      }

      emitEvent('movie:updated', movie);
      res.json({ success: true, movie });
    } catch (err: any) {
      logger.error(`Error updating movie ${req.params.id}:`, err.message);
      res.status(500).json({ error: 'Failed to update movie' });
    }
  }

  /**
   * DELETE /api/movies/:id
   * Safe removal of DB records and cloud/disk files (video, thumbnail, subtitles, HLS)
   */
  static async deleteMovie(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const movie = await Movie.findById(id);

      if (!movie) {
        res.status(404).json({ error: 'Movie not found' });
        return;
      }

      logger.info(`[DELETE] Starting deletion for movie "${movie.title}" [${id}]...`);

      // 1. Delete original uploaded video
      const originalId = movie.originalDriveFileId || movie.originalStorageKey || movie.filePath;
      if (originalId) {
        await storageProvider.delete(originalId).catch(() => {});
      }

      // 2. Delete playback video if different
      const playbackId = movie.playbackDriveFileId || movie.playbackStorageKey || movie.playbackPath;
      if (playbackId && playbackId !== originalId) {
        await storageProvider.delete(playbackId).catch(() => {});
      }

      // 3. Delete thumbnail
      const thumbId =
        movie.thumbnailDriveFileId ||
        movie.thumbnailStorageKey ||
        (movie.thumbnailPath ? path.join(ENV.THUMBNAILS_PATH, movie.thumbnailPath) : undefined);
      if (thumbId) {
        await storageProvider.delete(thumbId).catch(() => {});
      }

      // 4. Delete HLS folder / files
      if (movie.hlsDriveFolderId) {
        if (storageProvider.deleteFolder) {
          await storageProvider.deleteFolder(movie.hlsDriveFolderId).catch(() => {});
        }
      } else if (movie.hlsFiles) {
        const filesObj = movie.hlsFiles instanceof Map ? Object.fromEntries(movie.hlsFiles) : movie.hlsFiles;
        for (const fileId of Object.values(filesObj)) {
          if (fileId) await storageProvider.delete(fileId as string).catch(() => {});
        }
      } else if (movie.hlsPath) {
        const localHlsDir = path.dirname(path.resolve(movie.hlsPath));
        if (storageProvider.deleteFolder) {
          await storageProvider.deleteFolder(localHlsDir).catch(() => {});
        }
      }

      // 5. Delete extracted subtitles
      if (movie.subtitles?.length) {
        for (const sub of movie.subtitles) {
          const subId = sub.driveFileId || sub.storageKey || sub.filePath;
          if (subId && !sub.embedded) {
            await storageProvider.delete(subId).catch(() => {});
          }
        }
      }

      // 6. Delete Watch history
      await WatchHistory.deleteMany({ movieId: id });

      // 7. Remove MongoDB document
      await Movie.findByIdAndDelete(id);

      // 8. Notify connected clients
      emitEvent('movie:deleted', { movieId: id });
      logger.info(`[DELETE] Successfully deleted movie "${movie.title}" [ID: ${id}]`);

      res.json({
        success: true,
        message: 'Movie deleted successfully',
      });
    } catch (err: any) {
      logger.error(`Error deleting movie ${req.params.id}:`, err.message);
      res.status(500).json({ error: 'Failed to delete movie' });
    }
  }

  /**
   * GET /api/movies/:id/stream
   * High performance HTTP 206 Partial Content video stream backed by StorageProvider
   */
  static async streamMovie(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const movie = await Movie.findById(id);

      if (!movie) {
        res.status(404).json({ error: 'Movie not found' });
        return;
      }

      const storageId =
        movie.playbackDriveFileId ||
        movie.playbackStorageKey ||
        movie.playbackPath ||
        movie.originalDriveFileId ||
        movie.filePath;

      if (!storageId) {
        res.status(404).json({ error: 'Movie media storage identifier not found' });
        return;
      }

      logger.stream(`Streaming "${movie.title}" to ${req.ip} (Range: ${req.headers.range || 'Full'})`);

      const mimeType = movie.playbackMimeType || movie.mimeType || 'video/mp4';
      await StreamingService.streamVideo(storageId, req, res, mimeType, movie.fileSize);
    } catch (err: any) {
      logger.error(`Stream error for movie ${req.params.id}:`, err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Streaming error' });
      }
    }
  }

  /**
   * GET /api/movies/:id/thumbnail
   */
  static async getThumbnail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const movie = await Movie.findById(id);

      if (!movie) {
        res.status(404).json({ error: 'Movie not found' });
        return;
      }

      const thumbId =
        movie.thumbnailDriveFileId ||
        movie.thumbnailStorageKey ||
        (movie.thumbnailPath ? path.join(ENV.THUMBNAILS_PATH, movie.thumbnailPath) : undefined);

      if (!thumbId) {
        res.status(404).json({ error: 'Thumbnail not available' });
        return;
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const stream = await storageProvider.getReadStream(thumbId);
      stream.pipe(res);

      stream.on('error', (err: any) => {
        logger.error(`Error streaming thumbnail for ${id}:`, err.message);
        if (!res.headersSent) {
          res.status(404).json({ error: 'Thumbnail file missing' });
        }
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to fetch thumbnail' });
      }
    }
  }

  /**
   * GET /api/movies/:id/hls/:filename
   * Stream HLS playlist and video/audio segment files from StorageProvider
   */
  static streamHlsFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, filename } = req.params;
      const movie = await Movie.findById(id);

      if (!movie) {
        res.status(404).json({ success: false, message: 'Movie not found' });
        return;
      }

      if (!movie.hlsPath && !movie.hlsFiles) {
        res.status(404).json({ success: false, message: 'HLS stream is not available for this movie' });
        return;
      }

      const safeFilename = path.basename(filename);
      if (safeFilename !== filename) {
        res.status(400).json({ success: false, message: 'Invalid HLS filename' });
        return;
      }

      const extension = path.extname(safeFilename).toLowerCase();
      let contentType = 'application/octet-stream';
      if (extension === '.m3u8') {
        contentType = 'application/vnd.apple.mpegurl';
      } else if (extension === '.ts') {
        contentType = 'video/mp2t';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // 1. Google Drive backed HLS lookup
      if (movie.storageProvider === 'google_drive' || movie.hlsFiles) {
        const filesMap = movie.hlsFiles instanceof Map ? Object.fromEntries(movie.hlsFiles) : movie.hlsFiles || {};
        const driveFileId = filesMap[safeFilename];

        if (driveFileId) {
          const stream = await storageProvider.getReadStream(driveFileId);
          stream.pipe(res);
          return;
        }
      }

      // 2. Local filesystem backed HLS
      const hlsDirectory = movie.hlsPath ? path.dirname(movie.hlsPath) : path.join(ENV.HLS_PATH, id);
      const filePath = path.join(hlsDirectory, safeFilename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ success: false, message: 'HLS file not found' });
        return;
      }

      const stream = await storageProvider.getReadStream(filePath);
      stream.pipe(res);
    } catch (error: any) {
      logger.error('HLS streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to stream HLS file' });
      }
    }
  };

  /**
   * GET /api/movies/:id/subtitles/:index
   * Serve extracted WebVTT subtitle from StorageProvider
   */
  static streamSubtitle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, index } = req.params;
      const subtitleIndex = Number(index);

      if (!Number.isInteger(subtitleIndex) || subtitleIndex < 0) {
        res.status(400).json({ success: false, message: 'Invalid subtitle index' });
        return;
      }

      const movie = await Movie.findById(id);
      if (!movie) {
        res.status(404).json({ success: false, message: 'Movie not found' });
        return;
      }

      const subtitle = movie.subtitles?.[subtitleIndex];
      if (!subtitle) {
        res.status(404).json({ success: false, message: 'Subtitle not found' });
        return;
      }

      const subtitleIdentifier = subtitle.driveFileId || subtitle.storageKey || subtitle.filePath;
      if (!subtitleIdentifier) {
        res.status(404).json({ success: false, message: 'This subtitle has not been extracted' });
        return;
      }

      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const stream = await storageProvider.getReadStream(subtitleIdentifier);
      stream.pipe(res);
    } catch (error: any) {
      logger.error('Subtitle streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to stream subtitle' });
      }
    }
  };
}
