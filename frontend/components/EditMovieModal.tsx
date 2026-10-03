'use client';

import { useState } from 'react';
import { X, Edit3, Loader2 } from 'lucide-react';
import { Movie } from '../types';
import { updateMovie } from '../lib/api';

interface EditMovieModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Movie) => void;
}

export default function EditMovieModal({
  movie,
  isOpen,
  onClose,
  onSuccess,
}: EditMovieModalProps) {
  const [title, setTitle] = useState(movie.title);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      setError('');
      const res = await updateMovie(movie._id, { title: title.trim() });
      onSuccess(res.movie);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to rename movie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-surface-border shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Rename Movie</h3>
            <p className="text-xs text-zinc-400">Change the display title in your library</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Movie Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface border border-surface-border focus:border-sky-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
              placeholder="Enter movie title"
              required
              autoFocus
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="px-5 py-2 text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
