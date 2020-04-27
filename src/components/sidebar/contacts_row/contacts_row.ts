import { Peer } from 'mtproto-js';
import { map } from 'rxjs/operators';
import { MaybeObservable } from 'core/types';
import { div, text } from 'core/html';
import { useMaybeObservable } from 'core/hooks';
import { peerToTitle } from 'cache/accessors';
import { ripple } from 'components/ui';
import { profileAvatar } from 'components/profile';
import { message as messageService } from 'services';
import { peerToId } from 'helpers/api';
import { areIteratorsEqual } from 'helpers/data';
import { mount, unmount } from 'core/dom';
import './contacts_row.scss';

interface Props {
  peers: MaybeObservable<readonly Readonly<Peer>[]>;
  className?: string;
  clickMiddleware?(next: () => void): void;
}

function formatName(name: string) {
  let firstNonSpacePosition = 0;
  for (; firstNonSpacePosition < name.length && name[firstNonSpacePosition] === ' '; ++firstNonSpacePosition);
  const firstSpacePosition = name.indexOf(' ', firstNonSpacePosition);
  return name.slice(firstNonSpacePosition, firstSpacePosition === -1 ? undefined : firstSpacePosition);
}

function contact(peer: Readonly<Peer>, clickMiddleware?: (next: () => void) => void) {
  const [, nameObservable] = peerToTitle(peer);

  const onClickBase = () => messageService.selectPeer(peer);
  const onClick = clickMiddleware ? () => clickMiddleware(onClickBase) : onClickBase;

  return div(
    ripple({
      className: 'contactsRow__ripple',
      contentClass: 'contactsRow__ripple_content',
      onClick,
    }, [
      profileAvatar(peer, undefined, true),
      div`.contactsRow__name`(
        text(nameObservable.pipe(map(formatName))),
      ),
    ]),
  );
}

export default function contactsRow({ peers, className = '', clickMiddleware }: Props) {
  const container = div`.contactsRow ${className}`();
  let peerElements = new Map<string, Node>(); // Map is used to keep also the peers order

  useMaybeObservable(container, peers, (newPeers) => {
    const newPeerElements = new Map<string, Node>();
    newPeers.forEach((peer) => {
      const peerId = peerToId(peer);
      const peerElement = peerElements.get(peerId) || contact(peer, clickMiddleware);
      newPeerElements.set(peerId, peerElement);
    });

    if (areIteratorsEqual(peerElements.keys(), newPeerElements.keys())) {
      return; // The old and the new peer lists are equal
    }

    // Remove the excess peers
    peerElements.forEach((element, peerId) => {
      if (!newPeerElements.has(peerId)) {
        unmount(element);
        peerElements.delete(peerId);
      }
    });

    // Add the new peers and reorder the list
    let lastIntertedElement: Node | undefined;
    newPeerElements.forEach((element) => {
      mount(container, element, (lastIntertedElement ? lastIntertedElement.nextSibling : container.firstChild) || undefined);
      lastIntertedElement = element;
    });

    peerElements = newPeerElements;
  });

  return container;
}
