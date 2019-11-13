/**
 * More simple API to modify cache
 */

import { setCacheRepoItem, extendCacheRepo, loadRepo, saveRepo, getCacheRepoItem } from './data';
import { User, Chat, Message } from './types';

function repoFabric<T>(repo: string) {
  return {
    load: (cb?: () => void) => loadRepo<T>(repo, cb),
    save: () => saveRepo<T>(repo),
    add: (key: number | string, data: T) => setCacheRepoItem<T>(repo, key, data),
    get: (key: number): T => getCacheRepoItem<T>(repo, key),
    extend: (data: Record<string | number, T>) => extendCacheRepo<T>(repo, data),
  };
}

/**
 * User repo
 * Ref: https://core.telegram.org/constructor/user
 */
export const userCache = repoFabric<User>('users');

/**
 * Chat repo
 * Ref: https://core.telegram.org/constructor/chat
 */
export const chatCache = repoFabric<Chat>('chats');

/**
 * Message repo
 * Ref: https://core.telegram.org/constructor/message
 */
export const messageCache = repoFabric<Message>('messages');
