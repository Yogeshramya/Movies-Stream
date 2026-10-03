'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Film, Loader2, UploadCloud } from 'lucide-react';
import MovieCard from '../../components/MovieCard';
import { Movie } from '../../types';
import { fetchMovies } from '../../lib/api';

export default function FavoritesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const res = await fetchMovies({ filter: 'favorites', limit: 50 });
      setMovies(res.movies || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
          <Heart className="w-5 h-5 fill-rose-400" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Favorite Movies</h1>
          <p className="text-xs text-zinc-400">Your bookmarked movies for quick access</p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <span className="text-sm text-zinc-400">Loading favorites...</span>
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie._id} movie={movie} onUpdate={loadFavorites} />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 rounded-3xl border border-surface-border text-center flex flex-col items-center justify-center my-8">
          <Heart className="w-12 h-12 text-zinc-600 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Favorite Movies Yet</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mb-6">
            Click the heart icon on any movie card to add it to your favorites list.
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
