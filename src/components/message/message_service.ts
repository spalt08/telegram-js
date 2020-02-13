import { MessageService, User } from 'cache/types';
import { div, strong, text } from 'core/html';
import { userCache } from 'cache';
import './message_service.scss';

function userNameToHtml(user?: User) {
  return strong(text(user ? `${user.first_name} ${user.last_name}` : 'Deleted Account'));
}

export default function serviceMessage(msg: MessageService) {
  const user = userCache.get(msg.from_id);

  switch (msg.action._) {
    case 'messageActionChatCreate': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              userNameToHtml(user),
              text(' created the group '),
              strong(text(msg.action.title)),
            ),
          ),
        )
      );
    }

    case 'messageActionChatEditPhoto': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              userNameToHtml(user),
              text(' updated group photo'),
            ),
          ),
        )
        // todo display photo
      );
    }

    case 'messageActionChatEditTitle': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              userNameToHtml(user),
              text(' changed title to '),
              strong(text(msg.action.title)),
            ),
          ),
        )
      );
    }

    case 'messageActionChatDeletePhoto': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              userNameToHtml(user),
              text(' deleted group photo '),
            ),
          ),
        )
      );
    }

    case 'messageActionChatAddUser': {
      return div`.msgservice`(
        div`.msgservice__wrapper`(
          ...msg.action.users.map((user_id: number) => {
            const invited = userCache.get(user_id);
            return div`.msgservice__inner`(
              userNameToHtml(invited),
              text(' joined the group'),
            );
          }),
        ),
      );
    }

    case 'messageActionChatDeleteUser': {
      const removed = userCache.get(msg.action.user_id);
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              userNameToHtml(user),
              text(' removed '),
              strong(text(removed ? `${removed.first_name} ${removed.last_name}` : '')),
            ),
          ),
        )
      );
    }

    case 'messageActionChannelCreate': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              userNameToHtml(user),
              text(' created channel '),
              strong(text(msg.action.title)),
            ),
          ),
        )
      );
    }

    case 'messageActionChatMigrateTo': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              text('Group was converted to supergroup'),
            ),
          ),
        )
      );
    }

    case 'messageActionChannelMigrateFrom': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              text('Channel was created from group '),
              strong(text(msg.action.title)),
            ),
          ),
        )
      );
    }

    case 'messageActionPinMessage': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              userNameToHtml(user),
              text(' pinned message'),
            ),
          ),
        )
      );
    }

    case 'messageActionScreenshotTaken': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              userNameToHtml(user),
              text(' made a screenshot'),
            ),
          ),
        )
      );
    }

    case 'messageActionCustomAction': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              text(msg.action.message),
            ),
          ),
        )
      );
    }

    case 'messageActionContactSignUp': {
      return (
        div`.msgservice`(
          div`.msgservice__wrapper`(
            div`.msgservice__inner`(
              userNameToHtml(user),
              text(' joined Telegram'),
            ),
          ),
        )
      );
    }

    default:
      return div();
  }
}
