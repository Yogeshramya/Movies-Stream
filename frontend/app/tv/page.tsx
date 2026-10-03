'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tv, Play, Clock, Film, Sparkles, ArrowLeft } from 'lucide-react';
import { Movie, WatchHistoryItem } from '../../types';
import { fetchMovies, fetchWatchHistory, getThumbnailUrl } from '../../lib/api';
import { formatBytes, formatDuration, getResolutionColor } from '../../lib/formatters';

export default function TVModePage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const firstFocusRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [mRes, hRes] = await Promise.all([
          fetchMovies({ limit: 40, sort: 'recent' }),
          fetchWatchHistory().catch(() => ({ success: false, history: [] })),
        ]);
        setMovies(mRes.movies || []);
        setHistory(hRes.history || []);
      } catch (err) {
        console.error('Error loading TV mode data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Auto-focus the first movie card for LG Remote navigation
  useEffect(() => {
    if (!loading && firstFocusRef.current) {
      firstFocusRef.current.focus();
    }
  }, [loading]);

  return (
    <div className="min-h-screen bg-[#06080c] text-white p-4 sm:p-8 2xl:p-12 pb-24 md:pb-12 flex flex-col gap-8 sm:gap-10 select-none max-w-[2200px] mx-auto w-full">
      {/* TV Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border/60 pb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 2xl:w-16 2xl:h-16 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center shrink-0">
            <Tv className="w-6 h-6 sm:w-7 sm:h-7 2xl:w-9 2xl:h-9" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl 2xl:text-4xl font-black tracking-tight text-white flex items-center gap-2">
              YR STREAM <span className="text-[10px] sm:text-xs bg-sky-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest text-black">TV MODE</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">Optimized for LG WebOS TV & Remote D-Pad Navigation</p>
          </div>
        </div>

        <Link
          href="/"
          tabIndex={1}
          className="self-start sm:self-auto flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-surface-hover hover:bg-slate-800 text-zinc-300 border border-surface-border text-xs sm:text-sm font-semibold tv-focusable"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit TV Mode</span>
        </Link>
      </div>

      {/* Continue Watching (Oversized Cards) */}
      {history.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl sm:text-2xl 2xl:text-3xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
            <span>Continue Watching</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
            {history.map((item, idx) => (
              <Link
                key={item._id}
                ref={idx === 0 ? firstFocusRef : undefined}
                href={`/watch/${item.movie._id}`}
                tabIndex={idx + 2}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-surface border-2 border-surface-border hover:border-sky-400 transition-all duration-300 aspect-video tv-focusable"
              >
                {item.movie.thumbnailPath ? (
                  <img
                    src={getThumbnailUrl(item.movie._id)}
                    alt={item.movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <Film className="w-10 h-10 text-slate-700" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-800">
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${item.progressPercentage}%` }}
                  />
                </div>

                {/* Info Overlay */}
                <div className="absolute bottom-3 left-3 sm:left-4 right-3 sm:right-4 flex flex-col gap-0.5 sm:gap-1">
                  <h3 className="font-bold text-xs sm:text-base 2xl:text-lg text-white line-clamp-1">{item.movie.title}</h3>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-zinc-300 font-mono">
                    <span className="text-sky-400 font-semibold">{item.progressPercentage}%</span>
                    <span>{formatDuration(item.position)} / {formatDuration(item.duration)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All Movies (Large TV Grid) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl sm:text-2xl 2xl:text-3xl font-black text-white flex items-center gap-2">
          <Film className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
          <span>All Movies ({movies.length})</span>
        </h2>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
            {movies.map((movie, idx) => (
              <Link
                key={movie._id}
                ref={history.length === 0 && idx === 0 ? firstFocusRef : undefined}
                href={`/watch/${movie._id}`}
                tabIndex={idx + history.length + 2}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-surface border-2 border-surface-border hover:border-sky-400 transition-all duration-300 aspect-video tv-focusable"
              >
                {movie.thumbnailPath ? (
                  <img
                    src={getThumbnailUrl(movie._id)}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <Film className="w-10 h-10 text-slate-700" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Resolution Badge */}
                <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3">
                  <span
                    className={`text-[9px] sm:text-xs font-bold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-md border ${getResolutionColor(
                      movie.resolution
                    )}`}
                  >
                    {movie.resolution}
                  </span>
                </div>

                {/* Info Overlay */}
                <div className="absolute bottom-3 left-3 sm:left-4 right-3 sm:right-4 flex flex-col gap-0.5">
                  <h3 className="font-bold text-xs sm:text-base 2xl:text-lg text-white line-clamp-1">{movie.title}</h3>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs text-zinc-300 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400" />
                      {formatDuration(movie.duration)}
                    </span>
                    <span>{formatBytes(movie.fileSize)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-zinc-400 text-base">
            No movies uploaded yet.
          </div>
        )}
      </section>
    </div>
  );
}
