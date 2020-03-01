import { Document } from 'cache/types';
import { div, text, nothing } from 'core/html';
import { getAttributeAudio, getReadableDuration } from 'helpers/files';
import { playButton, audioSeekbar, waveform } from 'components/ui';
import { getInterface, useObservable } from 'core/hooks';
import { media as mediaService } from 'services';
import { MediaPlaybackStatus } from 'services/media';
import './audio.scss';

export default function audio(doc: Document.document, out: boolean) {
  const button = playButton(doc);
  const audioAttribute = getAttributeAudio(doc)!;
  const duration = getReadableDuration(audioAttribute.duration);
  const timing = text(duration);
  const track = audioAttribute.waveform
    ? waveform(audioAttribute.waveform, 192, 23, out ? 0x4fae4e : 0x50a2e9, out ? 0xaedfa4 : 0xcbcbcb)
    : audioSeekbar(audioAttribute, 192);
  const container = div`.document-audio`(
    button,
    div`.document-audio__wave`(
      audioAttribute.title ? div`.document-audio__title`(text(audioAttribute.title)) : nothing,
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
