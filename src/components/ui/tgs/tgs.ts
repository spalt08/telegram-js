import { AnimationItem } from 'lottie-web';
import loadLottie, { LottiePlayer } from 'lazy-modules/lottie';
import { div } from 'core/html';
import { useInterface, useOnMount, useOnUnmount } from 'core/hooks';
import { watchVisibility, listen } from 'core/dom';

interface Props {
  src: string,
  className?: string,
  autoplay?: boolean,
  loop?: boolean,
  playOnHover?: boolean,
  onLoad?: () => void;
}

type AnimationHandler = AnimationItem & { currentFrame: number };

const queue: Array<(lottie: LottiePlayer) => void> = [];
let isQueueing = false;

function load() {
  isQueueing = true;

  loadLottie().then((lottie) => {
    const cb = queue.shift();

    if (!cb) {
      isQueueing = false;
      return;
    }

    cb(lottie);
    requestAnimationFrame(() => requestAnimationFrame(load));
  });
}

function queueLoading(cb: (lottie: LottiePlayer) => void) {
  queue.push(cb);
  if (!isQueueing) load();
}

export default function tgs({ src, className, autoplay = true, loop = false, playOnHover = false, onLoad }: Props) {
  let animation: AnimationHandler | undefined;
  let animationData: any;
  let isVisible = false;
  let isRequested = false;
  let isLoading = false;
  let shouldPlay = autoplay;

  const container = div({ className });

  const loadAnimation = () => {
    if (animation && shouldPlay && isVisible) animation.play();


    if (!animation && animationData) {
      if (isLoading) return;

      isLoading = true;

      queueLoading((lottie) => {
        if (!isVisible) return;

        animation = lottie.loadAnimation({
          container,
          loop,
          animationData,
          autoplay: isVisible && shouldPlay,
          renderer: 'canvas',
        }) as AnimationHandler;

        animationData = undefined;

        if (onLoad) onLoad();
        if (shouldPlay && isVisible) animation.play();
      });
    }
  };

  const playAnimation = () => {
    // console.log('playAnimation');
    if (animationData && !animation) loadAnimation();
    if (shouldPlay && animation && animation.isPaused) animation.play();
  };

  useOnMount(container, () => {
    if (isRequested) return;

    isRequested = true;
    fetch(src)
      .then((res) => res.json())
      .then((data: any) => {
        animationData = data;
        if (isVisible) playAnimation();
      });
  });

  useOnUnmount(container, () => {
    if (animation) {
      animation.destroy();
      animation = undefined;
    }
  });

  if (playOnHover) {
    listen(container, 'mouseenter', () => animation && animation.isPaused && animation.play());
    listen(container, 'mouseleave', () => animation && !animation.isPaused && animation.pause());
  }

  watchVisibility(container, (_isVisible) => {
    isVisible = _isVisible;

    if (isVisible && isRequested) playAnimation();
    else if (!isVisible && animation && !animation.isPaused) animation.pause();
  });

  return useInterface(container, {
    play() {
      // console.log('playi');
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
      if (animation && isVisible) {
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

/**
 * Call it to preload the required assets before creating a TGS element. It can be called multiple times.
 *
 * It should be used when you load a TGS URL before creating a TGS element.
 * Such way the TGS and the assets will be loading simultaneously.
 */
export function preloadTgsAssets() {
  loadLottie();
}
