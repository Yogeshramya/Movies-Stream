'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Film,
  UploadCloud,
  Tv,
  Clock,
  Sparkles,
  ChevronRight,
  HardDrive,
  Info,
} from 'lucide-react';
import MovieCard from '../components/MovieCard';
import { Movie, WatchHistoryItem, SystemStats } from '../types';
import { fetchMovies, fetchWatchHistory, fetchSystemStats, getThumbnailUrl } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { formatBytes, formatDuration, getResolutionColor } from '../lib/formatters';

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [moviesRes, historyRes, statsRes] = await Promise.all([
        fetchMovies({ limit: 12, sort: 'recent' }),
        fetchWatchHistory().catch(() => ({ success: false, history: [] })),
        fetchSystemStats().catch(() => null),
      ]);
      setMovies(moviesRes.movies || []);
      setHistory(historyRes.history || []);
      if (statsRes) setStats(statsRes);
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time socket events for new movies or updates
  useSocket({
    onMovieCreated: () => loadData(),
    onMovieReady: () => loadData(),
    onMovieDeleted: () => loadData(),
    onMovieUpdated: () => loadData(),
  });

  const featuredMovie = history[0]?.movie || movies[0];

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Hero Banner */}
      {featuredMovie ? (
        <div className="relative w-full h-[450px] sm:h-[500px] bg-slate-950 overflow-hidden border-b border-surface-border">
          {/* Background Poster / Thumbnail */}
          {featuredMovie.thumbnailPath ? (
            <img
              src={getThumbnailUrl(featuredMovie._id)}
              alt={featuredMovie.title}
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-40 blur-xs scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950" />
          )}

          {/* Gradient Shadows */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

          {/* Hero Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12 z-10">
            <div className="max-w-2xl flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  {history[0] ? 'Continue Watching' : 'Featured in Library'}
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getResolutionColor(
                    featuredMovie.resolution
                  )}`}
                >
                  {featuredMovie.resolution}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white line-clamp-2">
                {featuredMovie.title}
              </h1>

              <div className="flex items-center gap-4 text-xs sm:text-sm text-zinc-300 font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-sky-400" />
                  {formatDuration(featuredMovie.duration)}
                </span>
                <span>•</span>
                <span>{formatBytes(featuredMovie.fileSize)}</span>
                <span>•</span>
                <span className="font-mono uppercase text-zinc-400">
                  {featuredMovie.videoCodec} / {featuredMovie.audioCodec}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href={`/watch/${featuredMovie._id}`}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-sm shadow-xl shadow-sky-500/30 hover:brightness-110 active:scale-95 transition-all tv-focusable"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>{history[0] ? 'Resume Movie' : 'Watch Now'}</span>
                </Link>

                <Link
                  href={`/movies/${featuredMovie._id}`}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur-md border border-white/10 active:scale-95 transition-all tv-focusable"
                >
                  <Info className="w-4 h-4" />
                  <span>Details</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Banner */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-surface-border flex flex-col items-center justify-center text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 shadow-lg shadow-sky-500/20">
              <Film className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Your YR Stream Library is Empty</h2>
            <p className="text-sm text-zinc-400 max-w-md mb-6">
              Upload video files (up to 5GB+ MKV, MP4, WebM, MOV) from your PC or phone to immediately start streaming on your LG Smart TV.
            </p>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-sky-500/30 hover:brightness-110 active:scale-95 transition-all tv-focusable"
            >
              <UploadCloud className="w-5 h-5" />
              <span>Upload First Movie</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col gap-10">
        {/* Continue Watching Row */}
        {history.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-sky-400" />
                <h2 className="text-xl font-bold text-white">Continue Watching</h2>
              </div>
              <Link
                href="/history"
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {history.slice(0, 4).map((item) => (
                <MovieCard key={item._id} movie={item.movie} onUpdate={loadData} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Added Row */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-sky-400" />
              <h2 className="text-xl font-bold text-white">Recently Added</h2>
            </div>
            <Link
              href="/movies"
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              <span>Browse All Movies ({movies.length})</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {movies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {movies.map((movie) => (
                <MovieCard key={movie._id} movie={movie} onUpdate={loadData} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-surface rounded-2xl border border-surface-border text-zinc-400 text-sm">
              No movies uploaded yet.
            </div>
          )}
        </section>

        {/* LG TV Quick Connect Guide Banner */}
        {stats?.network && (
          <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-950/40 via-surface to-indigo-950/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                <Tv className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Watch on LG Smart TV (Jio Fiber LAN)</h3>
                <p className="text-xs sm:text-sm text-zinc-300 max-w-xl mt-0.5">
                  Open the built-in Web Browser on your LG TV and navigate to the address below. No apps or LG ThinQ needed!
                </p>
                <div className="mt-2 inline-flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-sky-500/30 font-mono text-sm font-bold text-sky-300 select-all">
                  <span>{stats.network.tvUrl}</span>
                </div>
              </div>
            </div>

            <Link
              href="/tv"
              className="px-5 py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-semibold text-sm border border-sky-500/40 flex items-center gap-2 shrink-0 tv-focusable"
            >
              <Tv className="w-4 h-4" />
              <span>Preview TV Mode</span>
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
