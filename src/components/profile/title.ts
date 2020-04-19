import { text } from 'core/html';
import { Peer } from 'mtproto-js';
import { useObservable } from 'core/hooks';
import { peerToTitle } from 'cache/accessors';
import { auth } from 'services';

export default function profileTitle(peer: Peer, isForDialogList = false) {
  const [firstTitle, titleObservable] = peerToTitle(peer, isForDialogList ? auth.userID : undefined);
  const textNode = text(firstTitle);

  useObservable(textNode, titleObservable, (title) => {
    textNode.textContent = title;
  });

  return textNode;
}
