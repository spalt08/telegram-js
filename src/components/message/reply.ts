import { peerMessageToId } from 'helpers/api';
import { ripple } from 'components/ui';
import { div } from 'core/html';
import { getInterface } from 'core/hooks';
import { messageCache } from 'cache';
import { Peer, Message } from 'mtproto-js';
import { message as service } from 'services';
import messageQuote from './quote';

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
    if (replyQuote) return;

    if (message && message._ !== 'messageEmpty') {
      replyQuote = messageQuote(message);
      getInterface(contentElement).mountChild(replyQuote);
    }
  };

  if (!messageCache.has(fullId)) {
    service.loadMessageReply(original);
  }

  messageCache.useItemBehaviorSubject(contentElement, fullId).subscribe(renderReply);

  return div`.message__reply`(contentElement);
}
