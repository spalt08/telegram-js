import { BehaviorSubject, Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import client from 'client/client';
import { Message, Peer, AnyUpdateMessage, AnyUpdateShortMessage, MessageCommon } from 'cache/types';
import { messageCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import { getUserMessageId, peerMessageToId, peerToId, shortMessageToMessage, shortChatMessageToMessage } from 'helpers/api';
import { Direction } from './types';
import makeMessageChunk, { MessageChunkService, MessageHistoryChunk } from './message_chunk';

const emptyHistory: MessageHistoryChunk = { ids: [] };

/**
 * Singleton service class for handling messages stuff
 */
export default class MessagesService {
  readonly activePeer = new BehaviorSubject<Peer | null>(null);

  readonly focusMessage = new Subject<{ id: number, direction: Direction, highlight?: boolean }>();

  readonly history = new BehaviorSubject<MessageHistoryChunk>(emptyHistory);

  // True when there is one chunk showing and another one is loading to replace the current one
  readonly loadingNextChunk = new BehaviorSubject(false);

  readonly pendingMessages: Record<string, MessageCommon> = {};

  protected currentChunk?: MessageChunkService;

  protected nextChunk?: MessageChunkService;

  constructor() {
    client.updates.on('updateNewMessage', (update: AnyUpdateMessage) => {
      this.pushMessages([update.message]);
    });

    client.updates.on('updateShortMessage', (update: AnyUpdateShortMessage) => {
      const message = shortMessageToMessage(client.getUserID(), update);
      this.pushMessages([message]);
    });

    client.updates.on('updateShortChatMessage', (update: AnyUpdateShortMessage) => {
      const message = shortChatMessageToMessage(update);
      this.pushMessages([message]);
    });

    client.updates.on('updateNewChannelMessage', (update: AnyUpdateMessage) => {
      this.pushMessages([update.message]);
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
  }

  /**
   * messageId values:
   * - number - message sequential id to scroll to;
   * - Infinity - scroll to the bottom of the history;
   * - -Infinity - scroll to the top of the history;
   * - undefined - don't scroll (stay as is);
   */
  selectPeer(peer: Peer | null, _messageId?: number) {
    const messageId = _messageId === 0 ? Infinity : _messageId;

    const isPeerChanged = (this.activePeer.value && peerToId(this.activePeer.value)) !== (peer && peerToId(peer));

    let isChunkChanged = false;
    let focusedMessageDirection = Direction.Around;
    if (isPeerChanged) {
      isChunkChanged = true;
    } else if (this.currentChunk && messageId) {
      const messagePosition = this.currentChunk.getMessagePosition(messageId);
      if (messagePosition !== 0) {
        isChunkChanged = true;
        if (messagePosition !== null) {
          focusedMessageDirection = messagePosition < 0 ? Direction.Older : Direction.Newer;
        }
      }
    }

    if (isPeerChanged) {
      this.activePeer.next(peer);
    }

    // When you click different found messages fast, the history becomes empty occasionally. Todo: investigate.

    if (isChunkChanged) {
      if (peer) {
        if (!isPeerChanged && this.currentChunk) {
          // Keep the current chunk until the next is loaded
          // Don't recreate the next chunk if it contains the target message
          if (!this.nextChunk || this.nextChunk.getMessagePosition(messageId!) !== 0) {
            if (this.nextChunk) {
              this.nextChunk.destroy();
            }
            const nextChunk = makeMessageChunk(peer, messageId!);
            this.nextChunk = nextChunk;
            this.loadingNextChunk.next(true);

            // Wait until the next chunk is loaded to make it the be the current chunk
            nextChunk.history
              .pipe(first(({ ids, loadingNewer, loadingOlder }) => (ids.length >= 3 || !(loadingNewer || loadingOlder))))
              .subscribe(() => {
                if (nextChunk !== this.nextChunk) {
                  if (process.env.NODE_ENV === 'development') {
                    // eslint-disable-next-line no-console
                    console.error(
                      'The `nextChunk.history` was updated after the chunk was removed from the message service.'
                      + ' Make sure you call `destroy()` while removing a chunk.',
                    );
                  }
                  return;
                }
                if (this.currentChunk) {
                  this.currentChunk.destroy();
                }
                this.nextChunk = undefined;
                this.loadingNextChunk.next(false);
                this.setCurrentChunk(nextChunk, messageId, focusedMessageDirection);
              });
          }
        } else {
          // Replace all the chunks with a single chunk
          if (this.nextChunk) {
            this.nextChunk.destroy();
            this.nextChunk = undefined;
            this.loadingNextChunk.next(false);
          }
          if (this.currentChunk) {
            this.currentChunk.destroy();
          }
          this.setCurrentChunk(makeMessageChunk(peer, messageId || Infinity), messageId, focusedMessageDirection);
        }
      } else {
        // No peer – no chunks
        if (this.nextChunk) {
          this.nextChunk.destroy();
          this.nextChunk = undefined;
          this.loadingNextChunk.next(false);
        }
        if (this.currentChunk) {
          this.currentChunk.destroy();
          this.currentChunk = undefined;
        }
        this.history.next(emptyHistory);
      }
    } else {
      if (messageId) {
        this.focusToMessage(messageId, focusedMessageDirection);
      }

      // Remove the chunk in progress to not jump to it when it's loaded
      if (this.nextChunk) {
        this.nextChunk.destroy();
        this.nextChunk = undefined;
        this.loadingNextChunk.next(false);
      }
    }
  }

  loadMoreHistory(direction: Direction.Newer | Direction.Older) {
    if (this.currentChunk) {
      this.currentChunk.loadMore(direction);
    }
  }

  /**
   * Call this method instead of writing directly to messageCache.indices.history.putNewestMessage.
   *
   * The messages may have random peers and order.
   */
  pushMessages(messages: Message[]) {
    messageCache.batchChanges(() => {
      messages.forEach((message) => {
        if (message._ !== 'messageEmpty') {
          messageCache.indices.history.putNewestMessage(message);
        }
      });
    });
  }

  protected setCurrentChunk(chunk: MessageChunkService, focusMessageId?: number, focusDirection = Direction.Around) {
    this.currentChunk = chunk;

    if (focusMessageId) {
      if (Number.isFinite(focusMessageId)) {
        this.focusToMessage(focusMessageId, focusDirection);
      } else {
        // Wait for the messages to load to get the newest message id
        chunk.history
          .pipe(first(({ ids }) => ids.length > 0))
          .subscribe(({ ids }) => {
            this.focusToMessage(focusMessageId > 0 ? ids[0] : ids[ids.length - 1], focusDirection, true);
          });
      }
    }

    // Also takes the current history from the chunk and puts it to the service history immediately
    chunk.history.subscribe(this.history);
  }

  protected focusToMessage(messageId: number, direction: Direction, noHighlight = false) {
    const history = this.history.value;
    if (messageId === Infinity) {
      if (history.newestReached && history.ids.length) {
        this.focusMessage.next({ id: history.ids[0], direction });
      }
    } else if (messageId === -Infinity) {
      if (history.oldestReached && history.ids.length) {
        this.focusMessage.next({ id: history.ids[history.ids.length - 1], direction });
      }
    } else {
      this.focusMessage.next({ id: messageId, direction, highlight: !noHighlight });
    }
  }

  /** Load single message */
  loadMessageReply = (msg: MessageCommon, cb: (msg: Message) => void) => {
    const params = { id: [{ _: 'inputMessageReplyTo', id: msg.id }, { _: 'inputMessageID', id: msg.reply_to_msg_id }] };

    client.call('messages.getMessages', params, (err, res) => {
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
      // console.log('After sending', err, result);
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

    client.call('messages.sendMedia', params, (err, _result) => {
      if (err) {
        // todo handling errors
      }

      // console.log('After sending', err, result);
    });
  };
}
