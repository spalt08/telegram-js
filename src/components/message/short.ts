import { userCache } from 'cache';
import { Message } from 'mtproto-js';
import { getAttributeSticker } from 'helpers/files';
import { todoAssertHasValue } from 'helpers/other';

const MAX_LENGTH = 200;

export default function messageShort(msg: Message) {
  switch (msg._) {
    case 'messageEmpty': return '';
    case 'messageService': {
      const user = userCache.get(todoAssertHasValue(msg.from_id));
      const userLabel = user?._ === 'user' ? user.first_name : 'Someone';

      switch (msg.action._) {
        case 'messageActionChatCreate': return `${userLabel} created the group`;
        case 'messageActionChatEditPhoto': return `${userLabel} updated group photo`;
        case 'messageActionChatEditTitle': return `${userLabel} changed the group title`;
        case 'messageActionChatDeletePhoto': return `${userLabel} updated deleted photo`;
        case 'messageActionChatAddUser': return `${userLabel} joined the group`;
        case 'messageActionChatDeleteUser': return `${userLabel} removed someone from the group`;
        case 'messageActionChannelCreate': return `${userLabel} created the channel`;
        case 'messageActionChatMigrateTo': return 'Group was converted to supergroup';
        case 'messageActionChannelMigrateFrom': return 'Channel was created from group';
        case 'messageActionPinMessage': return `${userLabel} pinned the message`;
        case 'messageActionCustomAction': return msg.action.message;
        case 'messageActionPhoneCall': return '🤙 Incoming call';
        default: return '';
      }
    }
    case 'message': {
      const content = msg.message.slice(0, MAX_LENGTH);
      if (content) {
        return content;
      }

      if (msg.media && msg.media._ !== 'messageMediaEmpty') {
        switch (msg.media._) {
          case 'messageMediaPhoto': return '🖼 Photo';
          case 'messageMediaGeo': return '📍 Location';
          case 'messageMediaContact': return '👤 Contact';
          case 'messageMediaGeoLive': return '📍 Live Location';
          case 'messageMediaPoll': return `📊 ${msg.media.poll.question}`;
          case 'messageMediaDocument':
            if (msg.media.document?._ === 'document') {
              const isSticker = getAttributeSticker(msg.media.document);
              return isSticker ? `${isSticker.alt} Sticker` : '📄 Document';
            }
            break;
          default:
        }
      }

      return content;
    }
    default:
      return '';
  }
}
