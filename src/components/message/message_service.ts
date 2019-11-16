import { MessageService } from 'cache/types';
import { div, strong, text } from 'core/html';
import { userCache } from 'cache';
import './message_service.scss';

export default function serviceMessage(msg: MessageService) {
  const user = userCache.get(msg.from_id);

  switch (msg.action._) {
    case 'messageActionChatCreate': {
      return (
        div`.msgservice`(
          strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
          text(' created the group '),
          strong(text(msg.action.title)),
        )
      );
    }

    case 'messageActionChatEditPhoto': {
      return (
        div`.msgservice`(
          strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
          text(' updated group photo'),
        )
        // todo display photo
      );
    }

    case 'messageActionChatEditTitle': {
      return (
        div`.msgservice`(
          strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
          text(' changed title to '),
          strong(text(msg.action.title)),
        )
      );
    }

    case 'messageActionChatDeletePhoto': {
      return (
        div`.msgservice`(
          strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
          text(' deleted group photo '),
        )
      );
    }

    case 'messageActionChatAddUser': {
      return div(
        ...msg.action.users.map((user_id: number) => {
          const invited = userCache.get(user_id);
          return div`.msgservice`(
            strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
            text(' invited '),
            strong(text(invited ? `${invited.first_name} ${invited.last_name}` : '')),
          );
        }),
      );
    }

    case 'messageActionChatDeleteUser': {
      const removed = userCache.get(msg.action.user_id);
      return (
        div`.msgservice`(
          strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
          text(' removed '),
          strong(text(removed ? `${removed.first_name} ${removed.last_name}` : '')),
        )
      );
    }

    case 'messageActionChannelCreate': {
      return (
        div`.msgservice`(
          strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
          text(' created channel '),
          strong(text(msg.action.title)),
        )
      );
    }

    case 'messageActionChatMigrateTo': {
      return (
        div`.msgservice`(
          text('Group was converted to supergroup'),
        )
      );
    }

    case 'messageActionChannelMigrateFrom': {
      return (
        div`.msgservice`(
          text('Channel was created from group '),
          strong(text(msg.action.title)),
        )
      );
    }

    case 'messageActionPinMessage': {
      return (
        div`.msgservice`(
          strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
          text(' pinned message'),
        )
      );
    }

    case 'messageActionScreenshotTaken': {
      return (
        div`.msgservice`(
          strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account')),
          text(' made a screenshot'),
        )
      );
    }

    case 'messageActionCustomAction': {
      return (
        div`.msgservice`(
          text(msg.action.message),
        )
      );
    }

    default:
      return div();
  }
}
