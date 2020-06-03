import { runTransaction } from './database';

export default class ValueStorage<T> {
  constructor(
    protected storeName: string, // IndexedDB store name. Don't forget to add it to the schema.
    protected key: IDBValidKey,
  ) {}

  public get(): Promise<T | undefined> {
    const { storeName } = this;

    return runTransaction(storeName, 'readonly', (transaction) => new Promise((resolve) => {
      const store = transaction.objectStore(storeName);
      const request = store.get(this.key);
      request.onsuccess = () => resolve(request.result);
    }));
  }

  public set(value: T): Promise<void> {
    const { storeName } = this;

    return runTransaction(storeName, 'readwrite', (transaction) => {
      transaction.objectStore(storeName).put(value, this.key);
    });
  }

  public remove(): Promise<void> {
    const { storeName } = this;

    return runTransaction(storeName, 'readwrite', (transaction) => {
      transaction.objectStore(storeName).delete(this.key);
    });
  }
}
