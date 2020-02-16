import { Document } from 'cache/types';
import { div, text } from 'core/html';
import { getAttributeVideo, getReadableDuration, getAttributeAnimated } from 'helpers/files';
import photoRenderer, { PhotoOptions } from '../photo/photo';
import './preview.scss';

export default function videoPreview(video: Document.document, photoOptions: PhotoOptions = {}) {
  const thumbnail = photoRenderer(video, photoOptions);

  const videoAttribute = getAttributeVideo(video);
  const gifAttribute = getAttributeAnimated(video);

  let duration = '00:00';
  if (gifAttribute) duration = 'GIF';
  else if (videoAttribute) duration = getReadableDuration(videoAttribute.duration);

  return div`.video-preview`(
    div`.video-preview__duration`(text(duration)),
    div`.video-preview__playbtn`(),
    thumbnail,
  );
}
