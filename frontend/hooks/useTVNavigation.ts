'use client';

import { useEffect, useCallback } from 'react';

export function useTVNavigation(options?: {
  enabled?: boolean;
  onEnter?: () => void;
  onBack?: () => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (options?.enabled === false) return;

      // LG TV Remote keycodes and standard keyboard keys
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          // Standard spatial arrow navigation is handled by browser focus,
          // but we ensure focusable elements get targeted smoothly
          break;
        case 'Enter':
          if (options?.onEnter) {
            options.onEnter();
          }
          break;
        case 'Escape':
        case 'GoBack':
        case 'Back':
          if (options?.onBack) {
            e.preventDefault();
            options.onBack();
          }
          break;
      }
    },
    [options]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
