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
    <div className="min-h-screen bg-[#06080c] text-white p-6 sm:p-10 flex flex-col gap-10 select-none">
      {/* TV Header */}
      <div className="flex items-center justify-between border-b border-surface-border/60 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center">
            <Tv className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              YR STREAM <span className="text-xs bg-sky-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest text-black">TV MODE</span>
            </h1>
            <p className="text-xs text-zinc-400">Optimized for LG WebOS TV & Remote D-Pad Navigation</p>
          </div>
        </div>

        <Link
          href="/"
          tabIndex={1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-hover hover:bg-slate-800 text-zinc-300 border border-surface-border text-sm font-semibold tv-focusable"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit TV Mode</span>
        </Link>
      </div>

      {/* Continue Watching (Oversized Cards) */}
      {history.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-sky-400" />
            <span>Continue Watching</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                <div className="absolute bottom-3 left-4 right-4 flex flex-col gap-1">
                  <h3 className="font-bold text-base text-white line-clamp-1">{item.movie.title}</h3>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span className="text-sky-400 font-semibold">{item.progressPercentage}% Watched</span>
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
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Film className="w-6 h-6 text-sky-400" />
          <span>All Movies ({movies.length})</span>
        </h2>

        {movies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                <div className="absolute top-3 left-3">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${getResolutionColor(
                      movie.resolution
                    )}`}
                  >
                    {movie.resolution}
                  </span>
                </div>

                {/* Info Overlay */}
                <div className="absolute bottom-3 left-4 right-4 flex flex-col gap-0.5">
                  <h3 className="font-bold text-base text-white line-clamp-1">{movie.title}</h3>
                  <div className="flex items-center justify-between text-xs text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
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
