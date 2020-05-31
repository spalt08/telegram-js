// This file only keeps the schema of the application indexedDB database and a connection to it

// Add a migration to the array to change the schema. Don't forget that you must delete a store before creating it again
// Don't edit or delete migrations. If you do, ask all your users to clear the indexedDB storage.
const migrations: Array<(db: IDBDatabase) => void> = [
  (db) => {
    db.createObjectStore('meta');
  },
];

function actualizeSchema(db: IDBDatabase, oldVersion: number, newVersion: number) {
  for (let i = oldVersion; i < newVersion; ++i) {
    if (migrations[i]) {
      migrations[i](db);
    }
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tgm', migrations.length);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      actualizeSchema(request.result, event.oldVersion, event.newVersion || migrations.length);
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
