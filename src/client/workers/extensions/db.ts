import { performTransaction } from 'cache/persistentStorages/database';

export async function load(key: string) {
  const initial = { pfs: false, baseDC: 2, dcs: {} };

  try {
    return await performTransaction('meta', 'readonly', (transaction) => new Promise((resolve) => {
      const request = transaction.objectStore('meta').get(key);
      request.onsuccess = () => resolve(request.result || initial);
    }));
  } catch (error) {
    return initial;
  }
}

export function save(key: string, meta: any) {
  return performTransaction('meta', 'readwrite', (transaction) => {
    transaction.objectStore('meta').put(meta, key);
  });
}
