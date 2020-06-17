/* eslint-disable no-param-reassign */
import { Message } from 'mtproto-js';
import { div, nothing } from 'core/html';
import { getInterface, hasInterface, useOnMount } from 'core/hooks';
import { unmount, mount, listen, animationFrameStart } from 'core/dom';
import { main, media } from 'services';
import { galleryHeader } from './gallery_header';
import { galleryFooter } from './gallery_footer';
import './gallery.scss';
import { galleryMedia, GalleryMediaOpener } from './gallery_media';
import { PopupInterface } from '../interface';
import { isSafari } from 'helpers/browser';
import { list } from 'components/ui';

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

  let target: number | undefined;
  const setScroll = (value: number) => {
    slider.scrollLeft = target = value;
  };

  listen(slider, 'wheel', (event: WheelEvent) => {
    if ((slider.scrollLeft === 0 && event.deltaX < 0)
    || (slider.scrollLeft === (slider.scrollWidth - main.window.width) && event.deltaX > 0)) event.preventDefault();
  });

  listen(slider, 'scroll', () => {
    const scrollValue = slider.scrollLeft;

    if (target && scrollValue !== target) {
      slider.scrollLeft = target;
      return;
    }

    target = undefined;

    if (scrollValue % main.window.width === 0) {
      const activeSlide = Math.floor(scrollValue / main.window.width);

      if (activeSlide === 0 && olderMedia && olderMessage) {
        if (newerMedia) unmount(newerMedia);
        newerMedia = activeMedia;
        newerMessage = message;
        activeMedia = olderMedia;
        message = olderMessage;

        olderMessage = chunk.getOlderMessage(olderMessage.id);
        olderMedia = olderMessage ? galleryMedia(olderMessage) : undefined;

        if (olderMedia) {
          mount(slider, olderMedia, activeMedia);
          setScroll(main.window.width);
        }
      }

      if (activeSlide === 2 && newerMedia && newerMessage) {
        if (olderMedia) {
          unmount(olderMedia);
          setScroll(main.window.width);
        }

        olderMedia = activeMedia;
        olderMessage = message;
        activeMedia = newerMedia;
        message = newerMessage;

        newerMessage = chunk.getNewerMessage(newerMessage.id);
        newerMedia = newerMessage ? galleryMedia(newerMessage) : undefined;

        if (newerMedia) {
          mount(slider, newerMedia);
        }
      }
    }
  }, { capture: true });

  useOnMount(container, () => {
    if (olderMedia) slider.scrollLeft = main.window.width;
  });

  return container;
}
