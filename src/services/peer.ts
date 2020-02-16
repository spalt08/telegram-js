import { debounceTime, switchMap, map } from 'rxjs/operators';
import { timer } from 'rxjs';
import client from 'client/client';
import { UserFull, Peer, InputUser, ChannelsGetFullChannel, MessagesGetMessages, ChannelsGetMessages } from 'cache/types';
import { userFullCache, chatCache, chatFullCache, userCache, pinnedMessageCache } from 'cache';
import MessageService from './message/message';

const UPDATE_INTERVAL = 60 * 1000; // every minute

/**
 * Singleton service class for handling peers
 */
export default class PeerService {
  constructor(messageService: MessageService) {
    messageService.activePeer
      .pipe(
        debounceTime(300), // Wait a bit to not interfere the messages loading
        switchMap((peer) => timer(0, UPDATE_INTERVAL).pipe(map(() => peer))), // periodically update full info about the peer
      )
      .subscribe((peer) => this.loadFullInfo(peer));
  }

  private loadFullInfo(peer: Peer | null) {
    if (!peer) return;

    if (peer._ === 'peerChannel') {
      const chat = chatCache.get(peer.channel_id);
      if (!chat || chat._ !== 'channel') return;
      const payload: ChannelsGetFullChannel = {
        channel: {
          _: 'inputChannel',
          channel_id: peer.channel_id,
          access_hash: chat.access_hash,
        },
      };
      client.call('channels.getFullChannel', payload, (err, channelFull) => {
        if (channelFull?.full_chat.pinned_msg_id) {
          chatFullCache.put(channelFull.full_chat);
          this.loadPinnedMessage(peer, channelFull.full_chat.pinned_msg_id);
        }
      });
    } else if (peer._ === 'peerChat') {
      const payload = {
        chat_id: peer.chat_id,
      };
      client.call('messages.getFullChat', payload, (err, chatFull) => {
        if (chatFull?.full_chat.pinned_msg_id) {
          chatFullCache.put(chatFull.full_chat);
          this.loadPinnedMessage(peer, chatFull.full_chat.pinned_msg_id);
        }
      });
    } else if (peer._ === 'peerUser') {
      const user = userCache.get(peer.user_id);
      if (user?._ !== 'user') return;
      const payload: { id: InputUser } = {
        id: { _: 'inputUser', user_id: peer.user_id, access_hash: user.access_hash! },
      };
      client.call('users.getFullUser', payload, (err, userFull: UserFull) => {
        if (userFull.pinned_msg_id) {
          userFullCache.put(userFull);
          this.loadPinnedMessage(peer, userFull.pinned_msg_id);
        }
      });
    }
  }

  private loadPinnedMessage(peer: Peer, pinnedMessageId: number) {
    if (peer._ === 'peerChannel') {
      const channel = chatCache.get(peer.channel_id);
      if (channel?._ !== 'channel') return;
      const payload: ChannelsGetMessages = {
        channel: { _: 'inputChannel', channel_id: peer.channel_id, access_hash: channel.access_hash! },
        id: [{ _: 'inputMessageID', id: pinnedMessageId }],
      };
      client.call('channels.getMessages', payload, (err, msg) => {
        if (msg?._ === 'messages.messages' && msg.messages.length > 0) pinnedMessageCache.put(msg.messages[0]);
      });
    } else {
      const payload: MessagesGetMessages = { id: [{ _: 'inputMessageID', id: pinnedMessageId }] };
      client.call('messages.getMessages', payload, (err, msg) => {
        if (msg?._ === 'messages.messages' && msg.messages.length > 0) {
          pinnedMessageCache.put(msg.messages[0]);
        }
      });
    }
  }
}
