import { Document, Peer, Message } from 'mtproto-js';
import { div, text } from 'core/html';
import { getAttributeVideo, getReadableDuration, getAttributeAnimated } from 'helpers/files';
import { main } from 'services';
import { PhotoOptions } from 'helpers/other';
import './preview.scss';
import { listen } from 'core/dom';
import { getInterface } from 'core/hooks';
import photoRenderer from '../photo/photo';

export default function videoPreview(video: Document.document, photoOptions: PhotoOptions = {}, message?: Message.message) {
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
    if (!(thumbnail instanceof HTMLElement) || !message) return;
    main.showPopup('gallery', { opener: getInterface(thumbnail).open(), message });
  });

  return container;
}
