// avoid redundant reopening
let _db: IDBDatabase | undefined;

export function open() {
  return new Promise<IDBDatabase>((resolve) => {
    if (_db) resolve(_db);
    else {
      const request = indexedDB.open('tgm', 1);

      // Create Schema
      request.onupgradeneeded = (event: any) => {
        _db = event.target.result as IDBDatabase;
        _db.createObjectStore('meta');
      };

      request.onsuccess = (event: any) => {
        resolve(_db = event.target.result as IDBDatabase);
      };
    }
  });
}

export function load(key: string) {
  return new Promise((resolve) => {
    open().then((db) => {
      const request = db
        .transaction('meta', 'readwrite')
        .objectStore('meta')
        .get(key);

      const initial = { pfs: false, baseDC: 2, dcs: {} };

      request.onsuccess = (event: any) => resolve(event.target.result || initial);
      request.onerror = () => resolve(initial);
    });
  });
}

export function save(key: string, meta: any) {
  open().then((db) => {
    db
      .transaction('meta', 'readwrite')
      .objectStore('meta')
      .put(meta, key);
  });
}
