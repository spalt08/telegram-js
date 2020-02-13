import { peerMessageToId } from 'helpers/api';
import { quote } from 'components/ui';
import { profileTitle } from 'components/profile';
import photoRenderer from 'components/media/photo/photo';
import { listen, unmount, mount } from 'core/dom';
import { div } from 'core/html';
import { messageCache } from 'cache';
import { Peer, Message } from 'cache/types';
import { message as service } from 'services';
import messageShort from './short';

export default function messageReply(id: number, peer: Peer) {
  const element = div`.message__reply`();
  const cached = messageCache.get(peerMessageToId(peer, id));

  let replyQuote: HTMLElement | undefined;

  const renderReply = (message: Message) => {
    if (message._ === 'messageEmpty') return;
    if (message._ === 'messageService') return;

    if (replyQuote) unmount(replyQuote);

    let preview: Node | undefined;

    if (message.media && message.media._ === 'messageMediaPhoto' && message.media.photo._ === 'photo') {
      preview = div`.quote__img`(photoRenderer(message.media.photo, { fit: 'cover', width: 36, height: 36 }));
    }

    replyQuote = quote(
      profileTitle({ _: 'peerUser', user_id: message.from_id }),
      message.message || messageShort(message),
      preview,
    );

    listen(element, 'click', () => service.selectPeer(peer, id));

    mount(element, replyQuote);
  };

  if (!cached) service.loadMessage(id, (msg: Message) => renderReply(msg));
  else renderReply(cached);

  return element;
}
