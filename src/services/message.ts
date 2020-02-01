import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { Message, Peer, AnyShortMessage } from 'cache/types';
import { chatCache, messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import { getUserMessageId, peerMessageToId, peerToId, shortMessageToMessage, shortChatMessageToMessage } from 'helpers/api';

/**
 * Singleton service class for handling messages stuff
 */
export default class MessagesService {
  activePeer = new BehaviorSubject<Peer | null>(null);

  isLoading = new BehaviorSubject<boolean>(false);

  history = new BehaviorSubject<Readonly<number[]>>([]);

  peerHistoryUnsubscribe: (() => void) | undefined;

  constructor() {
    client.updates.on('updateNewMessage', (update: any) => {
      // console.log('updateNewMessage', update);
      this.handleMessagePush(update.message);
    });

    client.updates.on('updateShortMessage', (update: AnyShortMessage) => {
      // todo store userid
      // console.log('updateShortMessage', update);
      const message = shortMessageToMessage(client.getUserID(), update);
      this.handleMessagePush(message);
    });

    client.updates.on('updateShortChatMessage', (update: AnyShortMessage) => {
      const message = shortChatMessageToMessage(update);

      if (process.env.NODE_ENV === 'development') {
        console.log(update);
        console.log(message);
      }
      // this.handleMessagePush(message);
    });

    client.updates.on('updateNewChannelMessage', (update: any) => {
      // console.log('updateNewChannelMessage', update);
      this.handleMessagePush(update.message);
    });

    client.updates.on('updateDeleteMessages', (update: any) => {
      // console.log('updateDeleteMessage', update);
      update.messages.forEach((messageId: number) => messageCache.remove(getUserMessageId(messageId)));
    });

    client.updates.on('updateDeleteChannelMessages', (update: any) => {
      // console.log('updateDeleteChannelMessages', update);
      update.messages.forEach((messageId: number) => messageCache.remove(
        peerMessageToId({ _: 'peerChannel', channel_id: update.channel_id }, messageId),
      ));
    });
  }

  selectPeer(peer: Peer) {
    if (this.activePeer.value && peerToId(peer) === peerToId(this.activePeer.value)) {
      return;
    }

    if (this.peerHistoryUnsubscribe) {
      this.peerHistoryUnsubscribe();
    }

    this.activePeer.next(peer);
    this.history.next(messageCache.indices.peers.getHistory(peer));
    this.peerHistoryUnsubscribe = messageCache.indices.peers.watchHistory(peer, (history) => {
      this.history.next(history);
    });

    this.loadMessages(peer, 0);
  }

  protected loadMessages(peer: Peer, olderThanId = 0) {
    if (this.isLoading.value) return;

    this.isLoading.next(true);

    const chunk = 100;
    const payload = {
      peer: peerToInputPeer(peer),
      offset_id: olderThanId,
      offset_date: 0,
      add_offset: 0,
      limit: chunk,
      max_id: 0,
      min_id: 0,
      hash: 0,
    };

    client.call('messages.getHistory', payload, (_err: any, res: any) => {
      try {
        if (res) {
          const data = res;

          userCache.put(data.users);
          chatCache.put(data.chats);
          messageCache.indices.peers.putHistoryMessages(data.messages);
          if (data.messages.length < chunk - 10) { // -10 just in case
            messageCache.indices.peers.pubHistoryComplete(peer);
          }
        }
      } finally {
        this.isLoading.next(false);
      }
    });
  }

  loadMoreHistory() {
    if (this.activePeer.value && !messageCache.indices.peers.isHistoryComplete(this.activePeer.value)) {
      const offset_id = this.history.value[this.history.value.length - 1];
      this.loadMessages(this.activePeer.value, offset_id);
    }
  }

  protected handleMessagePush(message: Message) {
    if (message._ === 'messageEmpty') {
      return;
    }

    messageCache.indices.peers.putHistoryMessages([message]);
  }
}
