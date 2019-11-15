/* eslint-disable class-methods-use-this */

import { StorageProvider } from './interface';

export default class LocalStorageProvider implements StorageProvider {
  load<T>(repo: string, cb: (data: Record<string | number, T>) => void): void {
    const serializedData = window.localStorage.getItem(`cache-${repo}`);

    if (serializedData) {
      cb(JSON.parse(serializedData));
    }

    return cb({});
  }

  async save<T>(repo: string, data: Record<string | number, T>) {
    const serializedData = JSON.stringify(data);
    window.localStorage.setItem(`cache-${repo}`, serializedData);
  }
}
