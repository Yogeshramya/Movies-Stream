import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: Server | null = null;

/**
 * Initialize Socket.IO
 */
export function initSocketServer(
  httpServer: HttpServer
): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },

    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(
      `[SOCKET] Client connected: ${socket.id}`
    );

    /**
     * Client can identify itself.
     *
     * Examples:
     * - tv
     * - web
     * - mobile
     * - admin
     */
    socket.on(
      'identify',
      (data?: { clientType?: string }) => {
        const clientType =
          data?.clientType || 'unknown';

        socket.data.clientType = clientType;

        console.log(
          `[SOCKET] ${socket.id} identified as ${clientType}`
        );
      }
    );

    /**
     * Room support for future TV/mobile separation.
     */
    socket.on(
      'join-room',
      (room: string) => {
        if (
          typeof room !== 'string' ||
          !room.trim()
        ) {
          return;
        }

        socket.join(room);

        console.log(
          `[SOCKET] ${socket.id} joined room: ${room}`
        );
      }
    );

    socket.on(
      'leave-room',
      (room: string) => {
        if (
          typeof room !== 'string' ||
          !room.trim()
        ) {
          return;
        }

        socket.leave(room);

        console.log(
          `[SOCKET] ${socket.id} left room: ${room}`
        );
      }
    );

    /**
     * Disconnect
     */
    socket.on('disconnect', (reason) => {
      console.log(
        `[SOCKET] Client disconnected: ${socket.id} - ${reason}`
      );
    });
  });

  console.log(
    '[SOCKET] Socket.IO server initialized successfully'
  );

  return io;
}

/**
 * Get Socket.IO instance
 */
export function getSocketIO(): Server {
  if (!io) {
    throw new Error(
      'Socket.IO has not been initialized. Call initSocketServer() first.'
    );
  }

  return io;
}

/**
 * Broadcast event to every connected client.
 *
 * Used by:
 * - ChunkUploadService
 * - FFmpegService
 * - Movie processing
 */
export function emitEvent(
  event: string,
  data: unknown
): void {
  if (!io) {
    console.warn(
      `[SOCKET] Cannot emit "${event}" because Socket.IO is not initialized`
    );

    return;
  }

  const safeData = sanitizeSocketData(data);

  io.emit(event, safeData);

  console.log(
    `[SOCKET] Event emitted: ${event}`
  );
}

/**
 * Emit to a specific room.
 */
export function emitToRoom(
  room: string,
  event: string,
  data: unknown
): void {
  if (!io) {
    console.warn(
      `[SOCKET] Cannot emit "${event}" because Socket.IO is not initialized`
    );

    return;
  }

  const safeData = sanitizeSocketData(data);

  io.to(room).emit(
    event,
    safeData
  );

  console.log(
    `[SOCKET] Event emitted: ${event} → room:${room}`
  );
}

/**
 * Convert Mongoose documents and ObjectIds
 * into JSON-safe Socket.IO data.
 */
function sanitizeSocketData(
  data: unknown
): unknown {
  if (
    data === null ||
    data === undefined
  ) {
    return data;
  }

  if (
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean'
  ) {
    return data;
  }

  try {
    return JSON.parse(
      JSON.stringify(data)
    );
  } catch {
    return data;
  }
}