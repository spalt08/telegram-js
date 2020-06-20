/* eslint-disable no-param-reassign */

import photoRenderer from 'components/media/photo/photo';
import videoStreamRenderer from 'components/media/video/stream';
import { animationFrameStart, listenOnce, mount, unmount } from 'core/dom';
import { useInterface } from 'core/hooks';
import { div, img, nothing } from 'core/html';
import { Message } from 'mtproto-js';
import { main } from 'services';
import './gallery_media.scss';

export type GalleryMediaOpener = { rect: DOMRect, thumb: string };

export function galleryMedia(message: Message.message, opener?: GalleryMediaOpener) {
  const { window } = main;
  const { media } = message;
  const width = window.width < 700 ? window.width : Math.min(1200, window.width * 0.85);
  const height = Math.max(100, window.height - 240);

  let mediaElement: Node | undefined;

  if (media && media._ === 'messageMediaPhoto' && media.photo && media.photo._ === 'photo') {
    mediaElement = photoRenderer(media.photo, {
      fit: 'contain', width, height, className: 'galleryMedia__item', thumb: opener ? opener.thumb : true,
    });
  }

  if (media && media._ === 'messageMediaDocument' && media.document && media.document._ === 'document') {
    mediaElement = videoStreamRenderer(media.document, {
      fit: 'contain', width, height, className: 'galleryMedia__item', thumb: opener ? opener.thumb : true,
    }, !!opener);
  }
  const container = div`.galleryMedia`();

  let close;

  // animate
  if (opener && mediaElement instanceof HTMLElement) {
    const { rect, thumb } = opener;
    const targetWidth = mediaElement.style.width;
    const targetHeight = mediaElement.style.height;
    const targetLeft = window.width / 2 - parseInt(targetWidth, 10) / 2;
    const targetTop = window.height / 2 - parseInt(targetHeight, 10) / 2;

    const transitionEl = div`.galleryMedia__transition`(
      img({ src: thumb, className: targetWidth > targetHeight ? 'galleryMedia__transition-landscape' : 'galleryMedia__transition-portrait' }),
    );

    transitionEl.style.width = `${rect.width}px`;
    transitionEl.style.height = `${rect.height}px`;
    transitionEl.style.left = `${rect.left}px`;
    transitionEl.style.top = `${rect.top}px`;

    animationFrameStart().then(() => {
      transitionEl.style.width = targetWidth;
      transitionEl.style.height = targetHeight;
      transitionEl.style.left = `${targetLeft}px`;
      transitionEl.style.top = `${targetTop}px`;
    });

    listenOnce(transitionEl, 'transitionend', () => {
      mount(container, mediaElement || nothing);
      unmount(transitionEl);
    });

    mount(container, transitionEl);

    close = (ready: () => void) => {
      mount(container, transitionEl);
      if (mediaElement) unmount(mediaElement);

      animationFrameStart().then(() => {
        transitionEl.style.width = `${rect.width}px`;
        transitionEl.style.height = `${rect.height}px`;
        transitionEl.style.left = `${rect.left}px`;
        transitionEl.style.top = `${rect.top}px`;
      });

      listenOnce(transitionEl, 'transitionend', ready);
    };

  // no animation
  } else {
    mount(container, mediaElement || nothing);

    close = (ready: () => void) => ready();
  }

  return useInterface(container, { close });
}
