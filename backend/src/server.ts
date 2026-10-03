import http from 'http';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { ENV } from './config/env';
import { connectDatabase } from './config/database';
import { initializeStorage } from './config/storage';
import { configureFFmpeg } from './config/ffmpeg';
import { getStorageProvider } from './storage';
import { MediaQueueService } from './services/mediaQueueService';
import { initSocketServer } from './sockets/socketHandler';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/security';
import { logger } from './utils/logger';
import { getLocalIPAddresses, getPrimaryLocalIP } from './utils/networkUtils';

async function bootstrap() {
  logger.info('====================================================');
  logger.info('   YR STREAM — HIGH-PERFORMANCE CLOUD & LOCAL STREAMING');
  logger.info('====================================================');

  // 1. Initialize local storage folders
  initializeStorage();

  // 2. Initialize active storage provider (Local / Google Drive)
  try {
    await getStorageProvider().initialize();
    logger.info(`[STORAGE] Storage Provider: ${ENV.STORAGE_PROVIDER}`);
  } catch (storageErr: any) {
    logger.error('CRITICAL: Storage Provider initialization error:', storageErr.message);
  }

  // 3. Configure FFmpeg
  configureFFmpeg();

  // 4. Connect to MongoDB
  try {
    await connectDatabase();
    // Recover any interrupted media processing jobs
    void MediaQueueService.recoverPendingJobs();
  } catch (dbErr: any) {
    logger.error('CRITICAL: Failed to connect to MongoDB. Please ensure MongoDB service is running on your machine.', dbErr.message);
  }

  // 5. Create Express App
  const app = express();
  const server = http.createServer(app);

  // 6. Initialize Socket.IO
  initSocketServer(server);


  // 6. Global Middleware
  app.use(securityHeaders);
  app.use(cors({ origin: '*' }));
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 7. Mount API Routes
  app.use('/api', apiRouter);

  // 8. Global Error Handler
  app.use(errorHandler);

  // 9. Start Server on 0.0.0.0 (All network interfaces)
  server.listen(ENV.PORT, ENV.HOST, () => {
    const localIPs = getLocalIPAddresses();
    const primaryIP = getPrimaryLocalIP();

    logger.info(`YR Stream Server successfully running on port ${ENV.PORT}`);
    logger.info(`Local Access (PC): http://localhost:${ENV.PORT}`);
    logger.info(`LG Smart TV Access: http://${primaryIP}:3000`);
    logger.info('----------------------------------------------------');
    logger.info('Detected Network Interfaces on Jio Fiber LAN:');
    localIPs.forEach((iface) => {
      logger.info(`  • ${iface.name}: http://${iface.address}:${ENV.PORT} (TV URL: http://${iface.address}:3000)`);
    });
    logger.info('====================================================');
  });

  // Graceful shutdown
  const handleShutdown = () => {
    logger.info('Shutting down YR Stream server gracefully...');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

bootstrap().catch((err) => {
  logger.error('Fatal error during startup:', err);
  process.exit(1);
});
