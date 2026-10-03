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
    <>
      {/* Top Header for Desktop, Tablets & TVs */}
      <header className="sticky top-0 z-50 w-full glass-panel border-b border-surface-border">
        <div className="max-w-7xl 2xl:max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 2xl:h-20 flex items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none tv-focusable rounded-lg p-1"
            tabIndex={1}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 2xl:w-12 2xl:h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Film className="w-4 h-4 sm:w-5 sm:h-5 2xl:w-6 2xl:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-lg sm:text-xl 2xl:text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
                  YR STREAM
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Cloud & TV
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-zinc-400 hidden sm:block">Personal Media Server</p>
            </div>
          </Link>

          {/* Desktop & Large Screen Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 2xl:gap-2">
            {navLinks.map((link, idx) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  tabIndex={idx + 2}
                  className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 2xl:px-4 2xl:py-2.5 rounded-lg text-xs sm:text-sm 2xl:text-base font-medium transition-all tv-focusable ${
                    link.highlight
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20'
                      : isActive
                      ? 'bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/20 shadow-sm'
                      : 'text-zinc-300 hover:text-white hover:bg-surface-hover'
                  }`}
                >
                  <Icon className="w-4 h-4 2xl:w-5 2xl:h-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-time Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-mono border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
              title={isConnected ? 'Connected to streaming server' : 'Connecting to server...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden sm:inline">{isConnected ? 'Live' : 'Connecting'}</span>
            </div>

            {/* Upload Button */}
            <Link
              href="/upload"
              tabIndex={10}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 2xl:px-5 2xl:py-2.5 rounded-lg text-xs sm:text-sm 2xl:text-base font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20 hover:brightness-110 active:scale-95 transition-all tv-focusable"
            >
              <UploadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5" />
              <span>Upload</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-panel border-t border-surface-border/80 bg-background/90 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-2xl safe-bottom">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 min-w-[50px] ${
                isActive
                  ? 'text-sky-400 scale-105 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-sky-500/15' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-400' : 'text-zinc-400'}`} />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight line-clamp-1">
                {link.label === 'Continue Watching' ? 'History' : link.label === 'Storage & Network' ? 'Settings' : link.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
