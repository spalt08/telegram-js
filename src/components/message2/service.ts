import { MessageService, Peer } from 'cache/types';
import { div, strong, text, nothing } from 'core/html';
import { profileTitle } from 'components/profile';
import './service.scss';

export default function messageSerivce(msg: MessageService) {
  const peer = { _: 'peerUser', user_id: msg.from_id } as Peer;

  let innerContent: Node[];

  switch (msg.action._) {
    case 'messageActionChatCreate':
      innerContent = [
        strong(profileTitle(peer)),
        text(' created the group '),
        strong(text(msg.action.title)),
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
        strong(text(msg.action.title)),
      ];
      break;

    case 'messageActionChatDeletePhoto':
      innerContent = [
        strong(profileTitle(peer)),
        text(' deleted group photo'),
      ];
      break;

    case 'messageActionChatAddUser':
      innerContent = [
        strong(profileTitle(peer)),
        text(' joined the group'),
      ];
      break;

    case 'messageActionChatDeleteUser':
      innerContent = [
        strong(profileTitle(peer)),
        text(' removed '),
        strong(profileTitle({ _: 'peerUser', user_id: msg.action.user_id })),
      ];
      break;

    case 'messageActionChannelCreate':
      innerContent = [
        strong(profileTitle(peer)),
        text(' created channel '),
        strong(text(msg.action.title)),
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
        strong(text(msg.action.title)),
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
