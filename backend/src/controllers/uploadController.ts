import { Request, Response } from 'express';
import { ChunkUploadService } from '../services/chunkUploadService';
import { logger } from '../utils/logger';

export class UploadController {
  /**
   * POST /api/upload/init
   * Initialize a chunked upload session
   */
  static async initUpload(req: Request, res: Response): Promise<void> {
    try {
      const { filename, fileSize, totalChunks, title } = req.body;

      if (!filename || !fileSize || !totalChunks) {
        res.status(400).json({ error: 'Missing required fields: filename, fileSize, totalChunks' });
        return;
      }

      const session = await ChunkUploadService.initUploadSession(
        filename,
        parseInt(fileSize, 10),
        parseInt(totalChunks, 10),
        title
      );

      res.status(201).json({
        success: true,
        uploadId: session.uploadId,
        session,
      });
    } catch (err: any) {
      logger.error('Error initializing upload:', err.message);
      res.status(400).json({ error: err.message || 'Failed to initialize upload session' });
    }
  }

  /**
   * POST /api/upload/chunk
   * Upload an individual chunk
   */
  static async uploadChunk(req: Request, res: Response): Promise<void> {
    try {
      const uploadId = req.headers['x-upload-id'] as string || req.body.uploadId;
      const chunkIndex = parseInt(req.headers['x-chunk-index'] as string || req.body.chunkIndex, 10);

      if (!uploadId || isNaN(chunkIndex)) {
        res.status(400).json({ error: 'Missing uploadId or chunkIndex' });
        return;
      }

      // Read chunk binary buffer from req.file or raw body
      let chunkBuffer: Buffer | undefined;
      if (req.file && req.file.buffer) {
        chunkBuffer = req.file.buffer;
      } else if (Buffer.isBuffer(req.body)) {
        chunkBuffer = req.body;
      }

      if (!chunkBuffer || chunkBuffer.length === 0) {
        res.status(400).json({ error: 'Empty or missing chunk data' });
        return;
      }

      const { isComplete, session } = await ChunkUploadService.saveChunk(
        uploadId,
        chunkIndex,
        chunkBuffer
      );

      // If all chunks arrived, automatically trigger file assembly
      if (isComplete) {
        logger.upload(`All chunks received for session [${uploadId}]. Assembling file...`);
        const movie = await ChunkUploadService.finalizeUpload(uploadId);
        res.status(200).json({
          success: true,
          isComplete: true,
          movie,
          message: 'Upload complete and media processing started',
        });
        return;
      }

      res.status(200).json({
        success: true,
        isComplete: false,
        chunkIndex,
        uploadedChunksCount: session.uploadedChunks.length,
        totalChunks: session.totalChunks,
      });
    } catch (err: any) {
      logger.error('Error handling upload chunk:', err.message);
      res.status(500).json({ error: err.message || 'Chunk upload failed' });
    }
  }

  /**
   * GET /api/upload/:uploadId/status
   * Get resume status: which chunks are already uploaded
   */
  static async getUploadStatus(req: Request, res: Response): Promise<void> {
    try {
      const { uploadId } = req.params;
      const session = ChunkUploadService.getSession(uploadId);

      if (!session) {
        res.status(404).json({ error: 'Upload session not found or expired' });
        return;
      }

      res.json({
        success: true,
        uploadId: session.uploadId,
        fileSize: session.fileSize,
        totalChunks: session.totalChunks,
        uploadedChunks: session.uploadedChunks,
        uploadedCount: session.uploadedChunks.length,
        progress: Math.round((session.uploadedChunks.length / session.totalChunks) * 100),
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve upload status' });
    }
  }

  /**
   * DELETE /api/upload/:uploadId
   * Cancel and cleanup upload session
   */
  static async cancelUpload(req: Request, res: Response): Promise<void> {
    try {
      const { uploadId } = req.params;
      ChunkUploadService.cancelSession(uploadId);
      res.json({ success: true, message: 'Upload session cancelled and cleaned up' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to cancel upload' });
    }
  }
}
