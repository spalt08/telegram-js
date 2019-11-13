/* eslint-disable class-methods-use-this */

import { StorageProvider } from './interface';

export default class SessionStorageProvider implements StorageProvider {
  load<T>(repo: string, cb: (data: Record<string | number, T>) => void): void {
    const serializedData = window.sessionStorage.getItem(`cache-${repo}`);

    if (serializedData) {
      cb(JSON.parse(serializedData));
    }

    return cb({});
  }

  async save<T>(repo: string, data: Record<string | number, T>) {
    const serializedData = JSON.stringify(data);
    window.sessionStorage.setItem(`cache-${repo}`, serializedData);
  }
}
