import { Message } from 'mtproto-js';
import { div, nothing } from 'core/html';
import { getInterface, hasInterface, useOnMount } from 'core/hooks';
import { unmount, mount, listen } from 'core/dom';
import { main, media } from 'services';
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

  let olderMessage = chunk.getOlderMessage(message.id);
  let newerMessage = chunk.getNewerMessage(message.id);

  let activeMedia = galleryMedia(message, opener);
  let olderMedia = olderMessage ? galleryMedia(olderMessage) : undefined;
  let newerMedia = newerMessage ? galleryMedia(newerMessage) : undefined;

  const slider = div`.gallery__slider`(
    olderMedia || nothing,
    activeMedia,
    newerMedia || nothing,
  );

  if (olderMedia) slider.scrollLeft = main.window.width;

  const container = div`.gallery`(
    galleryHeader(message, {
      onClose: () => {
        if (hasInterface<PopupInterface>(container.parentElement)) getInterface(container.parentElement).fade();
        getInterface(activeMedia).close(() => main.closePopup());
        container.classList.add('-closing');
      },
    }),
    galleryFooter(message),
    slider,
  );

  listen(slider, 'scroll', () => {
    if (slider.scrollLeft % main.window.width === 0) {
      const activeSlide = Math.floor(slider.scrollLeft / main.window.width);

      if (activeSlide === 0 && olderMedia && olderMessage) {
        if (newerMedia) unmount(newerMedia);
        newerMedia = activeMedia;
        activeMedia = olderMedia;

        olderMessage = chunk.getOlderMessage(olderMessage.id);
        olderMedia = olderMessage ? galleryMedia(olderMessage) : undefined;

        if (olderMedia) {
          mount(slider, olderMedia, activeMedia);
          slider.scrollLeft = main.window.width;
        }
      }

      if (activeSlide === 2 && newerMedia && newerMessage) {
        if (olderMedia) unmount(olderMedia);
        olderMedia = activeMedia;
        activeMedia = newerMedia;

        newerMessage = chunk.getNewerMessage(newerMessage.id);
        newerMedia = newerMessage ? galleryMedia(newerMessage) : undefined;

        if (newerMedia) {
          mount(slider, newerMedia);
        }
      }
    }
  });

  useOnMount(container, () => {
    if (olderMedia) slider.scrollLeft = main.window.width;
  });

  return container;
}
