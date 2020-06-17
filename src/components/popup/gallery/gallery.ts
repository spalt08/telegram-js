import { Message } from 'mtproto-js';
import { div } from 'core/html';
import { getInterface, hasInterface } from 'core/hooks';
import { useSwipe } from 'helpers/hooks';
import { unmount, mount, listenOnce, animationFrameStart } from 'core/dom';
import { main, media } from 'services';
import { messageCache } from 'cache';
import { peerMessageToId } from 'helpers/api';
import { galleryHeader } from './gallery_header';
import { galleryFooter } from './gallery_footer';
import './gallery.scss';
import { galleryMedia, GalleryMediaOpener } from './gallery_media';
import { PopupInterface } from '../interface';

type Props = {
  opener?: GalleryMediaOpener,
  message: Message.message,
};

export function gallery({ message, opener }: Props) {
  const peer = message.to_id;
  const chunk = media.getMediaMessagesChunk(peer, 'photoVideo', message.id);

  let activeId = message.id;
  let activeMedia = galleryMedia(message, opener);
  let nextId: number | undefined;
  let nextMedia: ReturnType<typeof galleryMedia> | undefined;
  let nextMediaDirection: number | undefined;

  const container = div`.gallery`(
    galleryHeader(message, {
      onClose: () => {
        if (hasInterface<PopupInterface>(container.parentElement)) getInterface(container.parentElement).fade();
        getInterface(activeMedia).close(() => main.closePopup());
        container.classList.add('-closing');
      },
    }),
    galleryFooter(message),
    activeMedia,
  );

  useSwipe(container, (dx: number, complete: boolean) => {
    const direction = dx / Math.abs(dx);

    if (nextMediaDirection !== direction) {
      if (nextMedia) unmount(nextMedia);

      nextMediaDirection = direction;

      nextId = (direction > 0 ? chunk.getOlderId(activeId) : chunk.getNewerId(activeId)) || undefined;

      if (nextId) {
        const nextMessage = messageCache.get(peerMessageToId(message.to_id, nextId));

        if (nextMessage && nextMessage._ === 'message') {
          nextMedia = galleryMedia(nextMessage);

          if (direction > 0) {
            nextMedia.style.left = '-100vw';
            nextMedia.style.right = 'auto';
          } else {
            nextMedia.style.right = '-100vw';
            nextMedia.style.left = 'auto';
          }

          mount(container, nextMedia);
        }
      }
    }

    if (complete) {
      if (nextMedia) {
        activeMedia.style.transition = '.15s ease-out';
        nextMedia.style.transition = '.15s ease-out';

        animationFrameStart().then(() => {
          nextMedia!.style.transform = `translateX(${direction * 100}vw)`;
          activeMedia.style.transform = `translateX(${direction * 100}vw)`;
        });

        listenOnce(activeMedia, 'transitionend', () => {
          nextMedia!.style.transform = '';
          nextMedia!.style.transition = '';
          nextMedia!.style.left = '';
          nextMedia!.style.right = '';
          unmount(activeMedia);
          activeMedia = nextMedia!;
          activeId = nextId!;
          nextMedia = undefined;
          nextMediaDirection = undefined;
        });
      } else {
        activeMedia.style.transform = '';
      }
    } else {
      activeMedia.style.transform = `translateX(${dx}px)`;
      if (nextMedia) nextMedia.style.transform = `translateX(${dx}px)`;
    }
  });

  return container;
}
