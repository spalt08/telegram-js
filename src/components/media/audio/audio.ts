import { audioSeekbar, playButton, waveform } from 'components/ui';
import { useObservable } from 'core/hooks';
import { div, nothing, span, strong, text } from 'core/html';
import { getMessageDocument } from 'helpers/api';
import { getAttributeAudio, getAttributeFilename, getReadableDuration } from 'helpers/files';
import { Message, DocumentAttribute, Document } from 'mtproto-js';
import { audio as audioService } from 'services';
import { MediaPlaybackStatus, MediaPlaybackState } from 'services/audio';
import './audio.scss';
import { Observable } from 'rxjs';
import { userCache } from 'cache';
import { userToTitle } from 'cache/accessors';

function createTrack(
  audioAttribute: DocumentAttribute.documentAttributeAudio,
  doc: Document.document,
  audioInfo: Observable<MediaPlaybackState>,
  onSeek: (seek: number) => void) {
  return audioAttribute.waveform
    ? waveform({ doc, barsCount: 48, audioInfo, onSeek, className: 'document-audio__waveform' })
    : audioSeekbar({ audioInfo, onSeek, className: 'document-audio__track' });
}

export default function audio(message: Message.message, noTrack = false) {
  const button = playButton(message);
  const doc = getMessageDocument(message);
  if (doc?._ !== 'document') {
    // Message must contain document.
    return div();
  }
  const audioAttribute = getAttributeAudio(doc);
  if (!audioAttribute) {
    // Message must contain audio attribute.
    return div();
  }
  const duration = getReadableDuration(audioAttribute.duration);
  const timing = text(duration);
  const onSeek = (seek: number) => audioService.play(message, seek);
  const audioInfo = audioService.audioInfo(message);
  const track = noTrack ? nothing : createTrack(audioAttribute, doc, audioInfo, onSeek);
  let header: Node | undefined;
  if (noTrack && audioAttribute.voice) {
    const user = userCache.get(message.from_id!);
    header = text(userToTitle(user));
  } else if (audioAttribute.performer || audioAttribute.title) {
    if (audioAttribute.performer && audioAttribute.title) {
      header = span(strong(text(audioAttribute.performer)), text(` \u2014 ${audioAttribute.title}`));
    } else {
      header = text(audioAttribute.performer || audioAttribute.title || '');
    }
  }
  if (!header && !audioAttribute.voice) {
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
