import { Document, Peer, Message } from 'mtproto-js';
import { div, text } from 'core/html';
import { listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import { getAttributeVideo, getReadableDuration, getAttributeAnimated } from 'helpers/files';
import { main } from 'services';
import { PhotoOptions } from 'helpers/other';
import photoRenderer from '../photo/photo';
import './preview.scss';

export default function videoPreview(video: Document.document, photoOptions: PhotoOptions = {}, peer?: Peer, message?: Message.message) {
  const thumbnail = photoRenderer(video, { ...photoOptions, className: '' });

  const videoAttribute = getAttributeVideo(video);
  const gifAttribute = getAttributeAnimated(video);

  let duration = '00:00';
  if (gifAttribute) duration = 'GIF';
  else if (videoAttribute) duration = getReadableDuration(videoAttribute.duration);

  const container = div`.video-preview${photoOptions.className || ''}`(
    div`.video-preview__duration`(text(duration)),
    div`.video-preview__playbtn`(),
    thumbnail,
  );

  listen(container, 'click', () => {
    if (!(thumbnail instanceof HTMLElement)) return;

    const rect = getInterface(thumbnail).rect();

    if (rect) main.showPopup('video', { rect, peer, video, message });
  });

  return container;
}
