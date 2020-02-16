import { userCache } from 'cache';
import { Message } from 'cache/types';
import { getAttributeSticker } from 'helpers/files';
import { todoAssertHasValue } from 'helpers/other';

export default function messageShort(msg: Message) {
  let content = 'Message';

  if (msg._ === 'messageEmpty') return content;

  if (msg._ === 'messageService') {
    const user = userCache.get(todoAssertHasValue(msg.from_id));
    const userLabel = user?._ === 'user' ? user.first_name : 'Someone';

    switch (msg.action._) {
      case 'messageActionChatCreate': content = `${userLabel} created the group`; break;
      case 'messageActionChatEditPhoto': content = `${userLabel} updated group photo`; break;
      case 'messageActionChatEditTitle': content = `${userLabel} changed the group title`; break;
      case 'messageActionChatDeletePhoto': content = `${userLabel} updated deleted photo`; break;
      case 'messageActionChatAddUser': content = `${userLabel} joined the group`; break;
      case 'messageActionChatDeleteUser': content = `${userLabel} removed someone from the group`; break;
      case 'messageActionChannelCreate': content = `${userLabel} created the channel`; break;
      case 'messageActionChatMigrateTo': content = 'Group was converted to supergroup'; break;
      case 'messageActionChannelMigrateFrom': content = 'Channel was created from group'; break;
      case 'messageActionPinMessage': content = `${userLabel} pinned the message`; break;
      case 'messageActionCustomAction': content = msg.action.message; break;
      case 'messageActionPhoneCall': content = '🤙Incoming call'; break;
      default: content = '';
    }
  } else {
    content = msg.message;
  }

  if (!content && msg._ === 'message' && msg.media && msg.media._ !== 'messageMediaEmpty') {
    if (msg.media._ === 'messageMediaPhoto') content = content ? `🖼${content}` : '🖼 Photo';
    if (msg.media._ === 'messageMediaGeo') content = '📍 Location';
    if (msg.media._ === 'messageMediaContact') content = '👤 Contact';
    if (msg.media._ === 'messageMediaGeoLive') content = '📍 Live Location';
    if (msg.media._ === 'messageMediaPoll') content = '📊 Poll';
    if (msg.media._ === 'messageMediaDocument' && msg.media.document?._ === 'document') {
      const isSticker = getAttributeSticker(msg.media.document);
      if (isSticker) content = `${isSticker.alt}Sticker`;
      else content = 'Document';
    }
  }

  return content;
}
