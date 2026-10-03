import fs from 'fs';
import path from 'path';
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
import {
  IStorageProvider,
  StorageFileMetadata,
  ReadStreamOptions,
  UploadOptions,
  StorageUploadResult,
} from './StorageProvider';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';
import { getMimeType } from '../utils/fileSanitizer';

const streamPipeline = promisify(pipeline);

export class LocalStorageProvider implements IStorageProvider {
  public readonly providerName = 'local' as const;

  async initialize(): Promise<void> {
    const dirs = [
      ENV.STORAGE_ROOT,
      ENV.MOVIES_PATH,
      ENV.THUMBNAILS_PATH,
      ENV.SUBTITLES_PATH,
      ENV.TEMP_PATH,
      ENV.TRANSCODED_PATH,
      ENV.HLS_PATH,
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          logger.info(`[STORAGE:local] Initialized directory: ${dir}`);
        } catch (err: any) {
          logger.error(`[STORAGE:local] Failed to create directory: ${dir}`, err.message);
        }
      }
    }
  }

  private resolveCategoryPath(options?: UploadOptions): string {
    const category = options?.folderCategory;
    const movieId = options?.movieId;

    switch (category) {
      case 'originals':
        return movieId ? path.join(ENV.MOVIES_PATH, movieId) : ENV.MOVIES_PATH;
      case 'playback':
        return movieId ? path.join(ENV.TRANSCODED_PATH, movieId) : ENV.TRANSCODED_PATH;
      case 'hls':
        return movieId ? path.join(ENV.HLS_PATH, movieId) : ENV.HLS_PATH;
      case 'subtitles':
        return movieId ? path.join(ENV.SUBTITLES_PATH, movieId) : ENV.SUBTITLES_PATH;
      case 'thumbnails':
        return ENV.THUMBNAILS_PATH;
      default:
        return ENV.MOVIES_PATH;
    }
  }

  private resolveFullPath(storageIdentifier: string): string {
    if (path.isAbsolute(storageIdentifier)) {
      return storageIdentifier;
    }
    // Check if relative to STORAGE_ROOT
    const fromRoot = path.join(ENV.STORAGE_ROOT, storageIdentifier);
    if (fs.existsSync(fromRoot)) {
      return fromRoot;
    }
    return storageIdentifier;
  }

  async uploadStream(
    stream: NodeJS.ReadableStream | Readable,
    destinationFilename: string,
    options?: UploadOptions
  ): Promise<StorageUploadResult> {
    const targetDir = this.resolveCategoryPath(options);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullPath = path.join(targetDir, destinationFilename);
    const writeStream = fs.createWriteStream(fullPath);

    await streamPipeline(stream as any, writeStream);

    const stat = await fs.promises.stat(fullPath);
    const mimeType = options?.mimeType || getMimeType(fullPath);

    logger.info(`[STORAGE:local] Uploaded stream to ${fullPath} (${stat.size} bytes)`);

    return {
      storageKey: fullPath,
      size: stat.size,
      mimeType,
    };
  }

  async uploadFile(
    localSourcePath: string,
    destinationFilename: string,
    options?: UploadOptions
  ): Promise<StorageUploadResult> {
    const targetDir = this.resolveCategoryPath(options);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const destinationPath = path.join(targetDir, destinationFilename);

    // If already at target destination, just inspect and return
    if (path.resolve(localSourcePath) === path.resolve(destinationPath)) {
      const stat = await fs.promises.stat(destinationPath);
      return {
        storageKey: destinationPath,
        size: stat.size,
        mimeType: options?.mimeType || getMimeType(destinationPath),
      };
    }

    await fs.promises.copyFile(localSourcePath, destinationPath);
    const stat = await fs.promises.stat(destinationPath);
    const mimeType = options?.mimeType || getMimeType(destinationPath);

    logger.info(`[STORAGE:local] Copied file to ${destinationPath} (${stat.size} bytes)`);

    return {
      storageKey: destinationPath,
      size: stat.size,
      mimeType,
    };
  }

  async downloadToFile(
    storageIdentifier: string,
    localDestinationPath: string
  ): Promise<void> {
    const fullSourcePath = this.resolveFullPath(storageIdentifier);
    if (!fs.existsSync(fullSourcePath)) {
      throw new Error(`[STORAGE:local] Source file not found: ${fullSourcePath}`);
    }

    if (path.resolve(fullSourcePath) === path.resolve(localDestinationPath)) {
      return;
    }

    const targetDir = path.dirname(localDestinationPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.copyFile(fullSourcePath, localDestinationPath);
  }

  async getReadStream(
    storageIdentifier: string,
    options?: ReadStreamOptions
  ): Promise<NodeJS.ReadableStream> {
    const fullPath = this.resolveFullPath(storageIdentifier);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`[STORAGE:local] File not found for streaming: ${fullPath}`);
    }

    const streamOptions: { start?: number; end?: number } = {};
    if (typeof options?.start === 'number') streamOptions.start = options.start;
    if (typeof options?.end === 'number') streamOptions.end = options.end;

    return fs.createReadStream(fullPath, streamOptions);
  }

  async getMetadata(storageIdentifier: string): Promise<StorageFileMetadata> {
    const fullPath = this.resolveFullPath(storageIdentifier);
    const stat = await fs.promises.stat(fullPath);

    return {
      size: stat.size,
      mimeType: getMimeType(fullPath),
      name: path.basename(fullPath),
      updatedAt: stat.mtime,
    };
  }

  async exists(storageIdentifier: string): Promise<boolean> {
    const fullPath = this.resolveFullPath(storageIdentifier);
    return fs.existsSync(fullPath);
  }

  async delete(storageIdentifier: string): Promise<void> {
    const fullPath = this.resolveFullPath(storageIdentifier);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
      logger.info(`[STORAGE:local] Deleted file: ${fullPath}`);
    }
  }

  async deleteFolder(folderIdentifier: string): Promise<void> {
    const fullPath = this.resolveFullPath(folderIdentifier);
    if (fs.existsSync(fullPath)) {
      await fs.promises.rm(fullPath, { recursive: true, force: true });
      logger.info(`[STORAGE:local] Deleted folder: ${fullPath}`);
    }
  }
}
