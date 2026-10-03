'use client';

import { useEffect, useState } from 'react';
import {
  HardDrive,
  Wifi,
  Tv,
  Film,
  Database,
  Check,
  Copy,
  Activity,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { SystemStats } from '../../types';
import { fetchSystemStats } from '../../lib/api';
import { formatBytes } from '../../lib/formatters';

export default function SettingsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchSystemStats();
        setStats(data);
      } catch (err) {
        console.error('Error loading system stats:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        <span className="text-sm text-zinc-400">Loading system metrics...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-16 w-full flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Storage & Network</h1>
            <p className="text-xs text-zinc-400">
              Manage local disk space, inspect network status, and configure LG Smart TV connection
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Storage & Library Breakdown */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Storage Capacity Gauge */}
          {stats?.storage && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-surface-border flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HardDrive className="w-6 h-6 text-sky-400" />
                  <h2 className="text-lg font-bold text-white">
                    Disk Storage ({stats.storage.driveMount})
                  </h2>
                </div>
                <span className="font-mono text-sm text-sky-400 font-semibold">
                  {stats.storage.diskUsagePercent}% Used
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 h-full transition-all duration-500"
                  style={{ width: `${stats.storage.diskUsagePercent}%` }}
                />
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-surface p-4 rounded-xl border border-surface-border">
                  <span className="text-xs text-zinc-400 block mb-1">Total Disk Space</span>
                  <span className="font-mono font-bold text-base text-white">
                    {formatBytes(stats.storage.totalDiskBytes)}
                  </span>
                </div>

                <div className="bg-surface p-4 rounded-xl border border-surface-border">
                  <span className="text-xs text-zinc-400 block mb-1">Free Available</span>
                  <span className="font-mono font-bold text-base text-emerald-400">
                    {formatBytes(stats.storage.freeDiskBytes)}
                  </span>
                </div>

                <div className="bg-surface p-4 rounded-xl border border-surface-border col-span-2 sm:col-span-1">
                  <span className="text-xs text-zinc-400 block mb-1">Used Space</span>
                  <span className="font-mono font-bold text-base text-zinc-200">
                    {formatBytes(stats.storage.usedDiskBytes)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-300 flex items-center justify-between">
                <span>Total Movie Files in YR Stream:</span>
                <span className="font-mono font-bold text-white">
                  {formatBytes(stats.storage.totalMoviesSizeBytes)}
                </span>
              </div>
            </div>
          )}

          {/* Library Counts */}
          {stats?.library && (
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-surface-border text-center">
                <Film className="w-6 h-6 text-sky-400 mx-auto mb-2" />
                <span className="text-2xl font-black text-white block">
                  {stats.library.totalMovies}
                </span>
                <span className="text-xs text-zinc-400">Total Movies</span>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-surface-border text-center">
                <Layers className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <span className="text-2xl font-black text-white block">
                  {stats.library.processingMovies}
                </span>
                <span className="text-xs text-zinc-400">Processing Queue</span>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-surface-border text-center">
                <Sparkles className="w-6 h-6 text-rose-400 mx-auto mb-2" />
                <span className="text-2xl font-black text-white block">
                  {stats.library.favoriteMovies}
                </span>
                <span className="text-xs text-zinc-400">Favorites</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Local Network & LG Smart TV setup */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-surface-border flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Tv className="w-6 h-6 text-sky-400" />
              <h2 className="text-lg font-bold text-white">LG Smart TV Setup</h2>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              To watch movies on your LG Smart TV, ensure your PC and TV are connected to the same{' '}
              <strong className="text-white">Jio Fiber Wi-Fi network</strong>.
            </p>

            {/* Quick URL Box */}
            {stats?.network && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-400">Type this URL in LG TV Browser:</span>
                <div className="flex items-center gap-2 bg-surface p-2.5 rounded-xl border border-sky-500/30">
                  <span className="font-mono text-xs font-bold text-sky-300 flex-1 truncate select-all">
                    {stats.network.tvUrl}
                  </span>
                  <button
                    onClick={() => handleCopy(stats.network.tvUrl)}
                    className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white transition-all text-xs"
                    title="Copy URL"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Step by step guide */}
            <div className="flex flex-col gap-3 pt-2 text-xs text-zinc-300 border-t border-surface-border">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>Open the built-in <strong>Web Browser</strong> app on your LG TV.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>Enter <code className="text-sky-300 font-mono font-semibold">{stats?.network?.tvUrl}</code> in the address bar.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>Click <strong>TV Mode</strong> or bookmark the page for instant access anytime.</span>
              </div>
            </div>

            {/* Network Interfaces */}
            {stats?.network?.allInterfaces && stats.network.allInterfaces.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                  Detected Network Interfaces
                </span>
                <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                  {stats.network.allInterfaces.map((iface, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface border border-surface-border"
                    >
                      <span className="text-zinc-400">{iface.name}</span>
                      <span className="text-sky-400 font-semibold">{iface.address}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
