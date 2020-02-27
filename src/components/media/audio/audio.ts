import { Document } from 'cache/types';
import { div, text } from 'core/html';
import './audio.scss';
import { getAttributeAudio, getReadableDuration } from 'helpers/files';
import { play } from 'components/icons';
import { waveform } from 'components/ui';

export default function audio(doc: Document.document, out: boolean) {
  const audioAttribute = getAttributeAudio(doc)!;
  const duration = getReadableDuration(audioAttribute.duration);
  return div`.document-audio`(
    div`.document-audio__play-pause`(play()),
    div`.document-audio__wave`(
      waveform(audioAttribute.waveform!, 200, 23, out ? '#4fae4e' : '#50a2e9', out ? '#aedfa4' : '#cbcbcb'),
      div`.document-audio__timing`(text(duration)),
    ));
}
