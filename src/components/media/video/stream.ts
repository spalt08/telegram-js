import { Document } from 'mtproto-js';
import { div, nothing, video } from 'core/html';
import { getDocumentLocation, getAttributeVideo, useVideoArrtibuteSize } from 'helpers/files';
import { cached as getCached, requestStream, seekStream, revokeStream } from 'client/media';
import { useOnMount, useListenWhileMounted, useOnUnmount } from 'core/hooks';
import { PhotoOptions } from 'helpers/other';
import videoRenderer from './video';
import './video.scss';

export default function videoStreamRenderer(document: Document.document, options: PhotoOptions = {}): Node {
  const location = getDocumentLocation(document, '');
  const videoAttribute = getAttributeVideo(document);

  if (!videoAttribute) return nothing;
  if (!videoAttribute.supports_streaming) return videoRenderer(document, options, true);

  const videoEl = video({ autoplay: true, loop: true, controls: true });
  const cached = getCached(location);
  const container = div`.video`(videoEl);

  useVideoArrtibuteSize(container, videoAttribute, options);

  // no streaming needed
  if (cached) {
    videoEl.src = cached;
    return container;
  }

  // request stream on mount
  useOnMount(container, () => {
    videoEl.src = requestStream(
      location,
      {
        dc_id: document.dc_id,
        size: document.size,
        mime_type: document.mime_type,
        duration: videoAttribute.duration,
      },
    );
  });

  useOnUnmount(container, () => revokeStream(location));

  let seekValue = 0;
  useListenWhileMounted(container, videoEl, 'seeking', () => {
    if (videoEl.currentTime !== seekValue) {
      seekStream(location, Math.floor(videoEl.currentTime));

      seekValue = Math.floor(videoEl.currentTime) + 1; // fix for mp4box fragments
      videoEl.currentTime = seekValue;
    }
  });

  return container;
}
