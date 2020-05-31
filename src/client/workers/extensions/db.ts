import { getDatabase } from 'cache';

export function load(key: string) {
  return new Promise((resolve) => {
    getDatabase().then((db) => {
      const request = db
        .transaction('meta', 'readonly')
        .objectStore('meta')
        .get(key);

      const initial = { pfs: false, baseDC: 2, dcs: {} };

      request.onsuccess = () => resolve(request.result || initial);
      request.onerror = () => resolve(initial);
    });
  });
}

export function save(key: string, meta: any) {
  getDatabase().then((db) => {
    db
      .transaction('meta', 'readwrite')
      .objectStore('meta')
      .put(meta, key);
  });
}
