'use client';

import { UploadCloud, ShieldCheck, Zap, HardDrive, Wifi } from 'lucide-react';
import ChunkUploader from '../../components/ChunkUploader';

export default function UploadPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex flex-col gap-8">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold mb-3">
          <Zap className="w-3.5 h-3.5" />
          <span>Local Gigabit Jio Fiber Transfer</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Upload Video Files
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2">
          Upload 4K & 1080p movie files up to 10 GB. Uploads are chunked and automatically resumable if interrupted.
        </p>
      </div>

      {/* Uploader Component */}
      <ChunkUploader />

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto w-full pt-4">
        <div className="glass-panel p-4 rounded-xl border border-surface-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white mb-0.5">Resumable Chunking</h4>
            <p className="text-[11px] text-zinc-400">
              Files are sliced into 10 MB chunks. If your network disconnects, resume without re-uploading from 0%.
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-surface-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white mb-0.5">Automatic FFmpeg Probe</h4>
            <p className="text-[11px] text-zinc-400">
              Detects codecs, resolutions, multi-audio streams, subtitles, and automatically captures snapshots.
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-surface-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white mb-0.5">Direct LAN Streaming</h4>
            <p className="text-[11px] text-zinc-400">
              Never touches external cloud servers. Zero ISP data consumed over your home Jio Fiber Wi-Fi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
