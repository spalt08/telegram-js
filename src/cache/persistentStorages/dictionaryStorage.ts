import { runTransaction } from './database';

function putMany(store: IDBObjectStore, items: Record<keyof any, any>) {
  Object.keys(items).forEach((key) => {
    store.put(items[key], key);
  });
}

export default class DictionaryStorage<TKey extends (keyof any) & IDBValidKey, TItem> {
  constructor(
    private storeName: string, // IndexedDB store name. Don't forget to add it to the schema.
  ) {}

  // Use `each` when possible to prevent creating an excess object in the memory
  public async getAll(): Promise<Record<TKey, TItem>> {
    const result = {} as Record<TKey, TItem>;
    await this.each((key, item) => {
      result[key] = item;
    });
    return result;
  }

  // The callback can return `false` to stop the iteration
  public each(callback: (key: TKey, item: TItem) => false | void): Promise<void> {
    const { storeName } = this;

    return runTransaction(storeName, 'readonly', (transaction) => new Promise((resolve, reject) => {
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      request.onsuccess = () => {
        try {
          const cursor = request.result;
          if (!cursor || callback(cursor.primaryKey as TKey, cursor.value) === false) {
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

  public putMany(items: Record<TKey, TItem>): Promise<void> {
    const { storeName } = this;

    return runTransaction(storeName, 'readwrite', (transaction) => {
      putMany(transaction.objectStore(storeName), items);
    });
  }

  public replaceAll(items: Record<TKey, TItem>): Promise<void> {
    const { storeName } = this;

    return runTransaction(storeName, 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      store.clear();
      putMany(store, items);
    });
  }
}
