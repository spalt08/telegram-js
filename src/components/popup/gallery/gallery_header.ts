/* eslint-disable no-param-reassign */
import { Message } from 'mtproto-js';
import { messageToSenderPeer, peerToTitle } from 'cache/accessors';
import { div, text } from 'core/html';
import { profileAvatar } from 'components/profile';
import { datetime, contextMenu } from 'components/ui';
import * as icons from 'components/icons';
import './gallery_header.scss';
import { useInterface, getInterface } from 'core/hooks';
import { BehaviorSubject } from 'rxjs';
import { unmount, mount, listen } from 'core/dom';
import { isSafari } from 'helpers/browser';
import { request } from 'client/context';
import { getPhotoLocation, getSize } from 'helpers/photo';
import { file } from 'client/media';
import { getDocumentLocation, getAttributeFilename } from 'helpers/files';
import { downloadLink, downloadForm } from 'helpers/other';
import { main, message as messageService } from 'services';

type GalleryHeaderCallbacks = { onClose: (message: Message.message) => void };

function download(message: Message.message) {
  const { media } = message;

  let src;
  let location;
  let options;
  let filename = 'telegram-photo.jpg';

  if (media && media._ === 'messageMediaPhoto' && media.photo && media.photo._ === 'photo') {
    const size = getSize(media.photo.sizes, window.innerWidth, window.innerHeight);
    if (size) {
      location = getPhotoLocation(media.photo);
      options = { dc_id: media.photo.dc_id, size: (size as any).size };
      src = file(location, options);
    }
  }

  if (media && media._ === 'messageMediaDocument' && media.document && media.document._ === 'document') {
    location = getDocumentLocation(media.document);
    options = { dc_id: media.document.dc_id, size: media.document.size, mime_type: media.document.mime_type };
    src = file(location, options);

    const attr = getAttributeFilename(media.document);
    if (attr) filename = attr.file_name;
  }

  if (!src || !location || !options) return;
  if (isSafari) {
    request('download', { url: src, location, options }, ({ url }) => {
      downloadLink(filename, url);
      URL.revokeObjectURL(url);
    });
  } else {
    downloadForm(filename, src);
  }
}
export function galleryHeader(message: Message.message, { onClose }: GalleryHeaderCallbacks) {
  const peer = messageToSenderPeer(message);

  let avatar: HTMLElement;
  let title: Node;
  let info: HTMLElement;
  let sender: HTMLElement;
  let moreIcon;

  const timestamp = new BehaviorSubject(message.date);

  const morePanel = contextMenu({
    className: 'galleryHeader__more-menu',
    options: [
      { icon: icons.download, label: 'Download', onClick: () => { download(message); } },
      {
        icon: icons.message,
        label: 'Show Message',
        onClick: () => {
          main.closePopup();
          messageService.selectPeer(message.to_id, message.id);
        },
      },
    ],
  });

  const container = div`.galleryHeader`(
    moreIcon = div`.galleryHeader__more`(icons.more({ className: 'galleryHeader__icon' })),
    sender = div`.galleryHeader__sender`(
      avatar = profileAvatar(peer, message),
      info = div`.galleryHeader__info`(
        div`.galleryHeader__title`(title = text(peerToTitle(peer)[0])),
        div`.galleryHeader__date`(datetime({ timestamp, full: true })),
      ),
    ),
    div`.galleryHeader__actions`(
      div`.galleryHeader__action.galleryHeader__desktop`(icons.forward({ className: 'galleryHeader__icon' })),
      div`.galleryHeader__action.galleryHeader__desktop`({ onClick: () => download(message) }, icons.download({ className: 'galleryHeader__icon' })),
      div`.galleryHeader__action`({ onClick: () => onClose(message) }, icons.close({ className: 'galleryHeader__icon' })),
    ),
  );

  listen(moreIcon, 'click', (event) => {
    if (morePanel.parentElement) getInterface(morePanel).close();
    else mount(container, morePanel);
    event.preventDefault();
    event.stopPropagation();
  });

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
