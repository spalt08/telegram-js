import { text } from 'core/html';
import { userCache, chatCache } from 'cache';
import { Peer } from 'cache/types';
import './avatar.scss';

export default function profileTitle(peer: Peer) {
  switch (peer._) {
    case 'peerUser': {
      const user = userCache.get(peer.user_id);
      if (user) return text(`${user.first_name} ${user.last_name}`);
      break;
    }

    case 'peerChat': {
      const chat = chatCache.get(peer.chat_id);
      if (chat) return text(`${chat.title}`);
      break;
    }

    case 'peerChannel': {
      const channel = chatCache.get(peer.channel_id);
      if (channel) return text(`${channel.title}`);
      break;
    }

    default:
      return text('');
  }

  return text('');
}
