import { runTransaction } from './database';

function addMany(store: IDBObjectStore, items: any[]) {
  items.forEach((item) => {
    store.put(item);
  });
}

export default class ArrayStorage<TItem> {
  constructor(
    private storeName: string, // IndexedDB store name. Don't forget to add it to the schema, the store must be with autoincrementing key.
  ) {}

  public getAll(): Promise<TItem[]> {
    const { storeName } = this;

    return runTransaction(storeName, 'readonly', (transaction) => new Promise((resolve) => {
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    }));
  }

  // Turns transaction into a promise that settles when the transaction ends
  public each(callback: (item: TItem) => false | void): Promise<void> {
    const { storeName } = this;

    return runTransaction(storeName, 'readonly', (transaction) => new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor || callback(cursor.value) === false) {
            resolve();
            return;
          }
          cursor.continue();
        } catch (error) {
          reject(error);
        }
      };
    }));
  }

  public push(items: TItem[]): Promise<void> {
    const { storeName } = this;

    return runTransaction(storeName, 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      addMany(store, items);
    });
  }

  public replaceAll(items: TItem[]): Promise<void> {
    const { storeName } = this;

    return runTransaction(storeName, 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      store.clear();
      addMany(store, items);
    });
  }
}
