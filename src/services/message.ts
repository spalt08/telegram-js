import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { Message, Peer, AnyUpdateMessage, AnyUpdateShortMessage, Messages, MessagesNotModified, MessageCommon } from 'cache/types';
import { chatCache, messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import { MessagesChunkReference } from 'cache/fastStorages/indices/messageHistory';
import { getUserMessageId, peerMessageToId, peerToId, shortMessageToMessage, shortChatMessageToMessage } from 'helpers/api';
import UserTyping from './user_typing';
import PeerService from './peer';

export const enum Direction {
  Older,
  Newer,
  Around,
}

export const enum LoadingSide {
  Old,
  New,
}

const LOAD_CHUNK_LENGTH = 35;

const DIRECTION_TO_SIDE: Record<Direction, LoadingSide[]> = {
  [Direction.Older]: [LoadingSide.Old],
  [Direction.Newer]: [LoadingSide.New],
  [Direction.Around]: [LoadingSide.Old, LoadingSide.New],
};

/**
 * Singleton service class for handling messages stuff
 */
export default class MessagesService {
  readonly activePeer = new BehaviorSubject<Peer | null>(null);

  readonly loadingSides = new BehaviorSubject<LoadingSide[]>([]);

  readonly focusedMessage = new BehaviorSubject<{ id: number, direction: Direction } | null>(null);

  readonly history = new BehaviorSubject<Readonly<number[]>>([]);

  pendingMessages: Record<string, MessageCommon> = {};

  protected cacheChunkRef?: MessagesChunkReference;

  constructor(userTyping: UserTyping, private peerService: PeerService) {
    client.updates.on('updateNewMessage', (update: AnyUpdateMessage) => {
      this.handleMessagePush(update.message);
    });

    client.updates.on('updateShortMessage', (update: AnyUpdateShortMessage) => {
      const message = shortMessageToMessage(client.getUserID(), update);
      this.handleMessagePush(message);
    });

    client.updates.on('updateShortChatMessage', (update: AnyUpdateShortMessage) => {
      const message = shortChatMessageToMessage(update);
      this.handleMessagePush(message);
    });

    client.updates.on('updateNewChannelMessage', (update: AnyUpdateMessage) => {
      this.handleMessagePush(update.message);
    });

    client.updates.on('updateDeleteMessages', (update: any) => {
      update.messages.forEach((messageId: number) => messageCache.remove(getUserMessageId(messageId)));
    });

    client.updates.on('updateDeleteChannelMessages', (update: any) => {
      // console.log('updateDeleteChannelMessages', update);
      update.messages.forEach((messageId: number) => messageCache.remove(
        peerMessageToId({ _: 'peerChannel', channel_id: update.channel_id }, messageId),
      ));
    });

    client.updates.on('updateUserStatus', (update: any) => {
      const user = userCache.get(update.user_id);
      if (user) {
        userCache.put({ ...user, status: update.status });
      }
    });

    client.updates.on('updateUserTyping', (update: any) => {
      userTyping.notify(update);
    });

    client.updates.on('updateChatUserTyping', (update: any) => {
      userTyping.notify(update);
    });
  }

  /**
   * messageId values:
   * - number - message sequential id to scroll to;
   * - undefined - scroll to the start of the history;
   */
  selectPeer(peer: Peer | null, messageId?: number) {
    // eslint-disable-next-line no-param-reassign
    messageId = messageId || Infinity;

    const isPeerChanged = (this.activePeer.value && peerToId(this.activePeer.value)) !== (peer && peerToId(peer));

    let isChunkChanged = false;
    let focusedMessageDirection = Direction.Around;
    if (isPeerChanged) {
      isChunkChanged = true;
    } else if (this.cacheChunkRef) {
      const messagePosition = this.cacheChunkRef.getMessagePosition(messageId || Infinity);
      if (messagePosition !== 0) {
        isChunkChanged = true;
        focusedMessageDirection = messagePosition < 0 ? Direction.Older : Direction.Newer;
      }
    }

    if (isPeerChanged) {
      this.activePeer.next(peer);
    }

    this.focusedMessage.next(peer && messageId !== Infinity ? { id: messageId, direction: focusedMessageDirection } : null);

    if (isChunkChanged) {
      if (this.cacheChunkRef) {
        this.cacheChunkRef.revoke();
        this.loadingSides.next([]);
      }

      if (peer) {
        this.cacheChunkRef = messageCache.indices.history.makeChunkReference(peer, messageId);
        this.cacheChunkRef.history.subscribe(({ ids }) => this.history.next(ids));

        if (messageId !== Infinity) {
          this.loadMessages(this.cacheChunkRef, Direction.Around, messageId);
        } else {
          const { ids } = this.cacheChunkRef.history.value;
          if (ids.length < LOAD_CHUNK_LENGTH) {
            this.loadMessages(this.cacheChunkRef, Direction.Older, ids[0] /* undefined is welcome here */);
          }
          if (ids.length > 0) {
            this.loadMessages(this.cacheChunkRef, Direction.Newer, ids[0], 0);
          }
        }
      } else {
        this.cacheChunkRef = undefined;
      }
    }

    if (peer) this.peerService.loadFullInfo(peer);
  }

  /**
   * Messages with id equal fromId and toId are not included to the result
   */
  protected loadMessages(chunkRef: MessagesChunkReference, direction: Direction, fromId?: number, toId?: number) {
    if (!this.activePeer.value) {
      return;
    }

    const loadingSides = DIRECTION_TO_SIDE[direction];
    if (this.loadingSides.value.some((side) => loadingSides.includes(side))) {
      return;
    }
    this.loadingSides.next(loadingSides);

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
      peer: peerToInputPeer(this.activePeer.value),
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
        payload.add_offset = -LOAD_CHUNK_LENGTH - 1; // -1 to not include fromId itself
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
    client.call('messages.getHistory', payload, (_err: any, data?: Exclude<Messages, MessagesNotModified>) => {
      // Another peer or chunk is loading at the moment
      const isLoadedChunkActual = chunkRef === this.cacheChunkRef;

      try {
        if (data) {
          // console.log('loadMessages - response', data);

          userCache.put(data.users);
          chatCache.put(data.chats);

          if (isLoadedChunkActual) {
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

            chunkRef.putChunk({
              messages: data.messages,
              newestReached,
              oldestReached,
            });
          } else {
            messageCache.put(data.messages);
          }
        }
      } finally {
        if (isLoadedChunkActual) {
          this.loadingSides.next(this.loadingSides.value.filter((side) => !loadingSides.includes(side)));
        }
      }
    });
  }

  loadMoreHistory(direction: Direction.Newer | Direction.Older) {
    if (!this.cacheChunkRef) {
      return;
    }
    const history = this.cacheChunkRef.history.value;
    switch (direction) {
      case Direction.Newer:
        if (!history.newestReached) {
          const offset_id = history.ids[0];
          this.loadMessages(this.cacheChunkRef, Direction.Newer, offset_id);
        }
        break;
      case Direction.Older:
        if (!history.oldestReached) {
          const offset_id = history.ids[history.ids.length - 1];
          this.loadMessages(this.cacheChunkRef, Direction.Older, offset_id);
        }
        break;
      default:
    }
  }

  protected handleMessagePush(message: Message) {
    if (message._ === 'messageEmpty') {
      return;
    }

    messageCache.indices.history.putNewestMessage(message);
  }

  sendMessage = (message: string) => {
    if (!this.activePeer.value) return;

    const randId = Math.ceil(Math.random() * 0xFFFFFF).toString(16) + Math.ceil(Math.random() * 0xFFFFFF).toString(16);
    const params = {
      peer: peerToInputPeer(this.activePeer.value),
      message,
      random_id: randId,
    };

    this.pendingMessages[randId] = {
      _: 'message',
      id: 0,
      out: true,
      from_id: client.getUserID(),
      to_id: this.activePeer.value,
      date: Math.floor(Date.now() / 1000),
      media: {
        _: 'messageMediaEmpty',
      },
      entities: [],
      message,
    };

    client.call('messages.sendMessage', params, (err, result) => {
      console.log('After sending', err, result);
      if (err) {
        // todo handling errors
      }

      if (result._ === 'updateShortSentMessage') {
        this.pendingMessages[randId].id = result.id;
        this.pendingMessages[randId].date = result.date;
        this.pendingMessages[randId].entities = result.entities;

        messageCache.indices.history.putNewestMessage(this.pendingMessages[randId]);
        delete this.pendingMessages[randId];
      }
    });
  };

  sendMediaMessage = (inputMedia: any) => {
    if (!this.activePeer.value) return;

    const randId = Math.ceil(Math.random() * 0xFFFFFF).toString(16) + Math.ceil(Math.random() * 0xFFFFFF).toString(16);
    const params = {
      peer: peerToInputPeer(this.activePeer.value),
      message: '',
      media: inputMedia,
      random_id: randId,
    };

    client.call('messages.sendMedia', params, (err, result) => {
      if (err) {
        // todo handling errors
      }

      console.log('After sending', err, result);
    });
  };
}
