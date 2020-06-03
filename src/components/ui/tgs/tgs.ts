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
type LottieLoadCallback = (lottie: LottiePlayer) => void;
const queue: Array<LottieLoadCallback> = [];
let lottie: LottiePlayer | undefined;
let isFreezed = false;
let isProcessing = false;

export function tgsFreeze() {
  if (lottie) lottie.freeze();
  isFreezed = true;
}

function load() {
  isProcessing = true;

  loadLottie().then((player) => {
    if (isFreezed) {
      isProcessing = false;
      return;
    }

    const cb = queue.shift();

    if (!cb) {
      isProcessing = false;
      return;
    }

    cb(lottie = player);
    requestAnimationFrame(() => requestAnimationFrame(load));
  });
}

function queueLoading(cb: (lottie: LottiePlayer) => void) {
  queue.push(cb);
  if (!isProcessing && !isFreezed) load();
}

export function tgsUnFreeze() {
  if (lottie) lottie.unfreeze();

  if (!isProcessing) load();
  isFreezed = false;
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

      queueLoading((player) => {
        isLoading = false;

        if (!isVisible) return;

        animation = player.loadAnimation({
          container,
          loop,
          animationData,
          autoplay: isVisible && shouldPlay,
          renderer: 'canvas',
        }) as AnimationHandler;

        animation.frameRate = 30;
        if (onLoad) onLoad();
      });
    }
  };

  const playAnimation = () => {
    if (!shouldPlay || !isVisible) return;

    if (animationData && !animation) loadAnimation();
    if (shouldPlay && animation && animation.isPaused) animation.play();
  };

  useOnMount(container, () => {
    if (isRequested || animationData) return;

    isRequested = true;

    fetch(src)
      .then((res) => res.json())
      .then((data: any) => {
        animationData = data;
        isRequested = false;
        if (isVisible) playAnimation();
      })
      .catch(() => {
        isRequested = false;
      });
  });

  useOnUnmount(container, () => {
    if (animation) {
      animation.destroy();
      animation = undefined;
    }
  });

  if (playOnHover) {
    listen(container, 'mouseenter', () => playAnimation());
    listen(container, 'mouseleave', () => animation && !animation.isPaused && animation.pause());
  }

  watchVisibility(container, (_isVisible) => {
    isVisible = _isVisible;

    if (isVisible && animationData) playAnimation();
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
