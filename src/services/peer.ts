import client from 'client/client';
import { UserFull, Peer, MessagesChatFull } from 'cache/types';
import { userFullCache, chatCache, chatFullCache, userCache } from 'cache';

/**
 * Singleton service class for handling peers
 */
export default class PeerService {
  loadFullInfo(peer: Peer | null) {
    if (!peer) return;

    if (peer._ === 'peerChannel') {
      const chat = chatCache.get(peer.channel_id);
      if (!chat || chat._ !== 'channel') return;
      const payload = {
        channel: {
          _: 'inputChannel',
          channel_id: peer.channel_id,
          access_hash: chat.access_hash,
        },
      };
      client.call('channels.getFullChannel', payload, (err, channelFull: MessagesChatFull) => {
        if (channelFull) chatFullCache.put(channelFull.full_chat);
      });
    } else if (peer._ === 'peerChat') {
      const payload = {
        chat_id: peer.chat_id,
      };
      client.call('messages.getFullChat', payload, (err, chatFull: MessagesChatFull) => {
        if (chatFull) chatFullCache.put(chatFull.full_chat);
      });
    } else if (peer._ === 'peerUser') {
      const user = userCache.get(peer.user_id);
      if (!user) return;
      const payload = {
        id: { _: 'inputUser', user_id: peer.user_id, access_hash: user.access_hash },
      };
      client.call('users.getFullUser', payload, (err, userFull: UserFull) => {
        userFullCache.put(userFull);
      });
    }
  }
}
