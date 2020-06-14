
import { userCache } from 'cache';
import { userToTitle } from 'cache/accessors';
import { profileTitle } from 'components/profile';
import { div, strong, text } from 'core/html';
import { userIdToPeer } from 'helpers/api';
import { Message, Peer } from 'mtproto-js';
import './service.scss';

export default function messageService(msg: Message.messageService) {
  const originalPeer = msg.to_id;
  const peer: Peer = msg.from_id !== undefined ? userIdToPeer(msg.from_id) : originalPeer;

  let innerContent: Node[];

  switch (msg.action._) {
    case 'messageActionChatCreate':
      innerContent = [
        strong(profileTitle(peer)),
        text(' created the group '),
        strong(text(`«${msg.action.title}»`)),
      ];
      break;

    case 'messageActionChatEditPhoto':
      innerContent = [
        strong(profileTitle(peer)),
        text(' updated group photo'),
      ];
      // todo display photo
      break;

    case 'messageActionChatEditTitle':
      innerContent = [
        strong(profileTitle(peer)),
        text(' changed title to '),
        strong(text(`«${msg.action.title}»`)),
      ];
      break;

    case 'messageActionChatDeletePhoto':
      innerContent = [
        strong(profileTitle(peer)),
        text(' deleted group photo'),
      ];
      break;

    case 'messageActionChatAddUser': {
      if (msg.action.users.length === 1 && peer._ === 'peerUser' && peer.user_id === msg.action.users[0]) {
        innerContent = [
          strong(profileTitle(peer)),
          text(' joined the group'),
        ];
      } else {
        const addedUsers = msg.action.users.map((userId) => userToTitle(userCache.get(userId)));

        innerContent = [
          strong(profileTitle(peer)),
          text(' added '),
          strong(text(addedUsers.join(', '))),
        ];
      }
      break;
    }
    case 'messageActionChatDeleteUser':
      if (peer === originalPeer) {
        innerContent = [
          strong(profileTitle(peer)),
          text(' left the group'),
        ];
      } else {
        innerContent = [
          strong(profileTitle(peer)),
          text(' removed '),
          strong(profileTitle({ _: 'peerUser', user_id: msg.action.user_id })),
        ];
      }
      break;

    case 'messageActionChannelCreate':
      innerContent = [
        strong(profileTitle(peer)),
        text(' created channel '),
        strong(text(`«${msg.action.title}»`)),
      ];
      break;

    case 'messageActionChatMigrateTo':
      innerContent = [
        text('Group was converted to supergroup'),
      ];
      break;

    case 'messageActionChannelMigrateFrom':
      innerContent = [
        text('Channel was created from group '),
        strong(text(`«${msg.action.title}»`)),
      ];
      break;

    case 'messageActionPinMessage':
      innerContent = [
        strong(profileTitle(peer)),
        text(' pinned message'),
      ];
      break;

    case 'messageActionScreenshotTaken':
      innerContent = [
        strong(profileTitle(peer)),
        text(' made a screenshot'),
      ];
      break;

    case 'messageActionCustomAction':
      innerContent = [
        text(msg.action.message),
      ];
      break;

    case 'messageActionContactSignUp':
      innerContent = [
        strong(profileTitle(peer)),
        text(' joined Telegram'),
      ];
      break;

    default:
      return (
        div`.message__container`(
          div`.message__align`(
            div`.message__wrap`(
              div`.message__bubble`(
                div`.message__text.fallback`(text(`Service Message: ${msg.action._}`)),
              ),
            ),
          ),
        )
      );
  }

  return (
    div`.message-service`(
      div`.message-service__label`(
        ...innerContent,
      ),
    )
  );
}
