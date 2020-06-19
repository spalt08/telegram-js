import { Document, Message } from 'mtproto-js';
import { div, text, video } from 'core/html';
import { getAttributeVideo, getReadableDuration, getAttributeAnimated, useVideoArrtibuteSize } from 'helpers/files';
import { main } from 'services';
import { PhotoOptions } from 'helpers/other';
import { stream, file } from 'client/media';
import './preview.scss';
import { listen, watchVisibility, mount, unmount } from 'core/dom';
import { getInterface } from 'core/hooks';
import { getSize, getPhotoLocation } from 'helpers/photo';
import photoRenderer from '../photo/photo';

export default function gifPreview(document: Document.document, photoOptions: PhotoOptions = {}, message?: Message.message,
  onClick?: (doc: Document.document) => void) {
  const thumbnail = photoRenderer(document, { ...photoOptions, className: 'video-preview__thumb' });

  const videoAttribute = getAttributeVideo(document);
  const gifAttribute = getAttributeAnimated(document);

  let duration = '00:00';
  if (gifAttribute) duration = 'GIF';
  else if (videoAttribute) duration = getReadableDuration(videoAttribute.duration);

  const downloadBtn = div`.video-preview__downloadbtn`();
  const durationEl = div`.video-preview__duration`(text(duration));

  const container = div`.video-preview${photoOptions.className || ''}`(
    downloadBtn,
    durationEl,
    thumbnail,
  );

  let isStarted = false;
  let videoEl: HTMLVideoElement;

  const src = stream(document);

  listen(container, 'click', () => {
    if (!isStarted) {
      videoEl = video`.video-preview__player`({ loop: true, autoplay: true, src, playsinline: true });
      videoEl.muted = !(videoAttribute && videoAttribute.round_message);
      videoEl.controls = false;

      // video poster
      if (document.thumbs) {
        const size = getSize(document.thumbs, photoOptions.width, photoOptions.height, photoOptions.fit);
        if (size) videoEl.poster = file(getPhotoLocation(document, size.type), { size: (size as any).size, dc_id: document.dc_id });
      }

      if (videoAttribute) useVideoArrtibuteSize(videoEl, videoAttribute, photoOptions);

      mount(container, videoEl);
      unmount(downloadBtn);
      unmount(durationEl);
      if (thumbnail instanceof HTMLElement) thumbnail.classList.add('-playing');

      isStarted = true;
    } else if (onClick) {
      onClick(document);
    } else if (thumbnail instanceof HTMLElement && message) {
      main.showPopup('gallery', { opener: getInterface(thumbnail).open(), message });
    } else {
      // eslint-disable-next-line no-lonely-if
      if (videoEl.paused) videoEl.play();
      else videoEl.pause();
    }
  });

  watchVisibility(container, (isVisible) => {
    if (videoEl) {
      if (isVisible && message) videoEl.play();
      else videoEl.pause();
    }
  });

  return container;
}
