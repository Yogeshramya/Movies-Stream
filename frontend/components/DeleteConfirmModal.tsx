'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Movie } from '../types';
import { deleteMovie } from '../lib/api';

interface DeleteConfirmModalProps {
  movie: Movie;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteConfirmModal({
  movie,
  isOpen,
  onClose,
  onSuccess,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');
      await deleteMovie(movie._id);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete movie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-red-500/30 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Delete Movie?</h3>
            <p className="text-xs text-red-400">Permanent Action</p>
          </div>
        </div>

        <p className="text-sm text-zinc-300 mb-2">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-white">"{movie.title}"</span>?
        </p>
        <p className="text-xs text-zinc-400 mb-6">
          This will delete the database record, physical video file from disk, generated thumbnails, and watch history.
        </p>

        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/30 active:scale-95 transition-all flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
