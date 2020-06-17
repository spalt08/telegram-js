/* eslint-disable no-param-reassign */
import { Message } from 'mtproto-js';
import { messageToSenderPeer, peerToTitle } from 'cache/accessors';
import { div, text } from 'core/html';
import { profileAvatar } from 'components/profile';
import { datetime } from 'components/ui';
import * as icons from 'components/icons';
import './gallery_header.scss';
import { useInterface } from 'core/hooks';
import { BehaviorSubject } from 'rxjs';
import { unmount, mount } from 'core/dom';

type GalleryHeaderCallbacks = { onClose: (message: Message.message) => void };

export function galleryHeader(message: Message.message, { onClose } :GalleryHeaderCallbacks) {
  const peer = messageToSenderPeer(message);

  let avatar: HTMLElement;
  let title: Node;
  let info: HTMLElement;
  let sender: HTMLElement;

  const timestamp = new BehaviorSubject(message.date);

  const container = div`.galleryHeader`(
    div`.galleryHeader__more`(icons.more({ className: 'galleryHeader__icon' })),
    sender = div`.galleryHeader__sender`(
      avatar = profileAvatar(peer, message),
      info = div`.galleryHeader__info`(
        div`.galleryHeader__title`(title = text(peerToTitle(peer)[0])),
        div`.galleryHeader__date`(datetime({ timestamp, full: true })),
      ),
    ),
    div`.galleryHeader__actions`(
      div`.galleryHeader__action.galleryHeader__desktop`(icons.forward({ className: 'galleryHeader__icon' })),
      div`.galleryHeader__action.galleryHeader__desktop`(icons.download({ className: 'galleryHeader__icon' })),
      div`.galleryHeader__action`({ onClick: () => onClose(message) }, icons.close({ className: 'galleryHeader__icon' })),
    ),
  );

  return useInterface(container, {
    update: (next: Message.message) => {
      const nextPeer = messageToSenderPeer(next);

      timestamp.next(next.date);

      if (next.from_id !== message.from_id) {
        [title.textContent] = peerToTitle(nextPeer);
        unmount(avatar);
        mount(sender, avatar = profileAvatar(nextPeer, next), info);
        message = next;
      }
    },
  });
}
