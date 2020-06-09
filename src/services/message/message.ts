import { dialogCache, messageCache } from 'cache';
import { peerToInputChannel, peerToInputPeer } from 'cache/accessors';
import client, { fetchUpdates } from 'client/client';
import { arePeersSame, peerToDialogId, getDialogLastReadMessageId, getUserMessageId, peerMessageToId, shortChatMessageToMessage, shortMessageToMessage } from 'helpers/api';
import { ChannelsGetMessages, Dialog, InputMedia, Message, MessagesGetMessages, MessagesMessages, MessagesSendMedia, MethodDeclMap, Peer, Update, Updates } from 'mtproto-js';
import { BehaviorSubject, Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import makeMessageChunk, { MessageChunkService, MessageHistoryChunk } from './message_chunk';
import { Direction } from './types';

const emptyHistory: MessageHistoryChunk = { ids: [] };

export type PeerScrollTarget
  = 'auto' // Decide where to scroll automatically
  | 'firstUnread' // Scroll to the first unread message; if there is no last read message id, then to the bottom
  | 'none' // Don't scroll (stay as is);
  | number; // Message sequential id to stroll to; Infinity to go to the newest; -Infinity to go to the oldest.

/**
 * Singleton service class for handling messages stuff
 */
export default class MessagesService {
  readonly activePeer = new BehaviorSubject<Peer | null>(null);

  readonly focusMessage = new Subject<{ id: number, direction: Direction, highlight?: boolean }>();

  readonly history = new BehaviorSubject<MessageHistoryChunk>(emptyHistory);

  // True when there is one chunk showing and another one is loading to replace the current one
  readonly loadingNextChunk = new BehaviorSubject(false);

  readonly pendingMessages: Record<string, Message.message> = {};

  protected currentChunk?: MessageChunkService;

  protected nextChunk?: MessageChunkService;

  readonly replyToMessageID = new BehaviorSubject('');

  constructor() {
    client.updates.on('updateNewMessage', (update: Update.updateNewMessage) => {
      this.pushMessages([update.message]);
    });

    client.updates.on('updateShortMessage', (update: Updates.updateShortMessage) => {
      const message = shortMessageToMessage(client.getUserID(), update);
      this.pushMessages([message]);
    });

    client.updates.on('updateShortChatMessage', (update: Updates.updateShortChatMessage) => {
      const message = shortChatMessageToMessage(update);
      this.pushMessages([message]);
    });

    client.updates.on('updateNewChannelMessage', (update: Update.updateNewChannelMessage) => {
      this.pushMessages([update.message]);
    });

    client.updates.on('updateDeleteMessages', (update: Update.updateDeleteMessages) => {
      update.messages.forEach((messageId: number) => messageCache.remove(getUserMessageId(messageId)));
    });

    client.updates.on('updateDeleteChannelMessages', (update: Update.updateDeleteChannelMessages) => {
      // console.log('updateDeleteChannelMessages', update);
      update.messages.forEach((messageId: number) => messageCache.remove(
        peerMessageToId({ _: 'peerChannel', channel_id: update.channel_id }, messageId),
      ));
    });

    client.updates.on('updateMessageID', ({ id, random_id }: Update.updateMessageID) => {
      const msg = this.pendingMessages[random_id];
      if (!msg) return;

      msg.id = id;
      messageCache.indices.history.putNewestMessages([msg]);
      delete this.pendingMessages[random_id];
    });

    client.updates.on('updateShortSentMessage', (update: Updates.updateShortSentMessage) => {
      const pending = Object.keys(this.pendingMessages);

      if (pending.length >= 0) {
        const randId = pending[0];
        const msg = this.pendingMessages[randId];

        msg.id = update.id;
        msg.date = update.date;
        msg.entities = update.entities;
        msg.media = update.media;

        messageCache.indices.history.putNewestMessages([msg]);
        delete this.pendingMessages[randId];
      }
    });
  }

  selectPeer(peer: Peer | null, target: PeerScrollTarget = 'auto') {
    const messageId = this.peerScrollTargetToMessageId(peer, target);
    const isPeerChanged = !arePeersSame(this.activePeer.value, peer);

    let isChunkChanged = false;
    let focusedMessageDirection = Direction.Around;
    if (isPeerChanged) {
      isChunkChanged = true;
    } else if (this.currentChunk && messageId) {
      const messagePosition = this.currentChunk.getMessageRelation(messageId);
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

    if (isChunkChanged) {
      if (peer) {
        if (!isPeerChanged && this.currentChunk) {
          // Keep the current chunk until the next is loaded
          // Don't recreate the next chunk if it contains the target message
          if (!this.nextChunk || this.nextChunk.getMessageRelation(messageId!) !== 0) {
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
                  if (process.env.NODE_ENV !== 'production') {
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

    this.replyToMessageID.next('');
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
          messageCache.indices.history.putNewestMessages([message]);
        }
      });
    });
  }

  protected peerScrollTargetToMessageId(peer: Peer | null, _target: PeerScrollTarget): Exclude<number, 0> | undefined {
    let target: Exclude<PeerScrollTarget, 'auto'>;

    if (_target === 'auto') {
      if (arePeersSame(this.activePeer.value, peer)) {
        // Scroll to the bottom when the selected peer is selected again
        target = Infinity;
      } else {
        target = 'firstUnread';
      }
    } else {
      target = _target;
    }

    switch (target) {
      case 'none': return undefined;
      case 'firstUnread': {
        const dialog = peer && dialogCache.get(peerToDialogId(peer)) as Dialog.dialog | undefined;
        if (!dialog) {
          return Infinity;
        }
        const lastReadId = getDialogLastReadMessageId(dialog);
        return lastReadId === dialog.top_message ? Infinity : lastReadId;
      }
      default: return target || Infinity;
    }
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

  loadMessageReplyPromise?: Promise<MessagesMessages>;
  loadMessageReplyList: Message[] = [];

  /** Load single message */
  loadMessageReply = async (msg: Message.message) => {
    if (!this.loadMessageReplyPromise) {
      this.loadMessageReplyPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          if (msg.to_id._ === 'peerChannel') {
            const params: ChannelsGetMessages = {
              channel: peerToInputChannel(msg.to_id),
              id: this.loadMessageReplyList.map((m) => ({ _: 'inputMessageReplyTo', id: m.id })),
            };

            client.call('channels.getMessages', params)
              .then((messages) => {
                this.loadMessageReplyPromise = undefined;
                this.loadMessageReplyList = [];
                resolve(messages);
              })
              .catch(reject);
          } else {
            const params: MessagesGetMessages = {
              id: this.loadMessageReplyList.map((m) => ({ _: 'inputMessageReplyTo', id: m.id })),
            };

            client.call('messages.getMessages', params)
              .then((messages) => {
                this.loadMessageReplyPromise = undefined;
                this.loadMessageReplyList = [];
                resolve(messages);
              })
              .catch(reject);
          }
        });
      });
    }
    this.loadMessageReplyList.push(msg);

    const messages = await this.loadMessageReplyPromise;

    if (messages._ !== 'messages.messagesNotModified' && messages.messages.length > 0) {
      messageCache.put(messages.messages);
    }
  };

  sendMessage = async (message: string) => {
    if (!this.activePeer.value || !message) return;

    const randId = Math.ceil(Math.random() * 0xFFFFFF).toString(16) + Math.ceil(Math.random() * 0xFFFFFF).toString(16);
    const params: MethodDeclMap['messages.sendMessage']['req'] = {
      peer: peerToInputPeer(this.activePeer.value),
      message,
      random_id: randId,
    };

    if (this.replyToMessageID.value) {
      const replyMsg = messageCache.get(this.replyToMessageID.value);
      if (replyMsg) params.reply_to_msg_id = replyMsg.id;
      this.replyToMessageID.next('');
    }

    this.pendingMessages[randId] = {
      _: 'message',
      id: 0,
      out: true,
      from_id: client.getUserID(),
      to_id: this.activePeer.value,
      date: Math.floor(Date.now() / 1000),
      reply_to_msg_id: params.reply_to_msg_id,
      media: {
        _: 'messageMediaEmpty',
      },
      entities: [],
      message,
    };

    try {
      const updates = await client.call('messages.sendMessage', params);
      fetchUpdates(updates);
    } catch (err) {
      console.warn('Failed to send message', err);
      // todo handling errors
    }
  };

  sendMediaMessage = async (inputMedia: InputMedia) => {
    if (!this.activePeer.value) return;

    const randId = Math.ceil(Math.random() * 0xFFFFFF).toString(16) + Math.ceil(Math.random() * 0xFFFFFF).toString(16);
    const params: MessagesSendMedia = {
      peer: peerToInputPeer(this.activePeer.value),
      message: '',
      media: inputMedia,
      random_id: randId,
    };

    try {
      const updates = await client.call('messages.sendMedia', params);
      fetchUpdates(updates);
      // console.log('After sending', err, result);
    } catch (err) {
      console.warn('Failed to send message', err);
      // todo handling errors
    }
  };

  setMessageForReply(msgId: string) {
    this.replyToMessageID.next(msgId);
  }

  unsetReply() {
    this.replyToMessageID.next('');
  }
}
