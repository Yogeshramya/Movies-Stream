export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationDetailed(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00:00';
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatBitrate(bps: number): string {
  if (!bps || bps <= 0) return 'Variable';
  const mbps = (bps / (1024 * 1024)).toFixed(1);
  return `${mbps} Mbps`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getResolutionColor(resolution: string): string {
  const r = (resolution || '').toLowerCase();
  if (r.includes('4k') || r.includes('uhd')) {
    return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  }
  if (r.includes('2k') || r.includes('qhd')) {
    return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
  }
  if (r.includes('1080p') || r.includes('fhd')) {
    return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  }
  if (r.includes('720p') || r.includes('hd')) {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  }
  return 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40';
}
