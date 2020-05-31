// This file only keeps the schema of the application indexedDB database and a connection to it

const META_STORE_NAME = 'meta';

// Increment it when you change the schema below
const SCHEMA_VERSION = 1;

function makeSchema(db: IDBDatabase) {
  // to be continued...
}

function actualizeSchema(db: IDBDatabase, oldVersion: number, _newVersion: number) {
  if (oldVersion === 0) {
    db.createObjectStore(META_STORE_NAME);
  }

  const stores = db.objectStoreNames;
  for (let i = 0; i < stores.length; ++i) {
    if (stores[i] !== META_STORE_NAME) { // not removed to not loose the session during development
      db.deleteObjectStore(stores[i]);
    }
  }

  makeSchema(db);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tgm', SCHEMA_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      actualizeSchema(request.result, event.oldVersion, event.newVersion || SCHEMA_VERSION);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

let databasePromise: Promise<IDBDatabase> | undefined;

export function getDatabase(): Promise<IDBDatabase> {
  // avoid redundant reopening
  if (!databasePromise) {
    databasePromise = openDatabase();
    databasePromise.catch((error) => {
      databasePromise = undefined;
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('Failed to open the indexedDB database', error);
      }
    });
  }

  return databasePromise;
}
