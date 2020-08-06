// No business logic here

// Turns transaction into a promise that settles when the transaction ends
export function promisifyTransaction<T>(
  transaction: IDBTransaction,
  action: (transaction: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  // Must be executed ASAP otherwise Safari emits TransactionInactiveError: https://stackoverflow.com/q/50849690/1118709
  const actionMaybePromise = action(transaction);
  let isTransactionComplete = false;

  // eslint-disable-next-line no-param-reassign
  transaction.oncomplete = transaction.onerror = () => isTransactionComplete = true;

  return Promise.resolve()
    .then(() => actionMaybePromise)
    .then((result) => new Promise((resolve, reject) => {
      if (isTransactionComplete) {
        if (transaction.error) {
          reject(transaction.error);
        } else {
          resolve(result);
        }
      } else {
        // eslint-disable-next-line no-param-reassign
        transaction.oncomplete = () => resolve(result);
        // eslint-disable-next-line no-param-reassign
        transaction.onerror = () => reject(transaction.error);
      }
    }));
}

export function getValue(store: IDBObjectStore, key: IDBValidKey) {
  return new Promise((resolve) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
  });
}

// The callback can return `false` to stop the iteration
export function eachEntry<TKey extends IDBValidKey, TValue>(
  store: IDBObjectStore,
  callback: (key: TKey, value: TValue) => false | void,
): Promise<void> {
  return new Promise((resolve, reject) => {
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
  });
}

// Use `eachEntry` when possible to prevent creating an excess object in the memory
export async function getAllEntries<T extends [IDBValidKey, any]>(store: IDBObjectStore): Promise<T[]> {
  const result: T[] = [];
  await eachEntry<T[0], T[1]>(store, (key, value) => {
    result.push([key, value] as T);
  });
  return result;
}

// Use `eachEntry` when possible to prevent creating an excess array in the memory
export function getAllValues<TValue>(store: IDBObjectStore): Promise<TValue[]> {
  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
  });
}

// The store must by auto incrementing
export function addValues(store: IDBObjectStore, values: unknown[]) {
  values.forEach((value) => store.put(value));
}

// Plain object isn't used because it turns numeric keys into strings and IndexedDB cares
export function putValuesMap(store: IDBObjectStore, values: Map<IDBValidKey, unknown>) {
  values.forEach((value, key) => store.put(value, key));
}

export function putValuesEntries(store: IDBObjectStore, values: Array<[IDBValidKey, unknown]>) {
  values.forEach(([key, value]) => store.put(value, key));
}
