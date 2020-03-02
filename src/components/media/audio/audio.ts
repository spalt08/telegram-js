import { Document } from 'cache/types';
import { div, text, nothing, strong, span } from 'core/html';
import { getAttributeAudio, getReadableDuration, getAttributeFilename } from 'helpers/files';
import { playButton, audioSeekbar, waveform } from 'components/ui';
import { getInterface, useObservable } from 'core/hooks';
import { media as mediaService } from 'services';
import { MediaPlaybackStatus } from 'services/media';
import './audio.scss';

export default function audio(doc: Document.document) {
  const button = playButton(doc);
  const audioAttribute = getAttributeAudio(doc)!;
  const duration = getReadableDuration(audioAttribute.duration);
  const timing = text(duration);
  const onSeek = (seek: number) => mediaService.playAudio(doc, seek);
  const track = audioAttribute.waveform
    ? waveform(doc, 48, onSeek)
    : audioSeekbar(onSeek);
  let header: Node | undefined;
  if (audioAttribute.performer || audioAttribute.title) {
    if (audioAttribute.performer && audioAttribute.title) {
      header = span(strong(text(audioAttribute.performer)), text(` \u2014 ${audioAttribute.title}`));
    } else {
      header = text(audioAttribute.performer || audioAttribute.title || '');
    }
  }
  if (!header) {
    const filenameAttribute = getAttributeFilename(doc);
    if (filenameAttribute) {
      header = text(filenameAttribute.file_name);
    }
  }

  const container = div`.document-audio`(
    button,
    div`.document-audio__wave`(
      header ? div`.document-audio__title`(header) : nothing,
      track,
      div`.document-audio__timing`(timing),
    ));


  useObservable(container, mediaService.audioInfo(doc), (info) => {
    getInterface(track).updateProgress(info.playProgress);
    getInterface(button).setStatus(info.status);
    getInterface(button).setProgress(info.downloadProgress);
    const progress = info.status === MediaPlaybackStatus.Playing ? info.playProgress * audioAttribute.duration : audioAttribute.duration;
    if (info.status === MediaPlaybackStatus.Playing) {
      timing.textContent = `${getReadableDuration(progress)} / ${getReadableDuration(audioAttribute.duration)}`;
    } else {
      timing.textContent = getReadableDuration(audioAttribute.duration);
    }
  });

  return container;
}
