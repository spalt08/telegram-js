import { BehaviorSubject } from 'rxjs';
import client from 'client/client';
import { Message, Peer, AnyUpdateMessage, AnyUpdateShortMessage } from 'cache/types';
import { chatCache, messageCache, userCache } from 'cache';
import { peerToInputPeer } from 'cache/accessors';
import { MessagesChunkReference } from 'cache/fastStorages/indices/messagesByPeers';
import { getUserMessageId, peerMessageToId, peerToId, shortMessageToMessage, shortChatMessageToMessage } from 'helpers/api';

/**
 * Singleton service class for handling messages stuff
 */
export default class MessagesService {
  activePeer = new BehaviorSubject<Peer | null>(null);

  isLoading = new BehaviorSubject<boolean>(false);

  history = new BehaviorSubject<Readonly<number[]>>([]);

  cacheChunkRef?: MessagesChunkReference;

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

  selectPeer(peer: Peer | null) {
    if (
      (peer && this.activePeer.value && peerToId(peer) === peerToId(this.activePeer.value))
      || (!peer && !this.activePeer.value)
    ) {
      return;
    }

    if (this.cacheChunkRef) {
      this.cacheChunkRef.revoke();
      this.cacheChunkRef = undefined;
    }

    if (this.isLoading.value) {
      this.isLoading.next(false);
    }
    this.activePeer.next(peer);

    if (peer) {
      this.cacheChunkRef = messageCache.indices.peers.makeChunkReference(peer, Infinity);
      this.cacheChunkRef.history.subscribe(({ ids }) => this.history.next(ids));
      this.loadMessages(); // todo: Load from the first to the newest in cache. Or mark the chunk as not newest and recreate the chunk reference.
    }
  }

  protected loadMessages(olderThanId = 0) {
    if (this.isLoading.value || !this.activePeer.value) return;

    this.isLoading.next(true);
    const cacheChunkRef = this.cacheChunkRef!; // Remember for the case when the peer or chunk changes during the loading

    const chunkLength = 100;
    const payload = {
      peer: peerToInputPeer(this.activePeer.value),
      offset_id: olderThanId,
      offset_date: 0,
      add_offset: 0,
      limit: chunkLength,
      max_id: 0,
      min_id: 0,
      hash: 0,
    };

    client.call('messages.getHistory', payload, (_err: any, res: any) => {
      if (cacheChunkRef !== this.cacheChunkRef) {
        // Another peer or chunk is loading at the moment
        return;
      }

      try {
        if (res) {
          const data = res;

          userCache.put(data.users);
          chatCache.put(data.chats);
          cacheChunkRef.putChunk({
            messages: data.messages,
            oldestReached: data.messages.length < chunkLength - 10, // -10 just in case
          });
        }
      } finally {
        this.isLoading.next(false);
      }
    });
  }

  loadMoreHistory() {
    const history = this.cacheChunkRef && this.cacheChunkRef.history.value;
    if (history && !history.oldestReached) {
      const offset_id = history.ids[history.ids.length - 1];
      this.loadMessages(offset_id);
    }
  }

  protected handleMessagePush(message: Message) {
    if (message._ === 'messageEmpty') {
      return;
    }

    messageCache.indices.peers.putNewestMessage(message);
  }
}
