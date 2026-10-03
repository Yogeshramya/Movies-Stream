import { Request, Response } from 'express';
import { WatchHistory } from '../models/WatchHistory';
import { Movie } from '../models/Movie';
import { logger } from '../utils/logger';

export class HistoryController {
  /**
   * GET /api/history
   * Retrieve watch history for continue watching
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = await WatchHistory.find()
        .populate('movieId')
        .sort({ lastWatchedAt: -1 })
        .limit(50)
        .lean();

      // Filter out orphaned records where movie was deleted
      const validHistory = history
        .filter((h) => h.movieId !== null)
        .map((h) => ({
          _id: h._id,
          movie: h.movieId,
          position: h.position,
          duration: h.duration,
          completed: h.completed,
          progressPercentage: h.progressPercentage,
          lastWatchedAt: h.lastWatchedAt,
        }));

      res.json({ success: true, history: validHistory });
    } catch (err: any) {
      logger.error('Error fetching watch history:', err.message);
      res.status(500).json({ error: 'Failed to fetch watch history' });
    }
  }

  /**
   * POST /api/history
   * Save or update watch position (called every few seconds from player)
   */
  static async updateHistory(req: Request, res: Response): Promise<void> {
    try {
      const { movieId, position, duration } = req.body;

      if (!movieId || position === undefined) {
        res.status(400).json({ error: 'Missing movieId or position' });
        return;
      }

      let movieDuration = duration;
      if (!movieDuration) {
        const movie = await Movie.findById(movieId);
        movieDuration = movie?.duration || 0;
      }

      let history = await WatchHistory.findOne({ movieId });

      if (history) {
        history.position = Math.floor(position);
        if (movieDuration > 0) history.duration = movieDuration;
        await history.save();
      } else {
        history = new WatchHistory({
          movieId,
          position: Math.floor(position),
          duration: movieDuration,
        });
        await history.save();
      }

      res.json({ success: true, history });
    } catch (err: any) {
      logger.error('Error updating watch history:', err.message);
      res.status(500).json({ error: 'Failed to update watch position' });
    }
  }

  /**
   * DELETE /api/history/:movieId
   * Clear specific or all watch history
   */
  static async deleteHistory(req: Request, res: Response): Promise<void> {
    try {
      const { movieId } = req.params;
      if (movieId === 'all') {
        await WatchHistory.deleteMany({});
        res.json({ success: true, message: 'All watch history cleared' });
      } else {
        await WatchHistory.deleteOne({ movieId });
        res.json({ success: true, message: 'Movie removed from watch history' });
      }
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete watch history' });
    }
  }
}
