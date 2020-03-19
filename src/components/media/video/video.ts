import { Document } from 'client/schema';
import { div, text, nothing, video } from 'core/html';
import { getDocumentLocation, getAttributeVideo } from 'helpers/files';
import { download, cached as getCached } from 'client/media';
import { unmount, mount, listenOnce, listen } from 'core/dom';
import { useOnMount } from 'core/hooks';
import photoRenderer, { PhotoOptions } from '../photo/photo';
import './video.scss';

export default function videoRenderer(document: Document.document, photoOptions: PhotoOptions = {}, controls: boolean | undefined = undefined) {
  const thumbnail = photoRenderer(document, { ...photoOptions, showLoader: false });
  const location = getDocumentLocation(document, '');
  const videoAttribute = getAttributeVideo(document);

  if (!videoAttribute) return nothing;

  const videoEl = video({ autoplay: true, loop: true, controls });
  let cached = getCached(location);
  const container = div`.video`(videoEl);

  let progressTextNode: Node | undefined;
  let progressEl: HTMLElement | undefined;
  let thumbnailEl: HTMLElement | undefined;


  if (!cached) {
    progressTextNode = text('0%');
    progressEl = div`.video__progress`(progressTextNode);
    thumbnailEl = div`.video__thumbnail`(thumbnail);

    mount(container, progressEl);
    mount(container, thumbnailEl);
  }

  const isLandscape = videoAttribute.w > videoAttribute.h;
  const dim = videoAttribute.w / videoAttribute.h;

  if (isLandscape && photoOptions.width) {
    container.style.width = `${photoOptions.width}px`;
    container.style.height = `${photoOptions.width / dim}px`;
  }

  if (!isLandscape && photoOptions.height) {
    container.style.width = `${photoOptions.height * dim}px`;
    container.style.height = `${photoOptions.height}px`;
  }


  const removePreload = () => {
    if (progressEl) unmount(progressEl);

    if (thumbnailEl) {
      thumbnailEl.classList.add('removed');
      listenOnce(thumbnailEl, 'animationend', () => thumbnailEl && unmount(thumbnailEl));
    }
  };

  videoEl.onplay = removePreload;

  useOnMount(container, () => {
    if (videoEl.src) videoEl.play();

    if (!cached) {
      download(
        location,
        { dc_id: document.dc_id, size: document.size, mime_type: document.mime_type },

        // ready
        (url: string) => {
          cached = url;
          videoEl.src = url;
        },

        // progress
        (downloaded: number, total: number) => {
          if (progressTextNode) progressTextNode.textContent = `${((downloaded / total) * 100).toFixed(0)}%`;
        },
      );
    }
  });

  listen(videoEl, 'mouseenter', () => {
    if (videoEl.src && videoEl.paused) videoEl.play();
  });

  if (cached) {
    videoEl.src = cached;
  }

  return container;
}
