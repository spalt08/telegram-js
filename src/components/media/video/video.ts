import { Document } from 'cache/types';
import { div, text, nothing, video } from 'core/html';
import { getDocumentLocation, getAttributeVideo } from 'helpers/files';
import media from 'client/media';
import { unmount, mount, listenOnce } from 'core/dom';
import photoRenderer, { PhotoOptions } from '../photo/photo';
import './video.scss';

export default function videoRenderer(document: Document, photoOptions: PhotoOptions = {}) {
  const thumbnail = photoRenderer(document, { ...photoOptions, showLoader: false });
  const location = getDocumentLocation(document, '');
  const videoAttribute = getAttributeVideo(document);

  if (!videoAttribute) return nothing;

  const videoEl = video({ autoplay: true, loop: true });
  const cached = media.cached(location);
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
    console.log('loaded');
    if (progressEl) unmount(progressEl);

    if (thumbnailEl) {
      thumbnailEl.classList.add('removed');
      listenOnce(thumbnailEl, 'animationend', () => thumbnailEl && unmount(thumbnailEl));
    }
  };

  videoEl.onplay = removePreload;

  if (cached) {
    videoEl.src = cached;
  } else {
    media.download(
      location,
      { dc_id: document.dc_id, size: document.size, mime_type: document.mime_type },

      // ready
      (url: string) => videoEl.src = url,

      // progress
      (downloaded: number, total: number) => {
        if (progressTextNode) progressTextNode.textContent = `${((downloaded / total) * 100).toFixed(0)}%`;
      },
    );
  }

  return container;
}
