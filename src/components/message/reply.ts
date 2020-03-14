import { peerMessageToId } from 'helpers/api';
import { quote, ripple } from 'components/ui';
import { profileTitle } from 'components/profile';
import photoRenderer from 'components/media/photo/photo';
import { unmount } from 'core/dom';
import { div } from 'core/html';
import { getInterface } from 'core/hooks';
import { messageCache } from 'cache';
import { messageToSenderPeer } from 'cache/accessors';
import { Peer, Message } from 'client/schema';
import { message as service } from 'services';
import messageShort from './short';

export default function messageReply(id: number, peer: Peer, original: Message.message) {
  const fullId = peerMessageToId(peer, id);

  const contentElement = ripple({
    className: 'message__reply_ripple',
    contentClass: 'message__reply_ripple_content',
    onClick() {
      service.selectPeer(peer, id);
    },
  });
  let replyQuote: HTMLElement | undefined;

  const renderReply = (message: Message | undefined) => {
    if (replyQuote) {
      unmount(replyQuote);
      replyQuote = undefined;
    }

    if (!message || message._ === 'messageEmpty') return;

    let preview: Node | undefined;

    if (message._ === 'message' && message.media?._ === 'messageMediaPhoto' && message.media.photo?._ === 'photo') {
      preview = div`.quote__img`(photoRenderer(message.media.photo, { fit: 'cover', width: 32, height: 32 }));
    }

    replyQuote = quote(
      profileTitle(messageToSenderPeer(message)),
      message._ === 'message' && message.message ? message.message : messageShort(message),
      preview,
    );

    getInterface(contentElement).mountChild(replyQuote);
  };

  if (!messageCache.has(fullId)) {
    service.loadMessageReply(original);
  }
  messageCache.useItemBehaviorSubject(contentElement, fullId).subscribe(renderReply);

  return div`.message__reply`(contentElement);
}
