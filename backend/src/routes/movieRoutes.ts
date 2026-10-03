import { Router } from 'express';
import { MovieController } from '../controllers/movieController';

const router = Router();

/**
 * Movie library
 */
router.get(
    '/',
    MovieController.getMovies
);

/**
 * HLS
 *
 * IMPORTANT:
 * These routes must come before /:id
 */
router.get(
    '/:id/hls/:filename',
    MovieController.streamHlsFile
);

/**
 * Extracted WebVTT subtitles
 */
router.get(
    '/:id/subtitles/:index',
    MovieController.streamSubtitle
);

/**
 * Movie information
 */
router.get(
    '/:id',
    MovieController.getMovieById
);

/**
 * Update movie
 */
router.patch(
    '/:id',
    MovieController.updateMovie
);

/**
 * Delete movie
 */
router.delete(
    '/:id',
    MovieController.deleteMovie
);

/**
 * MP4 / Range streaming fallback
 */
router.get(
    '/:id/stream',
    MovieController.streamMovie
);

/**
 * Thumbnail
 */
router.get(
    '/:id/thumbnail',
    MovieController.getThumbnail
);

export default router;