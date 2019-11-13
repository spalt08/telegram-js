import { Peer } from 'cache/types';
import { useUser, useChat } from 'cache/hooks';
import { text } from 'core/html';

export default function peerTitle(peer: Peer) {
  switch (peer._) {
    case 'peerUser': {
      const user = useUser(peer.user_id);

      if (user) return text(`${user.first_name} ${user.last_name}`);
      return text('Unknown');
    }

    case 'peerChat': {
      const chat = useChat(peer.chat_id);

      if (chat) return text(chat.title);
      return text('Unknown');
    }

    case 'peerChannel': {
      const chat = useChat(peer.channel_id);

      if (chat) return text(chat.title);
      return text('Unknown');
    }

    default:
      return text('Unknown');
  }
}
