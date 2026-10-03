'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  Play,
  Clock,
  Heart,
  Film,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { Movie } from '../types';
import {
  formatBytes,
  formatDuration,
  getResolutionColor,
} from '../lib/formatters';

import {
  getThumbnailUrl,
  updateMovie,
} from '../lib/api';

interface MovieCardProps {
  movie: Movie;
  onUpdate?: () => void;
  tabIndex?: number;
}

export default function MovieCard({
  movie,
  onUpdate,
  tabIndex,
}: MovieCardProps) {
  const [isFavorite, setIsFavorite] =
    useState(movie.isFavorite);

  const [isTogglingFav, setIsTogglingFav] =
    useState(false);

  const [imgError, setImgError] =
    useState(false);

  /**
   * Keep local favorite state synchronized
   * when Socket.IO updates the movie.
   */
  useEffect(() => {
    setIsFavorite(movie.isFavorite);
  }, [movie.isFavorite]);

  const handleToggleFavorite = async (
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (isTogglingFav) return;

    try {
      setIsTogglingFav(true);

      const nextFav = !isFavorite;

      // Optimistic UI
      setIsFavorite(nextFav);

      await updateMovie(movie._id, {
        isFavorite: nextFav,
      });

      onUpdate?.();
    } catch (err) {
      console.error(
        'Failed to update favorite:',
        err
      );

      // Rollback
      setIsFavorite(!isFavorite);
    } finally {
      setIsTogglingFav(false);
    }
  };

  const isProcessing =
    movie.status === 'processing';

  const hasError =
    movie.status === 'error';

  const isReady =
    movie.status === 'ready';

  const hasThumbnail =
    Boolean(movie.thumbnailPath) &&
    !imgError;

  /**
   * ============================================================
   * PROCESSING PROGRESS
   * ============================================================
   */

  const processingProgress = Math.max(
    0,
    Math.min(
      100,
      Number(movie.processingProgress || 0)
    )
  );

  /**
   * ============================================================
   * PROCESSING MESSAGE
   * ============================================================
   */

  let processingMessage =
    'Preparing video...';

  if (processingProgress >= 70) {
    processingMessage =
      'Finalizing video...';
  } else if (processingProgress >= 40) {
    processingMessage =
      movie.transcodeNeeded
        ? 'Transcoding video...'
        : 'Generating thumbnail...';
  } else if (processingProgress >= 30) {
    processingMessage =
      'Reading media information...';
  }

  /**
   * ============================================================
   * ERROR MESSAGE
   * ============================================================
   */

  const errorMessage =
    movie.errorMessage ||
    'Unable to process this video.';

  return (
    <div
      className="
        group
        relative
        flex
        flex-col
        rounded-xl
        overflow-hidden
        bg-surface
        border
        border-surface-border
        hover:border-sky-500/40
        transition-all
        duration-300
        hover:shadow-xl
        hover:shadow-sky-950/20
        hover:-translate-y-1
      "
    >
      {/* ======================================================
          VIDEO THUMBNAIL
      ======================================================= */}

      <Link
        href={
          isProcessing || hasError
            ? '#'
            : `/movies/${movie._id}`
        }
        tabIndex={tabIndex ?? 0}
        className="
          block
          relative
          aspect-video
          w-full
          bg-slate-900
          overflow-hidden
          tv-focusable
        "
        onClick={(e) => {
          if (isProcessing || hasError) {
            e.preventDefault();
          }
        }}
      >
        {/* ====================================================
            THUMBNAIL
        ===================================================== */}

        {hasThumbnail ? (
          <img
            src={getThumbnailUrl(movie._id)}
            alt={movie.title}
            onError={() =>
              setImgError(true)
            }
            className="
              w-full
              h-full
              object-cover
              group-hover:scale-105
              transition-transform
              duration-500
            "
            loading="lazy"
          />
        ) : (
          <div
            className="
              w-full
              h-full
              flex
              flex-col
              items-center
              justify-center
              bg-gradient-to-br
              from-slate-900
              via-slate-800
              to-sky-950
              text-slate-500
              p-4
              text-center
            "
          >
            {isProcessing ? (
              <Loader2
                className="
                  w-9
                  h-9
                  text-sky-400
                  animate-spin
                  mb-3
                "
              />
            ) : hasError ? (
              <AlertCircle
                className="
                  w-10
                  h-10
                  text-red-400
                  mb-2
                "
              />
            ) : (
              <Film
                className="
                  w-10
                  h-10
                  text-slate-600
                  mb-2
                  group-hover:text-sky-400
                  transition-colors
                "
              />
            )}

            <span
              className="
                text-xs
                font-mono
                text-slate-400
                line-clamp-1
              "
            >
              {movie.title}
            </span>
          </div>
        )}

        {/* ====================================================
            GRADIENT
        ===================================================== */}

        <div
          className="
            absolute
            inset-0
            bg-gradient-to-t
            from-black/80
            via-transparent
            to-black/20
            opacity-80
            group-hover:opacity-60
            transition-opacity
          "
        />

        {/* ====================================================
            PROCESSING OVERLAY
        ===================================================== */}

        {isProcessing && (
          <div
            className="
              absolute
              inset-0
              bg-black/75
              flex
              flex-col
              items-center
              justify-center
              p-4
              text-center
              backdrop-blur-sm
            "
          >
            <Loader2
              className="
                w-8
                h-8
                text-sky-400
                animate-spin
                mb-3
              "
            />

            <span
              className="
                text-xs
                font-semibold
                text-white
              "
            >
              {processingMessage}
            </span>

            {/* Progress percentage */}
            <span
              className="
                text-lg
                font-bold
                text-sky-400
                mt-1
              "
            >
              {processingProgress}%
            </span>

            {/* Progress bar */}
            <div
              className="
                w-3/4
                bg-slate-800
                rounded-full
                h-2
                mt-2
                overflow-hidden
                border
                border-slate-700
              "
            >
              <div
                className="
                  bg-gradient-to-r
                  from-sky-400
                  to-indigo-500
                  h-full
                  transition-all
                  duration-500
                  ease-out
                "
                style={{
                  width: `${processingProgress}%`,
                }}
              />
            </div>

            {movie.transcodeNeeded && (
              <span
                className="
                  text-[10px]
                  text-zinc-400
                  mt-2
                "
              >
                Converting to LG-compatible MP4
              </span>
            )}
          </div>
        )}

        {/* ====================================================
            ERROR OVERLAY
        ===================================================== */}

        {hasError && (
          <div
            className="
              absolute
              inset-0
              bg-red-950/85
              flex
              flex-col
              items-center
              justify-center
              p-5
              text-center
            "
          >
            <AlertCircle
              className="
                w-8
                h-8
                text-red-400
                mb-2
              "
            />

            <span
              className="
                text-xs
                font-semibold
                text-red-200
              "
            >
              Processing Failed
            </span>

            <span
              className="
                text-[10px]
                text-red-300/80
                mt-1
                line-clamp-2
              "
            >
              {errorMessage}
            </span>
          </div>
        )}

        {/* ====================================================
            READY INDICATOR
        ===================================================== */}

        {isReady && (
          <div
            className="
              absolute
              top-2.5
              left-2.5
              flex
              items-center
              gap-1
              px-2
              py-1
              rounded-md
              bg-emerald-500/20
              border
              border-emerald-400/30
              backdrop-blur-md
            "
          >
            <CheckCircle2
              className="
                w-3
                h-3
                text-emerald-400
              "
            />

            <span
              className="
                text-[9px]
                font-bold
                uppercase
                tracking-wider
                text-emerald-300
              "
            >
              Ready
            </span>
          </div>
        )}

        {/* ====================================================
            QUICK PLAY
        ===================================================== */}

        {!isProcessing && !hasError && (
          <div
            className="
              absolute
              inset-0
              flex
              items-center
              justify-center
              opacity-0
              group-hover:opacity-100
              transition-opacity
              duration-200
              bg-black/40
              backdrop-blur-[2px]
            "
          >
            <div
              className="
                w-12
                h-12
                rounded-full
                bg-sky-500
                text-white
                flex
                items-center
                justify-center
                shadow-lg
                shadow-sky-500/40
                transform
                scale-90
                group-hover:scale-100
                transition-transform
              "
            >
              <Play
                className="
                  w-6
                  h-6
                  ml-1
                  fill-white
                "
              />
            </div>
          </div>
        )}

        {/* ====================================================
            RESOLUTION + FAVORITE
        ===================================================== */}

        <div
          className="
            absolute
            top-2.5
            left-2.5
            right-2.5
            flex
            items-center
            justify-end
          "
        >
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={isTogglingFav}
            className={`
              p-1.5
              rounded-full
              transition-colors
              backdrop-blur-md
              ${
                isFavorite
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-black/50 text-white/70 hover:text-white hover:bg-black/80'
              }
            `}
            title={
              isFavorite
                ? 'Remove Favorite'
                : 'Add to Favorites'
            }
          >
            <Heart
              className={`
                w-3.5
                h-3.5
                ${
                  isFavorite
                    ? 'fill-rose-400'
                    : ''
                }
              `}
            />
          </button>
        </div>

        {/* Resolution */}
        <div
          className="
            absolute
            bottom-10
            left-2.5
          "
        >
          <span
            className={`
              text-[10px]
              font-bold
              uppercase
              tracking-wider
              px-2
              py-0.5
              rounded-md
              border
              shadow-sm
              ${getResolutionColor(
                movie.resolution
              )}
            `}
          >
            {movie.resolution || 'HD'}
          </span>
        </div>

        {/* ====================================================
            DURATION + FILE SIZE
        ===================================================== */}

        <div
          className="
            absolute
            bottom-2
            left-2.5
            right-2.5
            flex
            items-center
            justify-between
            text-[11px]
            text-zinc-300
            font-medium
          "
        >
          <span
            className="
              flex
              items-center
              gap-1
              bg-black/60
              px-1.5
              py-0.5
              rounded
              backdrop-blur-sm
            "
          >
            <Clock
              className="
                w-3
                h-3
                text-sky-400
              "
            />

            {formatDuration(movie.duration)}
          </span>

          <span
            className="
              bg-black/60
              px-1.5
              py-0.5
              rounded
              backdrop-blur-sm
            "
          >
            {formatBytes(movie.fileSize)}
          </span>
        </div>

        {/* ====================================================
            WATCH PROGRESS
        ===================================================== */}

        {movie.watchProgress &&
          movie.watchProgress
            .progressPercentage > 0 && (
            <div
              className="
                absolute
                bottom-0
                left-0
                right-0
                h-1
                bg-slate-700/80
              "
            >
              <div
                className="
                  h-full
                  bg-sky-500
                "
                style={{
                  width: `${movie.watchProgress.progressPercentage}%`,
                }}
              />
            </div>
          )}
      </Link>

      {/* ======================================================
          CARD INFORMATION
      ======================================================= */}

      <div
        className="
          p-3.5
          flex
          flex-col
          justify-between
          flex-1
        "
      >
        <Link
          href={
            isProcessing || hasError
              ? '#'
              : `/movies/${movie._id}`
          }
          onClick={(e) => {
            if (
              isProcessing ||
              hasError
            ) {
              e.preventDefault();
            }
          }}
          className="
            font-semibold
            text-sm
            text-zinc-100
            hover:text-sky-400
            transition-colors
            line-clamp-1
            mb-1
          "
          title={movie.title}
        >
          {movie.title}
        </Link>

        {/* Processing status */}
        {isProcessing && (
          <div
            className="
              flex
              items-center
              justify-between
              text-[11px]
              mt-1
            "
          >
            <span
              className="
                text-sky-400
                font-medium
              "
            >
              Processing
            </span>

            <span
              className="
                text-zinc-500
                font-mono
              "
            >
              {processingProgress}%
            </span>
          </div>
        )}

        {/* Error status */}
        {hasError && (
          <span
            className="
              text-red-400
              text-[11px]
              mt-1
            "
          >
            Processing failed
          </span>
        )}

        {/* Ready information */}
        {!isProcessing &&
          !hasError && (
            <div
              className="
                flex
                items-center
                justify-between
                text-xs
                text-zinc-400
                mt-1
              "
            >
              <span
                className="
                  font-mono
                  text-[11px]
                  text-zinc-500
                  uppercase
                "
              >
                {movie.videoCodec ||
                  'unknown'}{' '}
                •{' '}
                {movie.audioCodec ||
                  'unknown'}
              </span>

              {movie.watchProgress ? (
                <span
                  className="
                    text-sky-400
                    font-medium
                    text-[11px]
                  "
                >
                  {movie.watchProgress.completed
                    ? 'Watched'
                    : `${movie.watchProgress.progressPercentage}% watched`}
                </span>
              ) : (
                <span
                  className="
                    text-zinc-500
                    text-[11px]
                  "
                >
                  Unwatched
                </span>
              )}
            </div>
          )}
      </div>
    </div>
  );
}