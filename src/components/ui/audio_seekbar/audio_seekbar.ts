import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import './audio_seekbar.scss';

export default function audioSeekbar() {
  const played = div`.audioSeekbar__played`();
  const left = div`.audioSeekbar__left`();
  const container = div`.audioSeekbar`(played, left);
  return useInterface(container, {
    updateProgress: (progress: number) => {
      played.style.display = progress > 0 ? 'block' : 'none';
      played.style.flexGrow = `${progress}`;
      left.style.flexGrow = `${1 - progress}`;
    },
  });
}
