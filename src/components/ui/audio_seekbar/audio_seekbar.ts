import { DocumentAttribute } from 'cache/types';
import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import './audio_seekbar.scss';

export default function audioSeekbar(a: DocumentAttribute.documentAttributeAudio, width: number) {
  const played = div`.audioSeekbar__played`();
  const left = div`.audioSeekbar__left`();
  const container = div`.audioSeekbar`(played, left);
  container.style.width = `${width}px`;
  return useInterface(container, {
    updateProgress: (progress: number) => {
      played.style.flexGrow = `${progress}`;
      left.style.flexGrow = `${1 - progress}`;
    },
  });
}
