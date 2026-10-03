import { IStorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { GoogleDriveStorageProvider } from './GoogleDriveStorageProvider';
import { ENV } from '../config/env';
import { logger } from '../utils/logger';

export * from './StorageProvider';
export * from './LocalStorageProvider';
export * from './GoogleDriveStorageProvider';

let instance: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (instance) {
    return instance;
  }

  const providerType = ENV.STORAGE_PROVIDER;

  if (providerType === 'google_drive') {
    logger.info('[STORAGE] Active Storage Provider: Google Drive');
    instance = new GoogleDriveStorageProvider();
  } else {
    logger.info('[STORAGE] Active Storage Provider: Local Filesystem');
    instance = new LocalStorageProvider();
  }

  return instance;
}

export const storageProvider: IStorageProvider = new Proxy({} as IStorageProvider, {
  get(_target, prop) {
    const active = getStorageProvider();
    const val = (active as any)[prop];
    return typeof val === 'function' ? val.bind(active) : val;
  },
});
