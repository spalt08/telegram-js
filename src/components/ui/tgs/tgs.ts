import lottie, { AnimationItem } from 'lottie-web';
import loadLottie from 'lazy-modules/lottie';
import * as utils from 'client/utils';
import { div } from 'core/html';
import { useInterface } from 'core/hooks';
import { watchVisibility } from 'core/dom';

interface Props {
  src: string,
  className?: string,
  autoplay?: boolean,
  loop?: boolean,
}

export default function tgs({ src, className, autoplay = true, loop = false }: Props) {
  let animation: AnimationItem & { currentFrame: number} | undefined;
  let isVisible = false;
  let shouldPlay = autoplay;

  const container = div({ className });

  if (typeof src === 'string') {
    Promise.all([
      loadLottie(),
      new Promise((resolve) => utils.loadTgs(src, resolve)),
    ]).then(([lottiePlayer, animationData]: [typeof lottie, any]) => {
      animation = lottiePlayer.loadAnimation({
        container,
        loop,
        animationData,
        autoplay: isVisible && shouldPlay,
        renderer: 'canvas',
      }) as AnimationItem & { currentFrame: number};
    });
  }

  watchVisibility(container, (_isVisible) => {
    if (_isVisible) {
      isVisible = true;
      if (animation) {
        animation.resize();
        if (shouldPlay) {
          animation.play();
        }
      }
    } else {
      isVisible = false;
      if (animation) {
        animation.stop();
      }
    }
  });

  return useInterface(container, {
    play() {
      shouldPlay = true;
      if (isVisible && animation) {
        animation.play();
      }
    },
    pause() {
      shouldPlay = false;
      if (animation) {
        animation.pause();
      }
    },
    resize() {
      if (animation) {
        animation.resize();
      }
    },
    goTo(value: number, animate: boolean = false) {
      if (animation) {
        if (animation.currentFrame === 0) {
          animation.playSegments([0, value + 1], true);
        } else if (value === 0) {
          animation.playSegments([animation.currentFrame, 0], true);
        } else if (animate) {
          animation.playSegments([animation.currentFrame, value], true);
        } else {
          animation.goToAndStop(value, true);
        }
      }
    },
  });
}
