import { Document } from 'mtproto-js';
import { div, nothing, video } from 'core/html';
import { getAttributeVideo, useVideoArrtibuteSize } from 'helpers/files';
import { stream, file } from 'client/media';
import { useOnMount, useOnUnmount } from 'core/hooks';
import { PhotoOptions } from 'helpers/other';
import { getSize, getPhotoLocation } from 'helpers/photo';
import videoRenderer from './video';
import './video.scss';

export default function videoStreamRenderer(document: Document.document, options: PhotoOptions = {}, autoplay = true): Node {
  const videoAttribute = getAttributeVideo(document);

  if (!videoAttribute) return nothing;
  if (!videoAttribute.supports_streaming) return videoRenderer(document, options, true);

  const videoEl = video`.video__player`({ controls: true, playsinline: true });

  // video poster
  if (document.thumbs && options.thumb) {
    if (typeof options.thumb === 'string') videoEl.poster = options.thumb;
    else {
      const size = getSize(document.thumbs, options.width, options.height, options.fit);
      if (size) videoEl.poster = file(getPhotoLocation(document, size.type), { size: size.size, dc_id: document.dc_id });
    }
  }

  if (autoplay) videoEl.autoplay = true;

  const container = div`.video`(videoEl);

  useVideoArrtibuteSize(container, videoAttribute, options);

  useOnUnmount(container, () => videoEl.src = '');
  useOnMount(container, () => videoEl.src = stream(document));

  return container;
}
