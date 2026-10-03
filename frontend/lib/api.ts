import { API_BASE_URL } from './constants';
import { Movie, WatchHistoryItem, SystemStats } from '../types';

export interface MoviesResponse {
  success: boolean;
  movies: Movie[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchMovies(params?: {
  search?: string;
  sort?: string;
  filter?: string;
  page?: number;
  limit?: number;
}): Promise<MoviesResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.sort) query.append('sort', params.sort);
  if (params?.filter) query.append('filter', params.filter);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE_URL}/api/movies?${query.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch movies: ${res.statusText}`);
  return res.json();
}

export async function fetchMovieById(id: string): Promise<{ success: boolean; movie: Movie }> {
  const res = await fetch(`${API_BASE_URL}/api/movies/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Movie not found: ${res.statusText}`);
  return res.json();
}

export async function updateMovie(
  id: string,
  data: { title?: string; isFavorite?: boolean }
): Promise<{ success: boolean; movie: Movie }> {
  const res = await fetch(`${API_BASE_URL}/api/movies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update movie: ${res.statusText}`);
  return res.json();
}

export async function deleteMovie(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/movies/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete movie: ${res.statusText}`);
  return res.json();
}

export async function fetchWatchHistory(): Promise<{ success: boolean; history: WatchHistoryItem[] }> {
  const res = await fetch(`${API_BASE_URL}/api/history`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch watch history: ${res.statusText}`);
  return res.json();
}

export async function saveWatchProgress(
  movieId: string,
  position: number,
  duration: number
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movieId, position, duration }),
  });
  return res.json();
}

export async function deleteHistory(movieId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/history/${movieId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function fetchSystemStats(): Promise<SystemStats> {
  const res = await fetch(`${API_BASE_URL}/api/system/stats`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch system stats`);
  return res.json();
}

export function getStreamUrl(movieId: string): string {
  return `${API_BASE_URL}/api/movies/${movieId}/stream`;
}

export function getThumbnailUrl(movieId: string): string {
  return `${API_BASE_URL}/api/movies/${movieId}/thumbnail`;
}
