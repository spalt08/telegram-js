import { audioSeekbar, playButton, waveform } from 'components/ui';
import { useObservable } from 'core/hooks';
import { div, nothing, span, strong, text } from 'core/html';
import { getMessageDocument } from 'helpers/api';
import { getAttributeAudio, getAttributeFilename, getReadableDuration } from 'helpers/files';
import { Message } from 'mtproto-js';
import { audio as audioService } from 'services';
import { MediaPlaybackStatus } from 'services/audio';
import './audio.scss';

export default function audio(message: Message.message) {
  const button = playButton(message);
  const doc = getMessageDocument(message);
  if (doc?._ !== 'document') {
    throw new Error('Message must contain document.');
  }
  const audioAttribute = getAttributeAudio(doc)!;
  const duration = getReadableDuration(audioAttribute.duration);
  const timing = text(duration);
  const onSeek = (seek: number) => audioService.play(message, seek);
  const audioInfo = audioService.audioInfo(message);
  const track = audioAttribute.waveform
    ? waveform({ doc, barsCount: 48, audioInfo, onSeek, className: 'document-audio__waveform' })
    : audioSeekbar({ audioInfo, onSeek, className: 'document-audio__track' });
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
    div`.document-audio__play-button`(button),
    div`.document-audio__wave`(
      header ? div`.document-audio__title`(header) : nothing,
      track,
      div`.document-audio__timing`(timing),
    ));


  useObservable(container, audioInfo, true, (info) => {
    const progress = info.status === MediaPlaybackStatus.Playing ? info.playProgress * audioAttribute.duration : audioAttribute.duration;
    const newContent = info.status === MediaPlaybackStatus.Playing
      ? `${getReadableDuration(progress)} / ${getReadableDuration(audioAttribute.duration)}`
      : getReadableDuration(audioAttribute.duration);
    if (timing.textContent !== newContent) {
      timing.textContent = newContent;
    }
  });

  return container;
}
