import { listen, unmountChildren, mount } from 'core/dom';
import { useObservable } from 'core/hooks';
import { div } from 'core/html';
import { Observable } from 'rxjs';
import { MediaPlaybackState } from 'services/audio';
import './audio_seekbar.scss';

type Props = {
  className?: string;
  audioInfo: Observable<MediaPlaybackState>;
  onSeek?: (position: number) => void;
};

export default function audioSeekbar({ audioInfo, className, onSeek }: Props) {
  const played = div`.audioSeekbar__played`();
  const notBuffered = div`.audioSeekbar__not-buffered`();
  const bufferedRanges = div`.audioSeekbar__inner`();
  const container = div`.audioSeekbar${className}`(notBuffered, bufferedRanges, played);

  if (onSeek) {
    listen(container, 'click', (e) => {
      onSeek((e.clientX - container.getBoundingClientRect().left) / container.clientWidth);
    });
  }

  useObservable(container, audioInfo, true, (info) => {
    played.style.display = info.playProgress > 0 ? 'block' : 'none';
    played.style.right = `${100 - info.playProgress * 100}%`;
    if (info.buffered) {
      if (info.buffered.length !== bufferedRanges.childElementCount) {
        unmountChildren(bufferedRanges);
        for (let i = 0; i < info.buffered.length; i++) {
          mount(bufferedRanges, div`.audioSeekbar__buffered-range`());
        }
      }
      for (let i = 0; i < info.buffered.length; i++) {
        const rangeEl = bufferedRanges.children[i] as HTMLElement;
        rangeEl.style.left = `${(info.buffered.start(i) / info.duration) * 100}%`;
        rangeEl.style.right = `${(1 - info.buffered.end(i) / info.duration) * 100}%`;
      }
    } else {
      unmountChildren(bufferedRanges);
    }
  });

  return container;
}
