'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Play,
  RotateCcw,
  Heart,
  Edit3,
  Trash2,
  Clock,
  HardDrive,
  Tv,
  Film,
  Subtitles,
  Volume2,
  ArrowLeft,
  Calendar,
  Sparkles,
  Loader2,
  Activity,
} from 'lucide-react';
import { Movie } from '../../../types';
import { fetchMovieById, getThumbnailUrl, updateMovie } from '../../../lib/api';
import {
  formatBytes,
  formatDuration,
  formatDurationDetailed,
  formatDate,
  formatBitrate,
  getResolutionColor,
} from '../../../lib/formatters';
import EditMovieModal from '../../../components/EditMovieModal';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';

export default function MovieDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isTogglingFav, setIsTogglingFav] = useState(false);

  const loadMovie = async () => {
    try {
      setLoading(true);
      const res = await fetchMovieById(movieId);
      setMovie(res.movie);
    } catch (err) {
      console.error('Failed to load movie details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (movieId) loadMovie();
  }, [movieId]);

  const handleToggleFavorite = async () => {
    if (!movie || isTogglingFav) return;
    try {
      setIsTogglingFav(true);
      const nextFav = !movie.isFavorite;
      setMovie({ ...movie, isFavorite: nextFav });
      await updateMovie(movie._id, { isFavorite: nextFav });
    } catch (err) {
      setMovie(movie);
    } finally {
      setIsTogglingFav(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
        <span className="text-sm text-zinc-400">Loading movie details...</span>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 text-center glass-panel rounded-2xl border border-surface-border">
        <Film className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Movie Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">The requested movie does not exist or was deleted.</p>
        <button
          onClick={() => router.push('/movies')}
          className="px-5 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const hasWatchHistory = movie.watchProgress && movie.watchProgress.position > 10;

  return (
    <div className="flex flex-col pb-24 md:pb-16">
      {/* Backdrop Header */}
      <div className="relative w-full h-[360px] sm:h-[450px] lg:h-[500px] 2xl:h-[600px] bg-slate-950 overflow-hidden border-b border-surface-border">
        {movie.thumbnailPath ? (
          <img
            src={getThumbnailUrl(movie._id)}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover object-center filter brightness-35 blur-xs scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

        <div className="relative max-w-7xl 2xl:max-w-[1800px] mx-auto px-3.5 sm:px-6 lg:px-8 h-full flex flex-col justify-between py-4 sm:py-6 z-10">
          {/* Back button */}
          <div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-zinc-300 hover:text-white bg-black/40 hover:bg-black/70 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl backdrop-blur-md border border-white/10 text-xs sm:text-sm font-medium transition-all tv-focusable"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          {/* Title & Play Controls */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${getResolutionColor(
                  movie.resolution
                )}`}
              >
                {movie.resolution}
              </span>
              <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300 backdrop-blur-sm border border-white/10">
                {movie.videoCodec.toUpperCase()} • {movie.audioCodec.toUpperCase()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl 2xl:text-5xl font-black text-white tracking-tight line-clamp-2">
              {movie.title}
            </h1>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 sm:pt-3">
              {/* Play / Resume */}
              <Link
                href={`/watch/${movie._id}`}
                className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-xs sm:text-sm 2xl:text-base shadow-xl shadow-sky-500/30 hover:brightness-110 active:scale-95 transition-all tv-focusable"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                <span>{hasWatchHistory ? 'Resume Play' : 'Play'}</span>
              </Link>

              {/* Start from beginning if resume exists */}
              {hasWatchHistory && (
                <Link
                  href={`/watch/${movie._id}?start=0`}
                  className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-surface-hover hover:bg-slate-800 text-zinc-200 font-semibold text-xs sm:text-sm border border-surface-border active:scale-95 transition-all tv-focusable"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Start from Beginning</span>
                </Link>
              )}

              {/* Favorite Button */}
              <button
                onClick={handleToggleFavorite}
                className={`p-2.5 sm:p-3 rounded-xl backdrop-blur-md border transition-all active:scale-95 tv-focusable ${
                  movie.isFavorite
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-black/40 text-zinc-300 hover:text-white border-white/10 hover:bg-black/60'
                }`}
                title={movie.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${movie.isFavorite ? 'fill-rose-400' : ''}`} />
              </button>

              {/* Rename Button */}
              <button
                onClick={() => setIsEditOpen(true)}
                className="p-2.5 sm:p-3 rounded-xl bg-black/40 hover:bg-black/60 text-zinc-300 hover:text-white border border-white/10 backdrop-blur-md transition-all active:scale-95 tv-focusable"
                title="Rename Movie"
              >
                <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => setIsDeleteOpen(true)}
                className="p-2.5 sm:p-3 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-500/30 backdrop-blur-md transition-all active:scale-95 tv-focusable"
                title="Delete Movie"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details & Specs Grid */}
      <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-3.5 sm:px-6 lg:px-8 w-full mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Columns: Media Specs & Streams */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Watch Progress Card */}
          {movie.watchProgress && (
            <div className="glass-panel p-5 rounded-2xl border border-surface-border flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-400 block mb-1">Watch Progress</span>
                <span className="font-mono text-sm text-white">
                  {formatDurationDetailed(movie.watchProgress.position)} / {formatDurationDetailed(movie.duration)} ({movie.watchProgress.progressPercentage}%)
                </span>
              </div>
              <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-sky-500 h-full"
                  style={{ width: `${movie.watchProgress.progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Technical Specifications */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-surface-border flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <span>Technical Media Specifications</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-surface p-3.5 rounded-xl border border-surface-border">
                <span className="text-xs text-zinc-500 block mb-1">Resolution</span>
                <span className="font-mono font-semibold text-sm text-white">
                  {movie.width > 0 ? `${movie.width} × ${movie.height}` : movie.resolution}
                </span>
              </div>

              <div className="bg-surface p-3.5 rounded-xl border border-surface-border">
                <span className="text-xs text-zinc-500 block mb-1">Video Codec</span>
                <span className="font-mono font-semibold text-sm text-sky-300 uppercase">
                  {movie.videoCodec} ({movie.fps > 0 ? `${movie.fps} FPS` : 'N/A'})
                </span>
              </div>

              <div className="bg-surface p-3.5 rounded-xl border border-surface-border">
                <span className="text-xs text-zinc-500 block mb-1">Audio Codec</span>
                <span className="font-mono font-semibold text-sm text-indigo-300 uppercase">
                  {movie.audioCodec}
                </span>
              </div>

              <div className="bg-surface p-3.5 rounded-xl border border-surface-border">
                <span className="text-xs text-zinc-500 block mb-1">Duration</span>
                <span className="font-mono font-semibold text-sm text-white">
                  {formatDuration(movie.duration)} ({Math.round(movie.duration)}s)
                </span>
              </div>

              <div className="bg-surface p-3.5 rounded-xl border border-surface-border">
                <span className="text-xs text-zinc-500 block mb-1">File Size</span>
                <span className="font-mono font-semibold text-sm text-white">
                  {formatBytes(movie.fileSize)}
                </span>
              </div>

              <div className="bg-surface p-3.5 rounded-xl border border-surface-border">
                <span className="text-xs text-zinc-500 block mb-1">Bitrate</span>
                <span className="font-mono font-semibold text-sm text-white">
                  {formatBitrate(movie.bitrate)}
                </span>
              </div>
            </div>
          </div>

          {/* Audio Tracks & Subtitles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Audio Streams */}
            <div className="glass-panel p-5 rounded-2xl border border-surface-border">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4 text-sky-400" />
                <span>Audio Streams ({movie.audioTracks.length || 1})</span>
              </h3>
              <div className="flex flex-col gap-2">
                {movie.audioTracks.length > 0 ? (
                  movie.audioTracks.map((track, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-surface-border text-xs"
                    >
                      <span className="font-semibold text-zinc-200">{track.title}</span>
                      <span className="font-mono text-zinc-400 uppercase">
                        {track.codec} • {track.channels}ch
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 rounded-lg bg-surface border border-surface-border text-xs text-zinc-400">
                    Default Stereo Audio ({movie.audioCodec.toUpperCase()})
                  </div>
                )}
              </div>
            </div>

            {/* Subtitles */}
            <div className="glass-panel p-5 rounded-2xl border border-surface-border">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Subtitles className="w-4 h-4 text-sky-400" />
                <span>Subtitles ({movie.subtitles.length})</span>
              </h3>
              <div className="flex flex-col gap-2">
                {movie.subtitles.length > 0 ? (
                  movie.subtitles.map((sub, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-surface-border text-xs"
                    >
                      <span className="font-semibold text-zinc-200">{sub.label}</span>
                      <span className="font-mono text-sky-400 uppercase">{sub.format}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-2.5 rounded-lg bg-surface border border-surface-border text-xs text-zinc-400">
                    No external subtitles detected
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: File Information */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-surface-border flex flex-col gap-4">
            <h3 className="font-bold text-white text-base">File & Storage Information</h3>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block mb-0.5">Physical Filename</span>
                <span className="font-mono text-zinc-300 break-all">{movie.filename}</span>
              </div>

              <div>
                <span className="text-zinc-500 block mb-0.5">Original Name</span>
                <span className="font-mono text-zinc-300 break-all">{movie.originalFilename}</span>
              </div>

              <div>
                <span className="text-zinc-500 block mb-0.5">Date Uploaded</span>
                <span className="text-zinc-300">{formatDate(movie.createdAt)}</span>
              </div>

              <div>
                <span className="text-zinc-500 block mb-0.5">Streaming Engine</span>
                <span className="text-emerald-400 font-semibold">
                  HTTP 206 Partial Content (Zero-buffer range streaming)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditMovieModal
        movie={movie}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={(updated) => setMovie(updated)}
      />

      <DeleteConfirmModal
        movie={movie}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={() => router.push('/movies')}
      />
    </div>
  );
}
