import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { Message, Peer, AnyUpdateMessage, AnyUpdateShortMessage, MessageCommon } from 'cache/types';
import { messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import { getUserMessageId, peerMessageToId, peerToId, shortMessageToMessage, shortChatMessageToMessage } from 'helpers/api';
import { Direction } from './types';
import makeMessageChunk, { MessageChunkService, MessageHistoryChunk } from './message_chunk';

export type MessageHistoryChunk = MessageHistoryChunk;

/**
 * Singleton service class for handling messages stuff
 */
export default class MessagesService {
  readonly activePeer = new BehaviorSubject<Peer | null>(null);

  readonly focusedMessage = new BehaviorSubject<{ id: number, direction: Direction } | null>(null);

  readonly history = new BehaviorSubject<MessageHistoryChunk>({ ids: [] });

  readonly pendingMessages: Record<string, MessageCommon> = {};

  protected chunk?: MessageChunkService;

  constructor() {
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
    } else if (this.chunk) {
      const messagePosition = this.chunk.getMessagePosition(messageId);
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
      if (this.chunk) {
        this.chunk.destroy();
      }

      if (peer) {
        this.chunk = makeMessageChunk(peer, messageId);
        this.chunk.history.subscribe(this.history);
      } else {
        this.chunk = undefined;
      }
    }
  }

  loadMoreHistory(direction: Direction.Newer | Direction.Older) {
    if (this.chunk) {
      this.chunk.loadMore(direction);
    }
  }

  protected handleMessagePush(message: Message) {
    if (message._ === 'messageEmpty') {
      return;
    }

    messageCache.indices.history.putNewestMessage(message);
  }

  /** Load single message */
  loadMessage = (id: number, cb: (msg: Message) => void) => {
    client.call('messages.getMessages', { id: [{ _: 'inputMessageID', id }] }, (err, res) => {
      if (!err && res && res.messages && res.messages.length > 0) {
        messageCache.put(res.messages);
        cb(res.messages[0]);
      }
    });
  };

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
