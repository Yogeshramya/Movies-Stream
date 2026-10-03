import fs from 'fs';
import path from 'path';
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
import { google, drive_v3 } from 'googleapis';
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

export class GoogleDriveStorageProvider implements IStorageProvider {
  public readonly providerName = 'google_drive' as const;

  private drive: drive_v3.Drive | null = null;
  private rootFolderId: string = '';
  private folderCache = new Map<string, string>();
  private initialized = false;

  /**
   * Initialize Google Drive client with OAuth2 or Service Account
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.drive) {
      return;
    }

    logger.info('[STORAGE:google_drive] Initializing Google Drive Storage Provider...');

    let authClient: any = null;

    // 1. Try Service Account Authentication
    if (ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL && ENV.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      logger.info('[GOOGLE DRIVE] Authenticating via Service Account...');
      authClient = new google.auth.JWT({
        email: ENV.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: ENV.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    }
    // 2. Try OAuth2 Authentication
    else if (
      ENV.GOOGLE_DRIVE_CLIENT_ID &&
      ENV.GOOGLE_DRIVE_CLIENT_SECRET &&
      ENV.GOOGLE_DRIVE_REFRESH_TOKEN
    ) {
      logger.info('[GOOGLE DRIVE] Authenticating via OAuth2 Client...');
      const oauth2Client = new google.auth.OAuth2(
        ENV.GOOGLE_DRIVE_CLIENT_ID,
        ENV.GOOGLE_DRIVE_CLIENT_SECRET,
        ENV.GOOGLE_DRIVE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: ENV.GOOGLE_DRIVE_REFRESH_TOKEN,
      });

      authClient = oauth2Client;
    } else {
      const err =
        'Google Drive credentials missing! Please configure GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in your .env file.';
      logger.error(`[GOOGLE DRIVE] ${err}`);
      throw new Error(err);
    }

    this.drive = google.drive({ version: 'v3', auth: authClient });

    // 3. Resolve or create root YR-STREAM folder
    try {
      await this.setupFolderHierarchy();
      this.initialized = true;
      logger.info('[STORAGE:google_drive] Google Drive Storage Provider successfully initialized.');
    } catch (err: any) {
      if (err.message?.includes('unauthorized_client') || err.message?.includes('invalid_grant')) {
        logger.error(
          '[GOOGLE DRIVE] Authentication Error: The provided GOOGLE_DRIVE_REFRESH_TOKEN is invalid or was not generated for this GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET.'
        );
        logger.error(
          '[GOOGLE DRIVE] Tip: In Google OAuth Playground, click the Gear icon (top right), check "Use your own OAuth credentials", enter your Client ID & Secret, then authorize Drive v3 scope and exchange for tokens.'
        );
      }
      throw err;
    }
  }

  /**
   * Ensure root folder and base subfolders exist in Google Drive
   */
  private async setupFolderHierarchy(): Promise<void> {
    if (!this.drive) throw new Error('Drive client not initialized');

    if (ENV.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      this.rootFolderId = ENV.GOOGLE_DRIVE_ROOT_FOLDER_ID;
      logger.info(`[GOOGLE DRIVE] Using configured root folder ID: ${this.rootFolderId}`);
    } else {
      // Find or create 'YR-STREAM' folder in root
      this.rootFolderId = await this.getOrCreateFolder('YR-STREAM', 'root');
      logger.info(`[GOOGLE DRIVE] Using root folder 'YR-STREAM' (ID: ${this.rootFolderId})`);
    }

    // Pre-cache standard subfolders
    const categories: Array<'originals' | 'playback' | 'hls' | 'subtitles' | 'thumbnails'> = [
      'originals',
      'playback',
      'hls',
      'subtitles',
      'thumbnails',
    ];

    for (const category of categories) {
      try {
        const folderId = await this.getOrCreateFolder(category, this.rootFolderId);
        this.folderCache.set(category, folderId);
      } catch (catErr: any) {
        logger.warn(`[GOOGLE DRIVE] Could not pre-cache folder '${category}': ${catErr.message}`);
      }
    }
  }


  /**
   * Find an existing folder or create it under a parent folder in Google Drive
   */
  public async getOrCreateFolder(name: string, parentFolderId: string): Promise<string> {
    if (!this.drive) await this.initialize();
    if (!this.drive) throw new Error('Drive client not available');

    const cacheKey = `${parentFolderId}/${name}`;
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    const safeName = name.replace(/'/g, "\\'");
    let q = `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentFolderId === 'root') {
      q += ` and 'root' in parents`;
    } else {
      q += ` and '${parentFolderId}' in parents`;
    }

    try {
      const res = await this.drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (res.data.files && res.data.files.length > 0) {
        const folderId = res.data.files[0].id!;
        this.folderCache.set(cacheKey, folderId);
        return folderId;
      }

      // Create folder
      const fileMetadata: drive_v3.Schema$File = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId === 'root' ? undefined : [parentFolderId],
      };

      const createRes = await this.drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name',
      });

      const newFolderId = createRes.data.id!;
      this.folderCache.set(cacheKey, newFolderId);
      logger.info(`[GOOGLE DRIVE] Created folder '${name}' (ID: ${newFolderId})`);
      return newFolderId;
    } catch (err: any) {
      logger.error(`[GOOGLE DRIVE] Failed to get or create folder '${name}':`, err.message);
      throw err;
    }
  }

  /**
   * Resolves the target Google Drive parent folder ID for a given category & movieId
   */
  public async resolveTargetFolderId(options?: UploadOptions): Promise<{ folderId: string; storageKeyPrefix: string }> {
    const category = options?.folderCategory || 'originals';
    const movieId = options?.movieId;

    if (!this.folderCache.has(category)) {
      const catFolderId = await this.getOrCreateFolder(category, this.rootFolderId);
      this.folderCache.set(category, catFolderId);
    }

    const categoryFolderId = this.folderCache.get(category)!;

    if (movieId && category !== 'thumbnails') {
      const movieFolderId = await this.getOrCreateFolder(movieId, categoryFolderId);
      return {
        folderId: movieFolderId,
        storageKeyPrefix: `${category}/${movieId}`,
      };
    }

    return {
      folderId: categoryFolderId,
      storageKeyPrefix: category,
    };
  }

  /**
   * Upload a Readable stream to Google Drive without loading entire file in memory
   */
  async uploadStream(
    stream: NodeJS.ReadableStream | Readable,
    destinationFilename: string,
    options?: UploadOptions
  ): Promise<StorageUploadResult> {
    if (!this.drive) await this.initialize();
    if (!this.drive) throw new Error('Drive client not available');

    const { folderId, storageKeyPrefix } = await this.resolveTargetFolderId(options);
    const mimeType = options?.mimeType || getMimeType(destinationFilename);

    logger.info(`[GOOGLE DRIVE] Upload started: ${destinationFilename} (${storageKeyPrefix})`);

    const media = {
      mimeType,
      body: stream,
    };

    const res = await this.drive.files.create({
      requestBody: {
        name: destinationFilename,
        parents: [folderId],
      },
      media,
      fields: 'id, name, size, mimeType',
    });

    const fileId = res.data.id!;
    const size = parseInt(res.data.size || '0', 10);
    const storageKey = `${storageKeyPrefix}/${destinationFilename}`;

    logger.info(`[GOOGLE DRIVE] Upload completed: ${destinationFilename} (File ID: ${fileId}, ${size} bytes)`);

    return {
      storageKey,
      driveFileId: fileId,
      size,
      mimeType: res.data.mimeType || mimeType,
    };
  }

  /**
   * Upload a local file to Google Drive via stream
   */
  async uploadFile(
    localSourcePath: string,
    destinationFilename: string,
    options?: UploadOptions
  ): Promise<StorageUploadResult> {
    if (!fs.existsSync(localSourcePath)) {
      throw new Error(`Local file not found for Drive upload: ${localSourcePath}`);
    }

    const stat = await fs.promises.stat(localSourcePath);
    const readStream = fs.createReadStream(localSourcePath, {
      highWaterMark: 8 * 1024 * 1024,
    });
    const mimeType = options?.mimeType || getMimeType(localSourcePath);


    const result = await this.uploadStream(readStream, destinationFilename, {
      ...options,
      mimeType,
    });

    // If Google Drive size is 0 (can happen before metadata propagation), fallback to local stat
    if (result.size === 0 && stat.size > 0) {
      result.size = stat.size;
    }

    return result;
  }

  /**
   * Download a file from Google Drive to a local file path
   */
  async downloadToFile(
    storageIdentifier: string,
    localDestinationPath: string
  ): Promise<void> {
    if (!this.drive) await this.initialize();
    if (!this.drive) throw new Error('Drive client not available');

    const fileId = storageIdentifier;
    const targetDir = path.dirname(localDestinationPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    logger.info(`[GOOGLE DRIVE] Downloading file [${fileId}] to ${localDestinationPath}...`);

    const res = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const writeStream = fs.createWriteStream(localDestinationPath);
    await streamPipeline(res.data as any, writeStream);

    const stat = await fs.promises.stat(localDestinationPath);
    logger.info(`[GOOGLE DRIVE] Download complete for [${fileId}] (${stat.size} bytes)`);
  }

  /**
   * Get a readable stream for Google Drive file with HTTP Range support
   */
  async getReadStream(
    storageIdentifier: string,
    options?: ReadStreamOptions
  ): Promise<NodeJS.ReadableStream> {
    if (!this.drive) await this.initialize();
    if (!this.drive) throw new Error('Drive client not available');

    const fileId = storageIdentifier;
    const requestHeaders: Record<string, string> = {};

    if (typeof options?.start === 'number' || typeof options?.end === 'number') {
      const start = typeof options?.start === 'number' ? options.start : 0;
      const end = typeof options?.end === 'number' ? options.end : '';
      requestHeaders.Range = `bytes=${start}-${end}`;
    }

    const res = await this.drive.files.get(
      { fileId, alt: 'media' },
      {
        responseType: 'stream',
        headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
      }
    );

    return res.data as NodeJS.ReadableStream;
  }

  /**
   * Retrieve file metadata from Google Drive
   */
  async getMetadata(storageIdentifier: string): Promise<StorageFileMetadata> {
    if (!this.drive) await this.initialize();
    if (!this.drive) throw new Error('Drive client not available');

    const fileId = storageIdentifier;
    const res = await this.drive.files.get({
      fileId,
      fields: 'id, name, size, mimeType, modifiedTime, trashed',
    });

    if (res.data.trashed) {
      throw new Error(`Google Drive file ${fileId} is trashed`);
    }

    return {
      size: parseInt(res.data.size || '0', 10),
      mimeType: res.data.mimeType || 'application/octet-stream',
      name: res.data.name || undefined,
      updatedAt: res.data.modifiedTime ? new Date(res.data.modifiedTime) : undefined,
      driveFileId: res.data.id || undefined,
    };
  }

  /**
   * Check if a file exists in Google Drive
   */
  async exists(storageIdentifier: string): Promise<boolean> {
    try {
      if (!this.drive) await this.initialize();
      if (!this.drive) return false;

      const fileId = storageIdentifier;
      const res = await this.drive.files.get({
        fileId,
        fields: 'id, trashed',
      });

      return !res.data.trashed;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file from Google Drive
   */
  async delete(storageIdentifier: string): Promise<void> {
    if (!this.drive) await this.initialize();
    if (!this.drive) return;

    const fileId = storageIdentifier;
    try {
      await this.drive.files.delete({ fileId });
      logger.info(`[GOOGLE DRIVE] Deleted file [${fileId}]`);
    } catch (err: any) {
      if (err.code === 404) {
        logger.warn(`[GOOGLE DRIVE] File [${fileId}] was already deleted or not found`);
        return;
      }
      logger.warn(`[GOOGLE DRIVE] Failed to delete file [${fileId}]:`, err.message);
    }
  }

  /**
   * Delete a folder from Google Drive
   */
  async deleteFolder(folderIdentifier: string): Promise<void> {
    if (!this.drive) await this.initialize();
    if (!this.drive) return;

    const folderId = folderIdentifier;
    try {
      await this.drive.files.delete({ fileId: folderId });
      logger.info(`[GOOGLE DRIVE] Deleted folder [${folderId}]`);
    } catch (err: any) {
      if (err.code === 404) {
        return;
      }
      logger.warn(`[GOOGLE DRIVE] Failed to delete folder [${folderId}]:`, err.message);
    }
  }
}
