/**
 * Hooks for subscribing to RAM cache.
 * RAM cache supposed to be immutable but there are still some minor cases such as message editing or deliting
 */

import { User, Chat, Message } from './types';
import { getCacheRepoItem } from './data';

function useCacheGeneric<T>(repo: string, key: string | number): T | undefined {
  // to do auto update support

  // let val: T | undefined;

  // const handleUpdate = (newVal: T) => { val = newVal; };

  // useWhileMounted(element, () => {
  //   subscribe<T>(repo, key, handleUpdate);

  //   return () => {
  //     unsubscribe<T>(repo, key, handleUpdate);
  //   };
  // });

  return getCacheRepoItem(repo, key);
}

export function useCache(repo: string, key: string | number): any {
  return useCacheGeneric<any>(repo, key);
}

export function useUser(id: number): User | undefined {
  return useCacheGeneric<User>('users', id);
}

export function useChat(id: number): Chat | undefined {
  return useCacheGeneric<Chat>('chats', id);
}

export function useMessage(id: number): Message | undefined {
  return useCacheGeneric<Message>('messages', id);
}
