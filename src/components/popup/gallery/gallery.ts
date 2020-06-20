/* eslint-disable no-param-reassign */
import { Message } from 'mtproto-js';
import { div, nothing } from 'core/html';
import { getInterface, hasInterface, useOnMount, useListenWhileMounted, useObservable } from 'core/hooks';
import { unmount, mount, listen } from 'core/dom';
import { main, media } from 'services';
import { KeyboardKeys } from 'const';
import { isSafari } from 'helpers/browser';
import { Direction } from 'services/message/types';
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

  let header: ReturnType<typeof galleryHeader>; let footer: ReturnType<typeof galleryFooter>;

  let container: HTMLElement;

  const close = () => {
    if (hasInterface<PopupInterface>(container.parentElement)) getInterface(container.parentElement).fade();
    getInterface(activeMedia).close(() => main.closePopup());
    container.classList.add('-closing');
  };

  const goLeft = div`.gallery__goLeft`();
  const goRight = div`.gallery__goRight`();

  container = div`.gallery`(
    header = galleryHeader(message, {
      onClose: close,
    }),
    footer = galleryFooter(message),
    goLeft,
    goRight,
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

  let activeSlide = 0;
  let slides = 1;

  if (olderMedia) slides++;
  if (newerMedia) slides++;
  if (!newerMedia) goRight.style.display = 'none';
  if (!olderMedia) goLeft.style.display = 'none';

  listen(slider, 'scroll', () => {
    const scrollValue = slider.scrollLeft;

    if (target && scrollValue !== target) {
      if (Math.abs(scrollValue - target) < main.window.width - 1) target = undefined;
      else {
        slider.scrollLeft = target;
        return;
      }
    }

    if (scrollValue % main.window.width === 0) {
      activeSlide = Math.floor(scrollValue / main.window.width);

      if (activeSlide === 0 && olderMedia && olderMessage) {
        if (newerMedia) {
          unmount(newerMedia);
          slides--;
        }

        newerMedia = activeMedia;
        newerMessage = message;
        activeMedia = olderMedia;
        message = olderMessage;

        getInterface(header).update(message);
        getInterface(footer).update(message);

        olderMessage = chunk.getOlderMessage(olderMessage.id);
        olderMedia = olderMessage ? galleryMedia(olderMessage) : undefined;

        if (olderMedia) {
          slides++;
          mount(slider, olderMedia, activeMedia);
          setScroll(main.window.width);
        }

        if (!chunk.getOlderId(message.id, 5) && !chunk.history.value.loadingOlder && !chunk.history.value.oldestReached) {
          chunk.loadMore(Direction.Older);
        }
      }

      if (activeSlide === 2 && newerMedia && newerMessage) {
        if (olderMedia) {
          unmount(olderMedia);
          slides--;
        }

        olderMedia = activeMedia;
        olderMessage = message;
        activeMedia = newerMedia;
        message = newerMessage;

        getInterface(header).update(message);

        newerMessage = chunk.getNewerMessage(newerMessage.id);
        newerMedia = newerMessage ? galleryMedia(newerMessage) : undefined;

        if (newerMedia) {
          slides++;
          mount(slider, newerMedia);
          setScroll(main.window.width);
        }

        if (!chunk.getNewerId(message.id, 5) && !chunk.history.value.loadingNewer && !chunk.history.value.newestReached) {
          chunk.loadMore(Direction.Newer);
        }
      }

      if (main.window.width > 700) {
        if (activeSlide === 0) goLeft.style.display = 'none';
        else goLeft.style.display = '';
        if (activeSlide === slides - 1) goRight.style.display = 'none';
        else goRight.style.display = '';
      }

      if (!olderMedia) goRight.style.display = 'none';
    }
  }, { capture: true });

  // listen loading chunks
  useObservable(container, chunk.history, false, () => {
    const scrollBefore = slider.scrollLeft;

    if (!newerMessage) {
      newerMessage = chunk.getNewerMessage(message.id);
      newerMedia = newerMessage ? galleryMedia(newerMessage) : undefined;

      if (newerMedia) {
        slides++;
        mount(slider, newerMedia);
        setScroll(scrollBefore);
      }
    }

    if (!olderMessage) {
      olderMessage = chunk.getOlderMessage(message.id);
      olderMedia = olderMessage ? galleryMedia(olderMessage) : undefined;

      if (olderMedia) {
        slides++;
        mount(slider, olderMedia, activeMedia);
        setScroll(scrollBefore + main.window.width);
      }
    }
  });

  const slideRight = () => {
    if (activeSlide < slides - 1) {
      const scrollTo = slider.scrollLeft + main.window.width;
      if (isSafari) setScroll(scrollTo);
      else slider.scrollTo({ left: scrollTo, top: 0, behavior: 'smooth' });
    }
  };

  const slideLeft = () => {
    if (activeSlide > 0 && slides > 1) {
      const scrollTo = slider.scrollLeft - main.window.width;
      if (isSafari) setScroll(scrollTo);
      else slider.scrollTo({ left: scrollTo, top: 0, behavior: 'smooth' });
    }
  };

  listen(goRight, 'click', slideRight);
  listen(goLeft, 'click', slideLeft);

  useListenWhileMounted(container, window, 'keydown', (event: KeyboardEvent) => {
    switch (event.keyCode) {
      case KeyboardKeys.ARROW_RIGHT: {
        slideRight();
        event.preventDefault();
        break;
      }

      case KeyboardKeys.ARROW_LEFT: {
        slideLeft();
        event.preventDefault();
        break;
      }

      case KeyboardKeys.ESC: {
        close();
        event.preventDefault();
        break;
      }

      default:
    }
  });

  useOnMount(container, () => {
    if (olderMedia) slider.scrollLeft = main.window.width;
  });

  return container;
}
