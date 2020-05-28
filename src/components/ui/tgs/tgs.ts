import { AnimationItem } from 'lottie-web';
import loadLottie from 'lazy-modules/lottie';
import { div } from 'core/html';
import { useInterface, useOnMount, useOnUnmount } from 'core/hooks';
import { watchVisibility } from 'core/dom';

interface Props {
  src: string,
  className?: string,
  autoplay?: boolean,
  loop?: boolean,
  onLoad?: () => void;
}

type AnimationHandler = AnimationItem & { currentFrame: number };
let loadQueuened = 0;

export default function tgs({ src, className, autoplay = true, loop = false, onLoad }: Props) {
  let animation: AnimationHandler | undefined;
  let animationData: any;
  let isVisible = false;
  let isRequested = false;
  let shouldPlay = autoplay;

  const container = div({ className });

  const loadAnimation = () => (
    new Promise<AnimationHandler>((resolve) => {
      const queue = ++loadQueuened;

      const loadOnFrame = () => {
        if (loadQueuened <= queue) {
          loadLottie().then((player) => {
            // console.log('loadAnimation');
            if (onLoad) onLoad();
            if (animation) resolve(animation);

            animation = player.loadAnimation({
              container,
              loop,
              animationData,
              autoplay: isVisible && shouldPlay,
              renderer: 'canvas',
            }) as AnimationHandler;

            animationData = undefined;
            resolve(animation);
            requestAnimationFrame(() => loadQueuened--);
          });
        } else {
          requestAnimationFrame(loadOnFrame);
        }
      };

      if (queue === 1) loadOnFrame();
      else requestAnimationFrame(loadOnFrame);
    })
  );

  const playAnimation = () => {
    // console.log('playAnimation');
    if (animationData && !animation) loadAnimation().then((handler) => shouldPlay && handler.play());
    if (shouldPlay && animation) animation.play();
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
    if (animation) animation.stop();
  });

  watchVisibility(container, (_isVisible) => {
    isVisible = _isVisible;

    if (isVisible && isRequested) playAnimation();
    else if (!isVisible && animation) animation.stop();
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
        animation.stop();
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
