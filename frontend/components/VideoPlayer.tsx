'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Subtitles,
  ArrowLeft,
  Check,
  Film,
  Loader2,
  AlertCircle,
  RefreshCw,
  Languages,
  X,
} from 'lucide-react';

import { Movie } from '../types';
import { getStreamUrl, saveWatchProgress } from '../lib/api';
import {
  formatDurationDetailed,
} from '../lib/formatters';

interface VideoPlayerProps {
  movie: Movie;
  initialPosition?: number;
}

type PlayerStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'error'
  | 'ended';

export default function VideoPlayer({
  movie,
  initialPosition = 0,
}: VideoPlayerProps) {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const progressSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const resumeAppliedRef = useRef(false);

  const [status, setStatus] = useState<PlayerStatus>('idle');

  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  const [duration, setDuration] = useState(movie.duration || 0);

  const [bufferedEnd, setBufferedEnd] = useState(0);

  const [volume, setVolume] = useState(1);

  const [isMuted, setIsMuted] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [showControls, setShowControls] = useState(true);

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const [showResumePrompt, setShowResumePrompt] = useState(
    initialPosition > 10 && initialPosition < movie.duration - 10
  );

  const [selectedSubtitle, setSelectedSubtitle] =
    useState<string>('off');

  const [selectedAudio, setSelectedAudio] =
    useState<number>(0);

  const [playerError, setPlayerError] = useState<string | null>(null);

  const [retryKey, setRetryKey] = useState(0);

  /* -----------------------------------------------------------
     Derived data
  ----------------------------------------------------------- */

  const subtitles = movie.subtitles || [];

  const audioTracks = movie.audioTracks || [];

  const playbackType =
    movie.transcodeNeeded ||
      movie.transcodeStatus === 'completed' ||
      movie.playbackMimeType === 'video/mp4'
      ? 'Compatible MP4'
      : 'Direct Stream';

  /* -----------------------------------------------------------
     Controls visibility
  ----------------------------------------------------------- */

  const handleUserActivity = useCallback(() => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (
        videoRef.current &&
        !videoRef.current.paused &&
        !showSettingsMenu
      ) {
        setShowControls(false);
      }
    }, 3500);
  }, [showSettingsMenu]);

  /* -----------------------------------------------------------
     Cleanup controls timer
  ----------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  /* -----------------------------------------------------------
     Save watch progress
  ----------------------------------------------------------- */

  const saveCurrentProgress = useCallback(() => {
    const video = videoRef.current;

    if (!video) return;

    const position = video.currentTime;

    const videoDuration =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : movie.duration;

    if (!Number.isFinite(position) || position <= 0) {
      return;
    }

    saveWatchProgress(
      movie._id,
      position,
      videoDuration
    ).catch(() => { });
  }, [movie._id, movie.duration]);

  /* -----------------------------------------------------------
     Periodic progress saving
  ----------------------------------------------------------- */

  useEffect(() => {
    progressSaveTimerRef.current = setInterval(() => {
      const video = videoRef.current;

      if (
        video &&
        !video.paused &&
        !video.ended &&
        video.currentTime > 0
      ) {
        saveCurrentProgress();
      }
    }, 5000);

    return () => {
      if (progressSaveTimerRef.current) {
        clearInterval(progressSaveTimerRef.current);
      }
    };
  }, [saveCurrentProgress]);

  /* -----------------------------------------------------------
     Save progress when leaving page
  ----------------------------------------------------------- */

  useEffect(() => {
    return () => {
      saveCurrentProgress();
    };
  }, [saveCurrentProgress]);

  /* -----------------------------------------------------------
     Play / Pause
  ----------------------------------------------------------- */

  const togglePlay = useCallback(() => {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setStatus('playing');
          setPlayerError(null);
        })
        .catch((error) => {
          console.error('[PLAYER] Play failed:', error);
          setPlayerError(
            'Unable to start playback. Please try again.'
          );
          setStatus('error');
        });
    } else {
      video.pause();

      setIsPlaying(false);
      setStatus('paused');

      saveCurrentProgress();
    }

    handleUserActivity();
  }, [handleUserActivity, saveCurrentProgress]);

  /* -----------------------------------------------------------
     Seek
  ----------------------------------------------------------- */

  const seekRelative = useCallback(
    (seconds: number) => {
      const video = videoRef.current;

      if (!video) return;

      const videoDuration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : movie.duration;

      const nextTime = Math.max(
        0,
        Math.min(
          videoDuration,
          video.currentTime + seconds
        )
      );

      video.currentTime = nextTime;

      setCurrentTime(nextTime);

      handleUserActivity();
    },
    [movie.duration, handleUserActivity]
  );

  const handleSeekChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const video = videoRef.current;

    if (!video) return;

    const target = Number(e.target.value);

    video.currentTime = target;

    setCurrentTime(target);

    handleUserActivity();
  };

  /* -----------------------------------------------------------
     Volume
  ----------------------------------------------------------- */

  const handleVolumeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(e.target.value);

    setVolume(value);

    setIsMuted(value === 0);

    if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0;
    }

    handleUserActivity();
  };

  const toggleMute = () => {
    const video = videoRef.current;

    if (!video) return;

    const nextMuted = !isMuted;

    setIsMuted(nextMuted);

    video.muted = nextMuted;

    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      video.volume = 0.5;
    }

    handleUserActivity();
  };

  /* -----------------------------------------------------------
     Playback speed
  ----------------------------------------------------------- */

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);

    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }

    setShowSettingsMenu(false);

    handleUserActivity();
  };

  /* -----------------------------------------------------------
     Fullscreen
  ----------------------------------------------------------- */

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;

    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error(
        '[PLAYER] Fullscreen error:',
        error
      );
    }

    handleUserActivity();
  }, [handleUserActivity]);

  /* -----------------------------------------------------------
     Fullscreen state
  ----------------------------------------------------------- */

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement)
      );
    };

    document.addEventListener(
      'fullscreenchange',
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
    };
  }, []);

  /* -----------------------------------------------------------
     Resume
  ----------------------------------------------------------- */

  const resumeFromPosition = async () => {
    const video = videoRef.current;

    if (!video) return;

    setShowResumePrompt(false);

    try {
      video.currentTime = initialPosition;

      await video.play();

      setIsPlaying(true);
      setStatus('playing');

      resumeAppliedRef.current = true;
    } catch (error) {
      console.error(
        '[PLAYER] Resume failed:',
        error
      );

      setPlayerError(
        'Unable to resume playback.'
      );
    }
  };

  const startOver = async () => {
    const video = videoRef.current;

    if (!video) return;

    setShowResumePrompt(false);

    try {
      video.currentTime = 0;

      await video.play();

      setIsPlaying(true);
      setStatus('playing');

      resumeAppliedRef.current = true;
    } catch (error) {
      console.error(
        '[PLAYER] Start over failed:',
        error
      );
    }
  };

  /* -----------------------------------------------------------
     Apply initial position after metadata
  ----------------------------------------------------------- */

  const applyInitialPosition = () => {
    const video = videoRef.current;

    if (!video) return;

    if (
      initialPosition > 10 &&
      !showResumePrompt &&
      !resumeAppliedRef.current
    ) {
      try {
        video.currentTime = initialPosition;
        resumeAppliedRef.current = true;
      } catch {
        // Browser may reject seeking before metadata is ready.
      }
    }
  };

  /* -----------------------------------------------------------
     Subtitle handling
  ----------------------------------------------------------- */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const tracks = video.textTracks;

    for (let i = 0; i < tracks.length; i++) {
      tracks[i].mode = 'disabled';
    }
  }, [selectedSubtitle, retryKey]);

  /* -----------------------------------------------------------
     Audio track handling
  ----------------------------------------------------------- */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const audioTracksProperty = (
      video as HTMLVideoElement & {
        audioTracks?: {
          length: number;
          [index: number]: {
            enabled: boolean;
          };
        };
      }
    ).audioTracks;

    if (!audioTracksProperty) {
      return;
    }

    for (
      let i = 0;
      i < audioTracksProperty.length;
      i++
    ) {
      audioTracksProperty[i].enabled =
        i === selectedAudio;
    }
  }, [selectedAudio, retryKey]);

  /* -----------------------------------------------------------
     Keyboard / LG TV remote controls
  ----------------------------------------------------------- */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;

      if (
        target &&
        ['input', 'textarea', 'select'].includes(
          target.tagName.toLowerCase()
        )
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          togglePlay();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-10);
          break;

        case 'ArrowRight':
          e.preventDefault();
          seekRelative(10);
          break;

        case 'ArrowUp': {
          e.preventDefault();

          const nextVolume = Math.min(
            1,
            volume + 0.1
          );

          setVolume(nextVolume);
          setIsMuted(false);

          if (videoRef.current) {
            videoRef.current.volume = nextVolume;
            videoRef.current.muted = false;
          }

          handleUserActivity();
          break;
        }

        case 'ArrowDown': {
          e.preventDefault();

          const nextVolume = Math.max(
            0,
            volume - 0.1
          );

          setVolume(nextVolume);

          if (videoRef.current) {
            videoRef.current.volume = nextVolume;
            videoRef.current.muted =
              nextVolume === 0;
          }

          setIsMuted(nextVolume === 0);

          handleUserActivity();
          break;
        }

        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;

        case 'Escape':
          if (showSettingsMenu) {
            setShowSettingsMenu(false);
            return;
          }

          if (isFullscreen) {
            document.exitFullscreen().catch(() => { });
          }

          break;

        case 'Backspace':
          e.preventDefault();
          router.back();
          break;
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    volume,
    isFullscreen,
    showSettingsMenu,
    togglePlay,
    seekRelative,
    handleUserActivity,
    toggleFullscreen,
    router,
  ]);

  /* -----------------------------------------------------------
     Video events
  ----------------------------------------------------------- */

  const onLoadStart = () => {
    setStatus('loading');
    setPlayerError(null);
  };

  const onLoadedMetadata = () => {
    const video = videoRef.current;

    if (!video) return;

    const videoDuration =
      Number.isFinite(video.duration) &&
        video.duration > 0
        ? video.duration
        : movie.duration;

    setDuration(videoDuration);

    applyInitialPosition();

    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackSpeed;
  };

  const onCanPlay = () => {
    if (!isPlaying) {
      setStatus('paused');
    }
  };

  const onWaiting = () => {
    setStatus('buffering');
  };

  const onPlaying = () => {
    setStatus('playing');
    setIsPlaying(true);
    setPlayerError(null);
  };

  const onPause = () => {
    setIsPlaying(false);

    if (status !== 'ended') {
      setStatus('paused');
    }
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;

    if (!video) return;

    setCurrentTime(video.currentTime);

    if (video.buffered.length > 0) {
      try {
        setBufferedEnd(
          video.buffered.end(
            video.buffered.length - 1
          )
        );
      } catch {
        // Ignore stale buffered ranges.
      }
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setStatus('ended');

    const finalDuration =
      videoRef.current?.duration ||
      movie.duration;

    saveWatchProgress(
      movie._id,
      finalDuration,
      finalDuration
    ).catch(() => { });

    setShowControls(true);
  };

  const onError = () => {
    const video = videoRef.current;

    console.error(
      '[PLAYER] HTML5 video error:',
      video?.error
    );

    setIsPlaying(false);
    setStatus('error');

    setPlayerError(
      'This video could not be played by the TV/browser. Try retrying the stream.'
    );

    setShowControls(true);
  };

  /* -----------------------------------------------------------
     Retry stream
  ----------------------------------------------------------- */

  const retryPlayback = () => {
    const video = videoRef.current;

    if (!video) return;

    const savedPosition = video.currentTime;

    setPlayerError(null);
    setStatus('loading');
    setRetryKey((value) => value + 1);

    video.pause();

    video.load();

    const restorePosition = () => {
      if (
        savedPosition > 0 &&
        Number.isFinite(savedPosition)
      ) {
        try {
          video.currentTime = savedPosition;
        } catch {
          // Ignore.
        }
      }

      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setStatus('playing');
        })
        .catch(() => {
          setIsPlaying(false);
          setStatus('paused');
        });
    };

    video.addEventListener(
      'loadedmetadata',
      restorePosition,
      { once: true }
    );
  };

  /* -----------------------------------------------------------
     Subtitle track helper
  ----------------------------------------------------------- */

  const getSubtitleLabel = (
    subtitle: (typeof subtitles)[number]
  ) => {
    return (
      subtitle.label ||
      subtitle.language ||
      'Subtitle'
    );
  };

  /* -----------------------------------------------------------
     Render
  ----------------------------------------------------------- */

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onClick={handleUserActivity}
      className="relative w-full h-screen bg-black select-none overflow-hidden flex items-center justify-center"
    >
      {/* -------------------------------------------------------
          VIDEO
      ------------------------------------------------------- */}

      <video
        key={retryKey}
        ref={videoRef}
        src={getStreamUrl(movie._id)}
        onLoadStart={onLoadStart}
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onCanPlay}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
        onError={onError}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
        preload="metadata"
      />

      {/* -------------------------------------------------------
          LOADING / BUFFERING
      ------------------------------------------------------- */}

      {(status === 'loading' ||
        status === 'buffering') &&
        !playerError && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />

              <span className="text-sm font-semibold text-white bg-black/60 px-4 py-2 rounded-xl backdrop-blur-md">
                {status === 'buffering'
                  ? 'Buffering...'
                  : 'Loading video...'}
              </span>
            </div>
          </div>
        )}

      {/* -------------------------------------------------------
          ERROR
      ------------------------------------------------------- */}

      {playerError && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel border border-red-500/30 rounded-2xl p-7 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />

            <h2 className="text-xl font-bold text-white mb-2">
              Playback Error
            </h2>

            <p className="text-sm text-zinc-400 mb-6">
              {playerError}
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={retryPlayback}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm tv-focusable"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>

              <button
                onClick={() => router.back()}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm tv-focusable"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------
          RESUME PROMPT
      ------------------------------------------------------- */}

      {showResumePrompt && (
        <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl max-w-md w-full border border-sky-500/30 text-center shadow-2xl">
            <Film className="w-12 h-12 text-sky-400 mx-auto mb-3" />

            <h3 className="text-xl font-bold text-white mb-1">
              Resume Playback?
            </h3>

            <p className="text-sm text-zinc-300 mb-6">
              You previously stopped watching at{' '}
              <span className="font-mono text-sky-400 font-semibold">
                {formatDurationDetailed(
                  initialPosition
                )}
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={resumeFromPosition}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold text-sm tv-focusable"
              >
                Resume
              </button>

              <button
                onClick={startOver}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 font-semibold text-sm border border-white/10 tv-focusable"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------
          TOP BAR
      ------------------------------------------------------- */}

      <div
        className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 flex items-center justify-between z-30 ${showControls
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
          }`}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 px-3.5 py-2 rounded-xl backdrop-blur-md border border-white/10 transition-all tv-focusable"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">
            Back
          </span>
        </button>

        <div className="text-center max-w-[55%]">
          <h2 className="text-white font-bold text-base sm:text-lg line-clamp-1">
            {movie.title}
          </h2>

          <span className="text-xs text-sky-400 font-mono">
            {movie.resolution} •{' '}
            {movie.videoCodec.toUpperCase()} •{' '}
            {playbackType}
          </span>
        </div>

        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
          {movie.resolution}
        </span>
      </div>

      {/* -------------------------------------------------------
          CENTER PLAY BUTTON
      ------------------------------------------------------- */}

      {!isPlaying &&
        !showResumePrompt &&
        !playerError &&
        status !== 'loading' &&
        status !== 'buffering' && (
          <button
            onClick={togglePlay}
            className="absolute z-20 w-20 h-20 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-2xl shadow-sky-500/50 hover:scale-110 active:scale-95 transition-all tv-focusable"
            aria-label="Play"
          >
            <Play className="w-10 h-10 ml-1.5 fill-white" />
          </button>
        )}

      {/* -------------------------------------------------------
          BOTTOM CONTROLS
      ------------------------------------------------------- */}

      <div
        className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-300 z-30 flex flex-col gap-3 ${showControls
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
          }`}
      >
        {/* Progress */}

        <div className="relative flex items-center w-full group">
          <div className="absolute left-0 right-0 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-500"
              style={{
                width: `${duration > 0
                    ? Math.min(
                      100,
                      (bufferedEnd / duration) * 100
                    )
                    : 0
                  }%`,
              }}
            />
          </div>

          <div className="absolute left-0 right-0 h-1.5 rounded-full overflow-hidden pointer-events-none">
            <div
              className="h-full bg-sky-400"
              style={{
                width: `${duration > 0
                    ? Math.min(
                      100,
                      (currentTime / duration) * 100
                    )
                    : 0
                  }%`,
              }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={Math.min(
              currentTime,
              duration || 100
            )}
            onChange={handleSeekChange}
            className="w-full h-1.5 appearance-none bg-transparent cursor-pointer z-10 focus:outline-none"
            aria-label="Video progress"
          />
        </div>

        {/* Controls row */}

        <div className="flex items-center justify-between gap-3">
          {/* LEFT */}

          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-sky-500 text-white transition-all active:scale-90 tv-focusable"
              title={
                isPlaying
                  ? 'Pause'
                  : 'Play'
              }
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            <button
              onClick={() =>
                seekRelative(-10)
              }
              className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all tv-focusable"
              title="Rewind 10 seconds"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() =>
                seekRelative(10)
              }
              className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all tv-focusable"
              title="Forward 10 seconds"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            <div className="text-xs sm:text-sm font-mono text-zinc-300 font-medium whitespace-nowrap">
              <span>
                {formatDurationDetailed(
                  currentTime
                )}
              </span>

              <span className="text-zinc-500 mx-1.5">
                /
              </span>

              <span className="text-zinc-400">
                {formatDurationDetailed(
                  duration
                )}
              </span>
            </div>
          </div>

          {/* RIGHT */}

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Volume */}

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all tv-focusable"
                title="Mute"
              >
                {isMuted ||
                  volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={
                  isMuted
                    ? 0
                    : volume
                }
                onChange={
                  handleVolumeChange
                }
                className="w-16 sm:w-20 h-1 appearance-none bg-slate-700 rounded-lg cursor-pointer"
                aria-label="Volume"
              />
            </div>

            {/* Settings */}

            <div className="relative">
              <button
                onClick={() =>
                  setShowSettingsMenu(
                    (value) => !value
                  )
                }
                className={`p-2 rounded-xl transition-all tv-focusable ${showSettingsMenu
                    ? 'bg-sky-500 text-white'
                    : 'text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                title="Player Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {showSettingsMenu && (
                <div className="absolute bottom-12 right-0 glass-panel p-3 rounded-xl min-w-[250px] max-h-[70vh] overflow-y-auto shadow-2xl border border-surface-border text-xs z-50">
                  {/* Speed */}

                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-2">
                    Playback Speed
                  </span>

                  <div className="flex flex-col gap-1 mb-4">
                    {[
                      0.5,
                      0.75,
                      1,
                      1.25,
                      1.5,
                      2,
                    ].map((speed) => (
                      <button
                        key={speed}
                        onClick={() =>
                          handleSpeedChange(
                            speed
                          )
                        }
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors tv-focusable ${playbackSpeed ===
                            speed
                            ? 'bg-sky-500/20 text-sky-400 font-semibold'
                            : 'text-zinc-300 hover:bg-white/10'
                          }`}
                      >
                        <span>
                          {speed === 1
                            ? 'Normal (1x)'
                            : `${speed}x`}
                        </span>

                        {playbackSpeed ===
                          speed && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                      </button>
                    ))}
                  </div>

                  {/* Audio */}

                  {audioTracks.length >
                    0 && (
                      <>
                        <div className="border-t border-white/10 my-3" />

                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-2">
                          Audio Track
                        </span>

                        <div className="flex flex-col gap-1">
                          {audioTracks.map(
                            (track, index) => (
                              <button
                                key={
                                  `${track.title}-${index}`
                                }
                                onClick={() => {
                                  setSelectedAudio(
                                    index
                                  );
                                }}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left tv-focusable ${selectedAudio ===
                                    index
                                    ? 'bg-sky-500/20 text-sky-400 font-semibold'
                                    : 'text-zinc-300 hover:bg-white/10'
                                  }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Languages className="w-3.5 h-3.5" />
                                  {track.title ||
                                    track.language ||
                                    `Track ${index + 1
                                    }`}
                                </span>

                                {selectedAudio ===
                                  index && (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                              </button>
                            )
                          )}
                        </div>
                      </>
                    )}

                  {/* Subtitles */}

                  <div className="border-t border-white/10 my-3" />

                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-2">
                    Subtitles
                  </span>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() =>
                        setSelectedSubtitle(
                          'off'
                        )
                      }
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left tv-focusable ${selectedSubtitle ===
                          'off'
                          ? 'bg-sky-500/20 text-sky-400 font-semibold'
                          : 'text-zinc-300 hover:bg-white/10'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <X className="w-3.5 h-3.5" />
                        Off
                      </span>

                      {selectedSubtitle ===
                        'off' && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                    </button>

                    {subtitles.map(
                      (subtitle, index) => (
                        <button
                          key={`${subtitle.label}-${index}`}
                          onClick={() =>
                            setSelectedSubtitle(
                              String(index)
                            )
                          }
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left tv-focusable ${selectedSubtitle ===
                              String(index)
                              ? 'bg-sky-500/20 text-sky-400 font-semibold'
                              : 'text-zinc-300 hover:bg-white/10'
                            }`}
                        >
                          <span className="flex items-center gap-2">
                            <Subtitles className="w-3.5 h-3.5" />
                            {getSubtitleLabel(
                              subtitle
                            )}
                          </span>

                          {selectedSubtitle ===
                            String(index) && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                        </button>
                      )
                    )}

                    {subtitles.length ===
                      0 && (
                        <span className="px-2.5 py-2 text-zinc-500">
                          No subtitle tracks available
                        </span>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all tv-focusable"
              title="Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}