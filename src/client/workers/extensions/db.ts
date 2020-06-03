import { runTransaction } from 'cache/persistentStorages/database';
import { getValue } from 'helpers/indexedDb';

export async function load(key: string) {
  const initial = { pfs: false, baseDC: 2, dcs: {} };

  try {
    return await runTransaction('meta', 'readonly', async (transaction) => {
      const value = await getValue(transaction.objectStore('meta'), key);
      return value || initial;
    });
  } catch (error) {
    return initial;
  }
}

export async function save(key: string, meta: any) {
  return runTransaction('meta', 'readwrite', (transaction) => {
    transaction.objectStore('meta').put(meta, key);
  });
}
