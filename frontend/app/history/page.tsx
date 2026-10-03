'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History, Trash2, Play, Clock, Film, Loader2, RotateCcw } from 'lucide-react';
import { WatchHistoryItem } from '../../types';
import { fetchWatchHistory, deleteHistory, getThumbnailUrl } from '../../lib/api';
import { formatBytes, formatDuration, formatDurationDetailed, formatDate } from '../../lib/formatters';

export default function HistoryPage() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetchWatchHistory();
      setHistory(res.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear your entire watch history?')) return;
    try {
      await deleteHistory('all');
      setHistory([]);
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  const handleRemoveItem = async (movieId: string) => {
    try {
      await deleteHistory(movieId);
      setHistory((prev) => prev.filter((item) => item.movie?._id !== movieId));
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  return (
    <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-16 w-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 2xl:w-12 2xl:h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <History className="w-5 h-5 2xl:w-6 2xl:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl 2xl:text-4xl font-extrabold text-white">Continue Watching</h1>
            <p className="text-xs sm:text-sm text-zinc-400">Pick up right where you left off on any device</p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All History</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <span className="text-sm text-zinc-400">Loading history...</span>
        </div>
      ) : history.length > 0 ? (
        <div className="flex flex-col gap-3.5 sm:gap-4">
          {history.map((item) => {
            if (!item.movie) return null;
            return (
              <div
                key={item._id}
                className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-surface-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4 hover:border-sky-500/40 transition-all group"
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
                  {/* Thumbnail */}
                  <div className="relative w-28 sm:w-36 2xl:w-44 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0">
                    {item.movie.thumbnailPath ? (
                      <img
                        src={getThumbnailUrl(item.movie._id)}
                        alt={item.movie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Film className="w-6 h-6 text-slate-600" />
                      </div>
                    )}
                    {/* Mini Progress */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                      <div
                        className="h-full bg-sky-500"
                        style={{ width: `${item.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-col gap-0.5 sm:gap-1 flex-1 min-w-0">
                    <Link
                      href={`/movies/${item.movie._id}`}
                      className="font-bold text-white text-sm sm:text-base 2xl:text-lg hover:text-sky-400 transition-colors line-clamp-1"
                    >
                      {item.movie.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs text-zinc-400 font-mono">
                      <span className="text-sky-400 font-semibold">
                        {formatDurationDetailed(item.position)} / {formatDurationDetailed(item.duration)}
                      </span>
                      <span>•</span>
                      <span>{item.progressPercentage}% watched</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{formatDate(item.lastWatchedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-border/50">
                  <Link
                    href={`/watch/${item.movie._id}`}
                    className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-sky-500/20 active:scale-95 transition-all tv-focusable"
                  >
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                    <span>Resume</span>
                  </Link>

                  <button
                    onClick={() => handleRemoveItem(item.movie._id)}
                    className="p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-white/10 transition-colors"
                    title="Remove from history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-surface-border text-center flex flex-col items-center justify-center my-8">
          <Clock className="w-12 h-12 text-zinc-600 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Watch History</h3>
          <p className="text-xs sm:text-sm text-zinc-400 mb-6">
            When you watch movies from your library, your playback position is automatically saved here.
          </p>
          <Link
            href="/movies"
            className="px-5 py-2.5 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition-colors"
          >
            Browse Movies
          </Link>
        </div>
      )}
    </div>
  );
}
