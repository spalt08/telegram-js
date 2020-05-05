import { div, img } from 'core/html';
import { Document } from 'mtproto-js';
import { mount, listenOnce, unmount, listen } from 'core/dom';
import { getThumbnail } from 'helpers/photo';
import { getDocumentLocation } from 'helpers/files';
import { download, cached as getCached } from 'client/media';
import { preloadTgsAssets, tgs } from 'components/ui';
import './sticker.scss';
import { useInterface, getInterface, WithInterfaceHook, useOnMount } from 'core/hooks';

type StickerOptions = {
  size: string,
  autoplay: boolean,
  onClick?: (sticker: Document) => void,
};

enum StickerMimeType {
  TGS = 'application/x-tgsticker',
  WebP = 'image/webp',
}

export default function stickerRenderer(sticker: Document.document, { size = '200px', autoplay = true, onClick }: StickerOptions) {
  const location = getDocumentLocation(sticker);
  let cached = getCached(location);

  const container = div`.sticker`({ style: { width: size, height: size } });
  let thumbnail: HTMLElement | undefined;
  let animated: HTMLElement & WithInterfaceHook<{ play(): void, pause(): void }> | undefined;

  const render = (src: string) => {
    cached = src;

    if (sticker.mime_type === StickerMimeType.TGS) {
      animated = tgs({ src, className: `sticker__tgs${thumbnail ? ' animated' : ''}`, autoplay, loop: true });
      mount(container, animated);

      if (thumbnail) {
        thumbnail.classList.add('removed');
        listenOnce(thumbnail, 'animationend', () => {
          unmount(thumbnail!);
        });
      }
      return;
    }

    if (sticker.mime_type === StickerMimeType.WebP) {
      const stickerImage = img({ src, className: `sticker__image${thumbnail ? ' animated' : ''}` });
      mount(container, stickerImage);

      // remove thumbnail
      if (thumbnail) {
        thumbnail.classList.add('removed');
        listenOnce(thumbnail, 'animationend', () => {
          unmount(thumbnail!);
        });
      }
    }
  };

  if (cached) {
    render(cached);
  } else {
    // todo: Find out why the hook isn't triggered on remount
    useOnMount(container, () => {
      if (!cached) {
        const thumbnailUrl = sticker.thumbs ? getThumbnail(sticker.thumbs) : null;
        if (thumbnailUrl) {
          thumbnail = div`.sticker__thumb`(
            img({ src: thumbnailUrl, alt: 'Sticker Preview' }),
          );

          mount(container, thumbnail);
        }

        if (sticker.mime_type === StickerMimeType.TGS) {
          preloadTgsAssets();
        }

        download(location, { ...sticker }, render);
      }
    });
  }

  if (onClick) listen(container, 'click', () => onClick(sticker));

  return useInterface(container, {
    play() { if (animated) getInterface(animated).play(); },
    pause() { if (animated) getInterface(animated).pause(); },
  });
}
