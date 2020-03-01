import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import { listen } from 'core/dom';
import './audio_seekbar.scss';

export default function audioSeekbar(seek?: (position: number) => void) {
  const played = div`.audioSeekbar__played`();
  const left = div`.audioSeekbar__left`();
  const container = div`.audioSeekbar`(played, left);

  if (seek) {
    listen(container, 'click', (e) => {
      seek((e.clientX - container.getBoundingClientRect().left) / container.clientWidth);
    });
  }

  return useInterface(container, {
    updateProgress: (progress: number) => {
      played.style.display = progress > 0 ? 'block' : 'none';
      played.style.flexGrow = `${progress}`;
      left.style.flexGrow = `${1 - progress}`;
    },
  });
}
