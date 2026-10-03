'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';
import { Movie } from '../types';

export interface UseSocketEvents {
  onMovieCreated?: (movie: Movie) => void;

  onMovieProcessing?: (data: {
    movieId: string;
    progress?: number;
  }) => void;

  onMovieProcessingProgress?: (data: {
    movieId: string;
    progress?: number;
    transcode?: boolean;
  }) => void;

  onMovieReady?: (movie: Movie) => void;

  onMovieError?: (
    data:
      | Movie
      | {
          movieId: string;
          errorMessage?: string;
        }
  ) => void;

  onMovieUpdated?: (movie: Movie) => void;

  onMovieDeleted?: (data: {
    movieId: string;
  }) => void;
}

export function useSocket(
  handlers?: UseSocketEvents
) {
  const [isConnected, setIsConnected] =
    useState(false);

  /**
   * Keep the latest handlers without forcing
   * Socket.IO listeners to be recreated.
   */
  const handlersRef = useRef<
    UseSocketEvents | undefined
  >(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const socket = getSocket();

    /**
     * ============================================================
     * CONNECTION EVENTS
     * ============================================================
     */

    const handleConnect = () => {
      console.log(
        '[SOCKET] Connected:',
        socket.id
      );

      setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log(
        '[SOCKET] Disconnected:',
        reason
      );

      setIsConnected(false);
    };

    /**
     * ============================================================
     * MOVIE EVENTS
     * ============================================================
     */

    const handleMovieCreated = (
      movie: Movie
    ) => {
      console.log(
        '[SOCKET] movie:created',
        movie
      );

      handlersRef.current?.onMovieCreated?.(
        movie
      );
    };

    const handleMovieProcessing = (data: {
      movieId: string;
      progress?: number;
    }) => {
      console.log(
        '[SOCKET] movie:processing',
        data
      );

      handlersRef.current?.onMovieProcessing?.(
        data
      );
    };

    const handleMovieProcessingProgress =
      (data: {
        movieId: string;
        progress?: number;
        transcode?: boolean;
      }) => {
        console.log(
          '[SOCKET] movie:processing-progress',
          data
        );

        handlersRef.current?.onMovieProcessingProgress?.(
          data
        );
      };

    const handleMovieReady = (
      movie: Movie
    ) => {
      console.log(
        '[SOCKET] movie:ready',
        movie
      );

      handlersRef.current?.onMovieReady?.(
        movie
      );
    };

    const handleMovieError = (
      data:
        | Movie
        | {
            movieId: string;
            errorMessage?: string;
          }
    ) => {
      console.error(
        '[SOCKET] movie:error',
        data
      );

      handlersRef.current?.onMovieError?.(
        data
      );
    };

    const handleMovieUpdated = (
      movie: Movie
    ) => {
      console.log(
        '[SOCKET] movie:updated',
        movie
      );

      handlersRef.current?.onMovieUpdated?.(
        movie
      );
    };

    const handleMovieDeleted = (data: {
      movieId: string;
    }) => {
      console.log(
        '[SOCKET] movie:deleted',
        data
      );

      handlersRef.current?.onMovieDeleted?.(
        data
      );
    };

    /**
     * ============================================================
     * REGISTER LISTENERS
     * ============================================================
     */

    socket.on(
      'connect',
      handleConnect
    );

    socket.on(
      'disconnect',
      handleDisconnect
    );

    socket.on(
      'movie:created',
      handleMovieCreated
    );

    socket.on(
      'movie:processing',
      handleMovieProcessing
    );

    socket.on(
      'movie:processing-progress',
      handleMovieProcessingProgress
    );

    socket.on(
      'movie:ready',
      handleMovieReady
    );

    socket.on(
      'movie:error',
      handleMovieError
    );

    socket.on(
      'movie:updated',
      handleMovieUpdated
    );

    socket.on(
      'movie:deleted',
      handleMovieDeleted
    );

    /**
     * Socket may already be connected before
     * this hook mounts.
     */
    if (socket.connected) {
      setIsConnected(true);
    }

    /**
     * ============================================================
     * CLEANUP
     * ============================================================
     */

    return () => {
      socket.off(
        'connect',
        handleConnect
      );

      socket.off(
        'disconnect',
        handleDisconnect
      );

      socket.off(
        'movie:created',
        handleMovieCreated
      );

      socket.off(
        'movie:processing',
        handleMovieProcessing
      );

      socket.off(
        'movie:processing-progress',
        handleMovieProcessingProgress
      );

      socket.off(
        'movie:ready',
        handleMovieReady
      );

      socket.off(
        'movie:error',
        handleMovieError
      );

      socket.off(
        'movie:updated',
        handleMovieUpdated
      );

      socket.off(
        'movie:deleted',
        handleMovieDeleted
      );
    };
  }, []);

  return {
    isConnected,
  };
}