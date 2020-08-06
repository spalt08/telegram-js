import { text } from 'core/html';
import { Peer } from 'mtproto-js';
import { useObservable } from 'core/hooks';
import { peerToTitle } from 'cache/accessors';
import client from 'client/client';

export default function profileTitle(peer: Peer, isForDialogList = false) {
  const [firstTitle, titleObservable] = peerToTitle(peer, isForDialogList ? client.getUserID() : undefined);
  const textNode = text(firstTitle);

  useObservable(textNode, titleObservable, true, (title) => {
    if (title !== textNode.textContent) textNode.textContent = title;
  });

  return textNode;
}
