import client from 'client/client';
import { Chat, MessagesChatFull } from 'cache/types';
import { chatFullCache } from 'cache';

/**
 * Singleton service class for handling users
 */
export default class ChatService {
  loadFullInfo(chat: Chat) {
    if (chat._ === 'channel') {
      const payload = {
        channel: {
          _: 'inputChannel',
          channel_id: chat.id,
          access_hash: chat.access_hash,
        },
      };
      client.call('channels.getFullChannel', payload, (err, channelFull: MessagesChatFull) => {
        chatFullCache.put(channelFull.full_chat);
      });
    } else {
      const payload = {
        chat_id: chat.id,
      };
      client.call('messages.getFullChat', payload, (err, chatFull: MessagesChatFull) => {
        chatFullCache.put(chatFull.full_chat);
      });
    }
  }
}
