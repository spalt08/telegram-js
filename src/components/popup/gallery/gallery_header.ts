import { Message } from 'mtproto-js';
import { messageToSenderPeer } from 'cache/accessors';
import { div } from 'core/html';
import { profileAvatar, profileTitle } from 'components/profile';
import { datetime } from 'components/ui';
import * as icons from 'components/icons';
import './gallery_header.scss';

type GalleryHeaderCallbacks = { onClose: (message: Message.message) => void };

export function galleryHeader(message: Message.message, { onClose } :GalleryHeaderCallbacks) {
  const peer = messageToSenderPeer(message);
  const container = div`.galleryHeader`(
    div`.galleryHeader__more`(icons.more({ className: 'galleryHeader__icon' })),
    div`.galleryHeader__sender`(
      profileAvatar(peer, message),
      div`.galleryHeader__info`(
        div`.galleryHeader__title`(profileTitle(peer)),
        div`.galleryHeader__date`(datetime({ timestamp: message.date, full: true })),
      ),
    ),
    div`.galleryHeader__actions`(
      div`.galleryHeader__action.galleryHeader__desktop`(icons.forward({ className: 'galleryHeader__icon' })),
      div`.galleryHeader__action.galleryHeader__desktop`(icons.download({ className: 'galleryHeader__icon' })),
      div`.galleryHeader__action`({ onClick: () => onClose(message) }, icons.close({ className: 'galleryHeader__icon' })),
    ),
  );

  return container;
}
