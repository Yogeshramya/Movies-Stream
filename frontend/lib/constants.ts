export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'http://localhost:5000');

export const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'http://localhost:5000');

export const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB chunks for optimal TCP window and network throughput
export const UPLOAD_CONCURRENCY = 4; // 4 concurrent chunk upload streams in parallel

