import { Document } from 'mtproto-js';
import { div, nothing, video } from 'core/html';
import { getAttributeVideo, useVideoArrtibuteSize } from 'helpers/files';
import { stream } from 'client/media';
import { useOnMount, useOnUnmount } from 'core/hooks';
import { PhotoOptions } from 'helpers/other';
import videoRenderer from './video';
import './video.scss';

export default function videoStreamRenderer(document: Document.document, options: PhotoOptions = {}): Node {
  const videoAttribute = getAttributeVideo(document);

  if (!videoAttribute) return nothing;
  if (!videoAttribute.supports_streaming) return videoRenderer(document, options, true);

  const videoEl = video`.video__player`({ autoplay: true, loop: true, controls: true, playsinline: true });
  const container = div`.video`(videoEl);

  useVideoArrtibuteSize(container, videoAttribute, options);

  useOnUnmount(container, () => videoEl.src = '');
  useOnMount(container, () => videoEl.src = stream(document));

  return container;
}
