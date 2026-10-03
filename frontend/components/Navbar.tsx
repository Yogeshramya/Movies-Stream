'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Film,
  UploadCloud,
  History,
  Heart,
  Tv,
  HardDrive,
  Search,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

export default function Navbar() {
  const pathname = usePathname();
  const { isConnected } = useSocket();

  // Hide Navbar when viewing player in fullscreen watch mode
  if (pathname.startsWith('/watch/')) {
    return null;
  }

  const navLinks = [
    { href: '/', label: 'Home', icon: Sparkles },
    { href: '/movies', label: 'Movies', icon: Film },
    { href: '/history', label: 'Continue Watching', icon: History },
    { href: '/favorites', label: 'Favorites', icon: Heart },
    { href: '/tv', label: 'TV Mode', icon: Tv, highlight: true },
    { href: '/settings', label: 'Storage & Network', icon: HardDrive },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-3 group focus:outline-none tv-focusable rounded-lg p-1"
          tabIndex={1}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
                YR STREAM
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Local
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 hidden sm:block">Personal Media Server</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link, idx) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                tabIndex={idx + 2}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all tv-focusable ${
                  link.highlight
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20'
                    : isActive
                    ? 'bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/20 shadow-sm'
                    : 'text-zinc-300 hover:text-white hover:bg-surface-hover'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Real-time Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
            title={isConnected ? 'Connected to local streaming server' : 'Connecting to local streaming server...'}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline">{isConnected ? 'LAN Live' : 'Connecting'}</span>
          </div>

          {/* Upload Button */}
          <Link
            href="/upload"
            tabIndex={10}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all tv-focusable"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
