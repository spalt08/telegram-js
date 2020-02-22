import { Peer } from 'cache/types';
import { peerToInputPeer } from 'cache/accessors';
import client from 'client/client';
import { MessagesChunk } from 'cache/fastStorages/indices/messageHistory';
import { Direction } from './types';
import { chatCache, messageCache, userCache } from '../../cache';

export const LOAD_CHUNK_LENGTH = 35;

/**
 * Messages with id equal fromId and toId are not included to the result
 */
export async function loadContinuousMessages(
  peer: Peer,
  direction: Direction,
  fromId?: number,
  toId?: number,
): Promise<MessagesChunk> {
  if (direction === Direction.Newer && toId !== undefined) {
    direction = Direction.Older; // eslint-disable-line no-param-reassign
    [fromId, toId] = [toId, fromId]; // eslint-disable-line no-param-reassign
  }

  if (process.env.NODE_ENV === 'development') {
    if (direction === Direction.Around && toId !== undefined) {
      // eslint-disable-next-line no-console
      console.warn('The toId parameter gives no effect with Direction.Around');
    }
  }

  const payload = {
    peer: peerToInputPeer(peer),
    offset_id: 0,
    offset_date: 0,
    add_offset: 0,
    limit: 0,
    max_id: 0,
    min_id: 0,
    hash: 0,
  };
  switch (direction) {
    case Direction.Older:
      payload.offset_id = fromId || 0;
      if (toId === undefined) {
        payload.limit = LOAD_CHUNK_LENGTH;
      } else {
        payload.min_id = toId;
      }
      break;
    case Direction.Newer:
      payload.offset_id = fromId || 1;
      payload.add_offset = -LOAD_CHUNK_LENGTH - 1; // -1 to not include the fromId itself
      payload.limit = LOAD_CHUNK_LENGTH;
      break;
    case Direction.Around:
      payload.offset_id = fromId || 0;
      payload.add_offset = Math.round(-LOAD_CHUNK_LENGTH / 2);
      payload.limit = LOAD_CHUNK_LENGTH;
      break;
    default:
  }

  // console.log('loadMessages - request', payload);
  const data = await client.callAsync('messages.getHistory', payload);
  // console.log('loadMessages - response', data);

  if (data._ === 'messages.messagesNotModified') {
    throw Error(data._);
  }

  userCache.put(data.users);
  chatCache.put(data.chats);
  messageCache.put(data.messages);

  const isLoadedChunkFull = data.messages.length >= LOAD_CHUNK_LENGTH - 10; // -10 just in case
  let oldestReached = false;
  let newestReached = false;
  switch (direction) {
    case Direction.Older:
      if (!fromId) {
        newestReached = true;
      }
      if (!toId && !isLoadedChunkFull) {
        oldestReached = true;
      }
      break;
    case Direction.Newer:
      if (!fromId) {
        oldestReached = true;
      }
      if (!isLoadedChunkFull) {
        newestReached = true;
      }
      break;
    default:
  }

  return {
    messages: data.messages,
    oldestReached,
    newestReached,
  };
}
