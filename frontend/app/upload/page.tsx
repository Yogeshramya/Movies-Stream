'use client';

import { UploadCloud, ShieldCheck, Zap, HardDrive, Wifi } from 'lucide-react';
import ChunkUploader from '../../components/ChunkUploader';

export default function UploadPage() {
  return (
    <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 pb-24 md:pb-16 w-full flex flex-col gap-6 sm:gap-8">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-semibold mb-3">
          <Zap className="w-3.5 h-3.5" />
          <span>High-Speed Cloud & Direct Streaming</span>
        </div>
        <h1 className="text-2xl sm:text-4xl 2xl:text-5xl font-extrabold text-white tracking-tight">
          Upload Video Files
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2">
          Upload 4K & 1080p movie files up to 20 GB. Uploads are chunked and automatically resumable if interrupted.
        </p>
      </div>

      {/* Uploader Component */}
      <ChunkUploader />

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4 max-w-4xl mx-auto w-full pt-2 sm:pt-4">
        <div className="glass-panel p-4 rounded-xl border border-surface-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Multi-Threaded Chunking</h4>
            <p className="text-[11px] text-zinc-400">
              Files are sliced and uploaded in parallel streams. If interrupted, seamlessly resume without starting over.
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-surface-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Automatic FFmpeg Probe</h4>
            <p className="text-[11px] text-zinc-400">
              Detects codecs, resolutions, audio streams, subtitles, and generates crisp high-def snapshots.
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-surface-border flex items-start gap-3 sm:col-span-2 md:col-span-1">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">Instant TV & Mobile Playback</h4>
            <p className="text-[11px] text-zinc-400">
              Stream directly in ultra-crisp resolution on your PC, Android / iOS mobile, and 43-inch Smart TV.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
