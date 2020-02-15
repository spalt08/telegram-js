import lottiePlayer, { AnimationItem } from 'lottie-web';
import * as utils from 'client/utils';
import { div } from 'core/html';
import { useInterface, useOnUnmount, useOnMount } from 'core/hooks';

interface Props {
  src: string,
  className?: string,
  autoplay?: boolean,
  loop?: boolean,
}

export default function tgs({ src, className, autoplay = true, loop = false }: Props) {
  let animation: AnimationItem & { currentFrame: number} | undefined;
  let isMounted = false;
  let shouldPlay = autoplay;

  const container = div({ className });

  if (typeof src === 'string') {
    utils.loadTgs(src, (animationData: any) => {
      animation = lottiePlayer.loadAnimation({
        container,
        loop,
        animationData,
        autoplay: isMounted && shouldPlay,
        renderer: 'canvas',
      }) as AnimationItem & { currentFrame: number};
    });
  }

  useOnMount(container, () => {
    isMounted = true;
    if (shouldPlay && animation) {
      animation.play();
    }
  });

  useOnUnmount(container, () => {
    isMounted = false;
    if (animation) {
      animation.stop();
    }
  });

  return useInterface(container, {
    play() {
      shouldPlay = true;
      if (isMounted && animation) {
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
