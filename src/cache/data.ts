/* eslint-disable import/no-cycle */
/**
 * RAM key-value data cache with repositories.
 * Used to store and cache immutable objects retrived from API calls.
 * Supports React hooks, local caching with IndexedDB or localStorage and data encryption by passphrase.
 */

import { User, Chat, Message } from './types';
import CacheEventEmitter, { Receiver } from './emitter';
import { LocalStorageProvider } from './local';
import { userCache, messageCache, chatCache } from './repos';

type Cache = {
  users: Record<number, User>,
  chats: Record<number, Chat>,
  messages: Record<number, Message>,
  [key: string]: Record<string | number, any>,
};

const cacheMemo: Cache = {
  users: {},
  chats: {},
  messages: {},
};

const cacheEmitter = new CacheEventEmitter<any>();
const cacheLocal = new LocalStorageProvider();

let loadCallback: () => void | undefined;
let loadWait = Object.keys(cacheMemo).length;

function invokeLoadCallback() {
  if (loadWait === 1) {
    if (loadCallback) loadCallback();
  } else loadWait -= 1;
}

/**
 * Loads RAM cache from local data source
 */
export function initCache(cb?: () => void) {
  userCache.load(invokeLoadCallback);
  chatCache.load(invokeLoadCallback);
  messageCache.load(invokeLoadCallback);

  if (cb) loadCallback = cb;

  // debug stuff
  (window as any).cache = cacheMemo;

  // save cache at local database
  window.addEventListener('beforeunload', (event: Event) => {
    userCache.save();
    chatCache.save();
    messageCache.save();

    event.preventDefault();
  });
}

/**
 * Singleton access to RAM cache
 */
export function getCache(): Cache {
  return cacheMemo;
}

export function getCacheRepo<T>(repo: string): Record<string | number, T> {
  if (!cacheMemo[repo]) throw new Error(`Unable to retrieve memo cache for repo ${repo}`);

  return cacheMemo[repo];
}

export function getCacheRepoItem<T>(repo: string, key: string | number): T {
  return getCacheRepo<T>(repo)[key];
}

export function setCacheRepoItem<T>(repo: string, key: string | number, value: T) {
  getCacheRepo(repo)[key] = value;
  cacheEmitter.broadcast(repo, key, value);
}

export function extendCacheRepo<T>(repo: string, data: Record<string | number, T>) {
  const keys = Object.keys(data);
  for (let i = 0; i < keys.length; i += 1) {
    setCacheRepoItem(repo, keys[i], data[keys[i]]);
  }
}

export async function loadRepo<T>(repo: string, cb: () => void) {
  cacheLocal.load<T>(repo, (repoData) => {
    cacheMemo[repo] = repoData;
    cb();
  });
}

export async function saveRepo<T>(repo: string) {
  cacheLocal.save<T>(repo, cacheMemo[repo]);
}

/**
 * Events for listening cache update
 */
export function subscribe<T>(repo: string, key: string | number, receiver: Receiver<T>) {
  receiver(getCacheRepoItem(repo, key));
  cacheEmitter.subscribe(repo, key, receiver);
}

export function unsubscribe<T>(repo: string, key: string | number, receiver: Receiver<T>) {
  cacheEmitter.unsubscribe(repo, key, receiver);
}
