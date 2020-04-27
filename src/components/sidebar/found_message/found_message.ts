import { div, text } from 'core/html';
import { datetime, makeTextMatchHighlightComponent, ripple } from 'components/ui';
import { messageCache } from 'cache';
import { messageToDialogPeer } from 'helpers/api';
import { profileAvatar, profileTitle } from 'components/profile';
import { messageToSenderPeer } from 'cache/accessors';
import { MaybeObservable } from 'core/types';
import { message as messageService } from 'services';
import './found_message.scss';

const messageHighlight = makeTextMatchHighlightComponent({
  inputMaxScanLength: 1000,
  outputMaxLength: 100,
  outputMaxStartOffset: 10,
});

export default function foundMessage(
  messageUniqueId: string,
  searchQuery: MaybeObservable<string> = '',
  clickMiddleware?: (next: () => void) => void,
) {
  const message = messageCache.get(messageUniqueId);
  // Message is not updated intentionally

  if (!message) {
    return div`.foundMessage__empty`(
      text('(the message has been deleted)'),
    );
  }

  if (message._ === 'messageEmpty') {
    return div`.foundMessage__empty`(
      text('(empty message)'),
    );
  }

  const dialogPeer = messageToDialogPeer(message);
  const senderPeer = messageToSenderPeer(message);

  const onClickBase = () => messageService.selectPeer(dialogPeer, message.id);
  const onClick = clickMiddleware ? () => clickMiddleware(onClickBase) : onClickBase;

  return div`.foundMessage`(
    ripple({
      className: 'foundMessage__ripple',
      contentClass: 'foundMessage__ripple_content',
      onClick,
    }, [
      profileAvatar(senderPeer, message),
      div`.foundMessage__main`(
        div`.foundMessage__header`(
          div`.foundMessage__name`(
            profileTitle(senderPeer),
          ),
          div`.foundMessage__time`(datetime({ timestamp: message.date })),
        ),
        message._ === 'message'
          ? messageHighlight({ tag: 'div', props: { class: 'foundMessage__message' }, text: message.message, query: searchQuery })
          : div`.foundMessage__message`(text('(service message)')),
      ),
    ]),
  );
}
