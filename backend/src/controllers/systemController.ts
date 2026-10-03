import { Request, Response } from 'express';
import si from 'systeminformation';
import { Movie } from '../models/Movie';
import { getLocalIPAddresses, getPrimaryLocalIP } from '../utils/networkUtils';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export class SystemController {
  /**
   * GET /api/system/stats
   * Provides real-time disk storage metrics, movie count, queue size, and LAN IPs
   */
  static async getSystemStats(req: Request, res: Response): Promise<void> {
    try {
      const [diskData, movieCount, processingCount, favoriteCount] = await Promise.all([
        si.fsSize().catch(() => []),
        Movie.countDocuments({}),
        Movie.countDocuments({ status: 'processing' }),
        Movie.countDocuments({ isFavorite: true }),
      ]);

      // Calculate primary disk space
      const mainDrive = diskData.find((d) => d.mount === '/' || d.mount.toLowerCase() === 'c:') || diskData[0] || {
        size: 0,
        used: 0,
        available: 0,
        use: 0,
        mount: 'C:',
      };

      // Calculate total storage of all movies in library
      const movies = await Movie.find({}, 'fileSize').lean();
      const totalMoviesSize = movies.reduce((acc, m) => acc + (m.fileSize || 0), 0);

      const localIPs = getLocalIPAddresses();
      const primaryIP = getPrimaryLocalIP();

      res.json({
        success: true,
        storage: {
          totalDiskBytes: mainDrive.size,
          usedDiskBytes: mainDrive.used,
          freeDiskBytes: mainDrive.available,
          diskUsagePercent: mainDrive.use,
          driveMount: mainDrive.mount,
          totalMoviesSizeBytes: totalMoviesSize,
        },
        library: {
          totalMovies: movieCount,
          processingMovies: processingCount,
          favoriteMovies: favoriteCount,
        },
        network: {
          primaryIP,
          port: ENV.PORT,
          frontendPort: 3000,
          tvUrl: `http://${primaryIP}:3000`,
          allInterfaces: localIPs,
        },
      });
    } catch (err: any) {
      logger.error('Error fetching system stats:', err.message);
      res.status(500).json({ error: 'Failed to retrieve system stats' });
    }
  }

  /**
   * GET /api/system/network
   * Quick endpoint for LG TV / Phone to verify network connectivity
   */
  static async getNetworkInfo(req: Request, res: Response): Promise<void> {
    const interfaces = getLocalIPAddresses();
    const primary = getPrimaryLocalIP();

    res.json({
      success: true,
      primaryIP: primary,
      tvUrl: `http://${primary}:3000`,
      interfaces,
    });
  }
}
