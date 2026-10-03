'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Film,
  Search,
  UploadCloud,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

import MovieCard from '../../components/MovieCard';
import { Movie } from '../../types';
import { fetchMovies } from '../../lib/api';
import { useSocket } from '../../hooks/useSocket';

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [filter, setFilter] = useState('all');

  const [totalCount, setTotalCount] = useState(0);

  /**
   * Load library from MongoDB.
   *
   * This remains the source of truth when the page first opens.
   * Socket.IO is then used for incremental real-time updates.
   */
  const loadMovies = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetchMovies({
        search,
        sort,
        filter,
        limit: 48,
      });

      setMovies(res.movies || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching movie library:', err);
    } finally {
      setLoading(false);
    }
  }, [search, sort, filter]);

  /**
   * Initial library load + reload when
   * search/filter/sort changes.
   */
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadMovies();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadMovies]);

  /**
   * ============================================================
   * REAL-TIME MOVIE EVENTS
   * ============================================================
   */

  const handleMovieCreated = useCallback((movie: Movie) => {
    console.log('[MOVIES] movie:created', movie);

    setMovies((current) => {
      const exists = current.some(
        (item) => item._id === movie._id
      );

      if (exists) {
        return current.map((item) =>
          item._id === movie._id
            ? { ...item, ...movie }
            : item
        );
      }

      return [movie, ...current];
    });

    setTotalCount((count) => count + 1);
  }, []);

  const handleMovieProcessing = useCallback(
    (data: { movieId: string; progress?: number }) => {
      console.log('[MOVIES] movie:processing', data);

      setMovies((current) =>
        current.map((movie) =>
          movie._id === data.movieId
            ? {
                ...movie,
                status: 'processing',
                processingProgress:
                  data.progress ??
                  movie.processingProgress ??
                  10,
              }
            : movie
        )
      );
    },
    []
  );

  const handleMovieProcessingProgress = useCallback(
    (data: {
      movieId: string;
      progress?: number;
      transcode?: boolean;
    }) => {
      console.log(
        '[MOVIES] movie:processing-progress',
        data
      );

      setMovies((current) =>
        current.map((movie) =>
          movie._id === data.movieId
            ? {
                ...movie,
                status: 'processing',
                processingProgress:
                  data.progress ??
                  movie.processingProgress ??
                  0,
              }
            : movie
        )
      );
    },
    []
  );

  const handleMovieReady = useCallback((movie: Movie) => {
    console.log('[MOVIES] movie:ready', movie);

    setMovies((current) => {
      const exists = current.some(
        (item) => item._id === movie._id
      );

      if (!exists) {
        return [movie, ...current];
      }

      return current.map((item) =>
        item._id === movie._id
          ? { ...item, ...movie }
          : item
      );
    });
  }, []);

  const handleMovieError = useCallback(
    (data: Movie | { movieId: string; errorMessage?: string }) => {
      console.error('[MOVIES] movie:error', data);

      const movieId =
        'movieId' in data ? data.movieId : data._id;

      const errorMessage =
        'errorMessage' in data
          ? data.errorMessage
          : data.errorMessage;

      setMovies((current) =>
        current.map((movie) =>
          movie._id === movieId
            ? {
                ...movie,
                status: 'error',
                errorMessage:
                  errorMessage || 'Processing failed',
              }
            : movie
        )
      );
    },
    []
  );

  const handleMovieDeleted = useCallback(
    (movieId: string | { movieId: string }) => {
      const id =
        typeof movieId === 'string'
          ? movieId
          : movieId.movieId;

      console.log('[MOVIES] movie:deleted', id);

      setMovies((current) =>
        current.filter((movie) => movie._id !== id)
      );

      setTotalCount((count) =>
        Math.max(0, count - 1)
      );
    },
    []
  );

  const handleMovieUpdated = useCallback((movie: Movie) => {
    console.log('[MOVIES] movie:updated', movie);

    setMovies((current) =>
      current.map((item) =>
        item._id === movie._id
          ? { ...item, ...movie }
          : item
      )
    );
  }, []);

  /**
   * ============================================================
   * SOCKET CONNECTION
   * ============================================================
   */

  useSocket({
    onMovieCreated: handleMovieCreated,
    onMovieProcessing: handleMovieProcessing,
    onMovieProcessingProgress:
      handleMovieProcessingProgress,
    onMovieReady: handleMovieReady,
    onMovieError: handleMovieError,
    onMovieDeleted: handleMovieDeleted,
    onMovieUpdated: handleMovieUpdated,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

        <div>
          <div className="flex items-center gap-2">
            <Film className="w-6 h-6 text-sky-400" />

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Movie Library
            </h1>
          </div>

          <p className="text-xs text-zinc-400 mt-0.5">
            {totalCount}{' '}
            {totalCount === 1 ? 'movie' : 'movies'} available
            for local streaming
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search title, codec, 4K..."
              className="w-full bg-surface border border-surface-border focus:border-sky-400 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-none transition-colors"
            />
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value)
            }
            className="bg-surface border border-surface-border text-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="all">
              All Movies
            </option>

            <option value="favorites">
              Favorites Only
            </option>

            <option value="ready">
              Ready to Stream
            </option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value)
            }
            className="bg-surface border border-surface-border text-zinc-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="recent">
              Recently Added
            </option>

            <option value="title-asc">
              Title (A - Z)
            </option>

            <option value="title-desc">
              Title (Z - A)
            </option>

            <option value="duration-desc">
              Longest Duration
            </option>

            <option value="duration-asc">
              Shortest Duration
            </option>

            <option value="size-desc">
              Largest File Size
            </option>

            <option value="size-asc">
              Smallest File Size
            </option>
          </select>
        </div>
      </div>

      {/* Movie Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />

          <span className="text-sm text-zinc-400">
            Loading library...
          </span>
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">

          {movies.map((movie) => (
            <MovieCard
              key={movie._id}
              movie={movie}
              onUpdate={loadMovies}
            />
          ))}

        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl border border-surface-border flex flex-col items-center justify-center text-center my-8">

          <Film className="w-12 h-12 text-zinc-600 mb-3" />

          <h3 className="text-lg font-bold text-white mb-1">
            No Movies Found
          </h3>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mb-6">
            {search
              ? `No movies matched your search query "${search}". Try adjusting your filters.`
              : 'You have not uploaded any movies to your server yet.'}
          </p>

          <Link
            href="/upload"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-sky-500/20"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload a Video</span>
          </Link>
        </div>
      )}
    </div>
  );
}