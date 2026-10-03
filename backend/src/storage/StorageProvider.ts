import { Readable } from 'stream';

export interface StorageFileMetadata {
  size: number;
  mimeType?: string;
  name?: string;
  updatedAt?: Date;
  driveFileId?: string;
}

export interface ReadStreamOptions {
  start?: number;
  end?: number;
}

export interface UploadOptions {
  mimeType?: string;
  folderCategory?: 'originals' | 'playback' | 'hls' | 'subtitles' | 'thumbnails';
  movieId?: string;
}

export interface StorageUploadResult {
  storageKey: string;
  driveFileId?: string;
  size: number;
  mimeType?: string;
}

export interface IStorageProvider {
  readonly providerName: 'local' | 'google_drive';

  initialize(): Promise<void>;

  uploadStream(
    stream: NodeJS.ReadableStream | Readable,
    destinationFilename: string,
    options?: UploadOptions
  ): Promise<StorageUploadResult>;

  uploadFile(
    localSourcePath: string,
    destinationFilename: string,
    options?: UploadOptions
  ): Promise<StorageUploadResult>;

  downloadToFile(
    storageIdentifier: string,
    localDestinationPath: string
  ): Promise<void>;

  getReadStream(
    storageIdentifier: string,
    options?: ReadStreamOptions
  ): Promise<NodeJS.ReadableStream>;

  getMetadata(
    storageIdentifier: string
  ): Promise<StorageFileMetadata>;

  exists(
    storageIdentifier: string
  ): Promise<boolean>;

  delete(
    storageIdentifier: string
  ): Promise<void>;

  deleteFolder?(
    folderIdentifier: string
  ): Promise<void>;
}
