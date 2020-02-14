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
  let animation: AnimationItem & { currentFrame: number};
  let delayedPlay = false;

  const container = div({ className });

  if (typeof src === 'string') {
    utils.loadTgs(src, (animationData: any) => {
      animation = lottiePlayer.loadAnimation({
        container,
        loop,
        animationData,
        autoplay: autoplay || delayedPlay,
        renderer: 'canvas',
      }) as AnimationItem & { currentFrame: number};
    });
  }

  useOnUnmount(container, () => animation && animation.stop());
  useOnMount(container, () => autoplay && animation && animation.play());

  return useInterface(container, {
    pause() { if (animation) animation.pause(); delayedPlay = false; },
    play() { if (animation) animation.play(); else delayedPlay = true; },
    goTo(value: number, animate: boolean = false) {
      if (animation.currentFrame === 0) {
        animation.playSegments([0, value + 1], true);
      } else if (value === 0) {
        animation.playSegments([animation.currentFrame, 0], true);
      } else if (animate) {
        animation.playSegments([animation.currentFrame, value], true);
      } else {
        animation.goToAndStop(value, true);
      }
    },
  });
}
