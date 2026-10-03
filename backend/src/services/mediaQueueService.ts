import { Movie, IMovie } from '../models/Movie';
import { FFmpegService } from './ffmpegService';
import { logger } from '../utils/logger';
import { ENV } from '../config/env';
import { emitEvent } from '../sockets/socketHandler';

interface QueueItem {
  movieId: string;
  tempLocalOriginalPath?: string;
}

export class MediaQueueService {
  private static queue: QueueItem[] = [];
  private static activeWorkers = 0;
  private static processingMovieIds = new Set<string>();

  /**
   * Enqueue a movie for background media processing
   */
  static enqueue(movieId: string, tempLocalOriginalPath?: string): void {
    if (this.processingMovieIds.has(movieId)) {
      logger.info(`[MEDIA QUEUE] Movie ${movieId} is already queued or processing`);
      return;
    }

    this.processingMovieIds.add(movieId);
    this.queue.push({ movieId, tempLocalOriginalPath });
    logger.info(`[MEDIA QUEUE] Enqueued movie ${movieId}. Queue length: ${this.queue.length}`);

    this.processNext();
  }

  /**
   * Process next item in queue if worker concurrency allows
   */
  private static async processNext(): Promise<void> {
    const concurrency = Math.max(1, ENV.MEDIA_WORKER_CONCURRENCY || 1);

    if (this.activeWorkers >= concurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeWorkers++;

    try {
      logger.ffmpeg(`[MEDIA WORKER] Starting processing for movie [${item.movieId}] (Active workers: ${this.activeWorkers}/${concurrency})`);
      await FFmpegService.processMediaInBackground(item.movieId, item.tempLocalOriginalPath);
    } catch (err: any) {
      logger.error(`[MEDIA WORKER] Unhandled error processing movie [${item.movieId}]:`, err.message);
    } finally {
      this.activeWorkers--;
      this.processingMovieIds.delete(item.movieId);
      this.processNext();
    }
  }

  /**
   * Recover any unfinished processing jobs on server startup
   */
  static async recoverPendingJobs(): Promise<void> {
    try {
      const unfinishedMovies = await Movie.find({
        status: 'processing',
      });

      if (unfinishedMovies.length > 0) {
        logger.info(`[MEDIA RECOVERY] Found ${unfinishedMovies.length} unfinished processing movie(s). Requeuing for processing...`);

        for (const movie of unfinishedMovies) {
          emitEvent('movie:processing', {
            movieId: movie._id,
            progress: movie.processingProgress || 10,
            message: 'Resuming processing after server restart...',
          });
          this.enqueue(movie._id.toString());
        }
      }
    } catch (err: any) {
      logger.error('[MEDIA RECOVERY] Failed to recover pending jobs:', err.message);
    }
  }
}
