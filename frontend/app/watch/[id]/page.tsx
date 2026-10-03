'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Movie } from '../../../types';
import { fetchMovieById } from '../../../lib/api';
import VideoPlayer from '../../../components/VideoPlayer';
import { Loader2, Film } from 'lucide-react';

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const movieId = params.id as string;
  const forceStart = searchParams.get('start');

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetchMovieById(movieId);
        setMovie(res.movie);
      } catch (err) {
        console.error('Error loading movie for playback:', err);
      } finally {
        setLoading(false);
      }
    }
    if (movieId) load();
  }, [movieId]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
        <span className="text-xs font-mono text-zinc-400">Loading streaming session...</span>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center gap-4 text-center p-4">
        <Film className="w-12 h-12 text-zinc-600" />
        <h2 className="text-lg font-bold text-white">Movie Not Found</h2>
        <button
          onClick={() => router.push('/movies')}
          className="px-5 py-2 rounded-xl bg-sky-500 text-white text-xs font-semibold"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const initialPosition = forceStart === '0' ? 0 : movie.watchProgress?.position || 0;

  return <VideoPlayer movie={movie} initialPosition={initialPosition} />;
}
