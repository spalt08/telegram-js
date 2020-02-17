import { debounceTime, switchMap, map } from 'rxjs/operators';
import { timer } from 'rxjs';
import client from 'client/client';
import { Peer, MessagesGetMessages, ChannelsGetMessages, UsersGetFullUser, ChannelsGetFullChannel } from 'cache/types';
import { userFullCache, chatCache, chatFullCache, userCache, pinnedMessageCache } from 'cache';
import { todoAssertHasValue } from 'helpers/other';
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
          access_hash: todoAssertHasValue(chat.access_hash),
        },
      };
      client.call('channels.getFullChannel', payload, (_err, channelFull) => {
        if (channelFull?.full_chat) {
          userCache.put(channelFull.users);
          chatCache.put(channelFull.chats);
          chatFullCache.put(channelFull.full_chat);
          if (channelFull.full_chat.pinned_msg_id) {
            this.loadPinnedMessage(peer, channelFull.full_chat.pinned_msg_id);
          }
        }
      });
    } else if (peer._ === 'peerChat') {
      const payload = { chat_id: peer.chat_id };
      client.call('messages.getFullChat', payload, (_err, chatFull) => {
        if (chatFull?.full_chat) {
          userCache.put(chatFull.users);
          chatCache.put(chatFull.chats);
          chatFullCache.put(chatFull.full_chat);
          if (chatFull.full_chat.pinned_msg_id) {
            this.loadPinnedMessage(peer, chatFull.full_chat.pinned_msg_id);
          }
        }
      });
    } else if (peer._ === 'peerUser') {
      const user = userCache.get(peer.user_id);
      if (user?._ !== 'user') return;
      const payload: UsersGetFullUser = {
        id: { _: 'inputUser', user_id: peer.user_id, access_hash: todoAssertHasValue(user.access_hash) },
      };
      client.call('users.getFullUser', payload, (_err, userFull) => {
        if (userFull) {
          userFullCache.put(userFull);
          if (userFull.pinned_msg_id) {
            this.loadPinnedMessage(peer, userFull.pinned_msg_id);
          }
        }
      });
    }
  }

  private loadPinnedMessage(peer: Peer, pinnedMessageId: number) {
    if (peer._ === 'peerChannel') {
      const channel = chatCache.get(peer.channel_id);
      if (channel?._ !== 'channel') return;
      const payload: ChannelsGetMessages = {
        channel: { _: 'inputChannel', channel_id: peer.channel_id, access_hash: todoAssertHasValue(channel.access_hash) },
        id: [{ _: 'inputMessageID', id: pinnedMessageId }],
      };
      client.call('channels.getMessages', payload, (_err, msg) => {
        if (msg?._ === 'messages.channelMessages' && msg.messages.length > 0 && msg.messages[0]._ === 'message') {
          userCache.put(msg.users);
          chatCache.put(msg.chats);
          pinnedMessageCache.put(msg.messages[0]);
        }
      });
    } else {
      const payload: MessagesGetMessages = { id: [{ _: 'inputMessageID', id: pinnedMessageId }] };
      client.call('messages.getMessages', payload, (_err, msg) => {
        if (msg?._ === 'messages.messages' && msg.messages.length > 0 && msg.messages[0]._ === 'message') {
          userCache.put(msg.users);
          chatCache.put(msg.chats);
          pinnedMessageCache.put(msg.messages[0]);
        }
      });
    }
  }
}
