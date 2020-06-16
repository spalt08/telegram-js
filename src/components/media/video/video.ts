import { Document } from 'mtproto-js';
import { div, nothing, video } from 'core/html';
import { getDocumentLocation, getAttributeVideo, useVideoArrtibuteSize } from 'helpers/files';
import { file, useProgress } from 'client/media';
import { unmount, listen, watchVisibility } from 'core/dom';
import { PhotoOptions } from 'helpers/other';
import { getSize, getPhotoLocation } from 'helpers/photo';
import './video.scss';

export default function videoRenderer(document: Document.document, photoOptions: PhotoOptions = {}, controls?: boolean,
  muted?: boolean) {
  const location = getDocumentLocation(document, '');
  const videoAttribute = getAttributeVideo(document);

  if (!videoAttribute) return nothing;

  const src = file(location, { dc_id: document.dc_id, size: document.size, mime_type: document.mime_type, progress: true });
  const videoEl = video`.video__player`({ loop: true, autoplay: true, controls, src, muted, playsinline: true });
  const progressEl = div`.video__progress`();
  const container = div`.video${photoOptions.className || ''}`(videoEl, progressEl);

  progressEl.textContent = '0%';

  useVideoArrtibuteSize(container, videoAttribute, photoOptions);

  // video poster
  if (document.thumbs) {
    const size = getSize(document.thumbs, photoOptions.width, photoOptions.height, photoOptions.fit);
    if (size) videoEl.poster = file(getPhotoLocation(document, size.type), { size: size.size, dc_id: document.dc_id });
  }

  let loaded = false;
  let visible = true;

  listen(videoEl, 'loadeddata', () => {
    if (progressEl) unmount(progressEl);
    if (!visible) videoEl.pause();
    loaded = true;
  });

  listen(videoEl, 'play', () => {
    if (progressEl) unmount(progressEl);
  });

  watchVisibility(videoEl, (next) => {
    visible = next;
    if (visible && loaded && videoEl.paused) videoEl.play();
    if (!visible && !videoEl.paused) videoEl.pause();
  });

  useProgress(container, src, (next) => {
    progressEl.textContent = `${Math.floor((next / document.size) * 100)}%`;
  });

  // useOnMount(container, () => {
  //   if (videoEl.src) videoEl.play();

  //   if (!cached) {
  //     download(
  //       location,
  //       { dc_id: document.dc_id, size: document.size, mime_type: document.mime_type },

  //       // ready
  //       (url: string) => {
  //         cached = url;
  //         videoEl.src = url;
  //       },

  //       // progress
  //       (downloaded: number, total: number) => {
  //         if (progressTextNode) progressTextNode.textContent = `${((downloaded / total) * 100).toFixed(0)}%`;
  //       },
  //     );
  //   }
  // });

  return container;
}
