import { inflate } from 'pako/lib/inflate';
import lottiePlayer, { AnimationItem } from 'lottie-web';
import { div } from 'core/html';
import { useInterface, useOnUnmount, useOnMount } from 'core/hooks';

const load = (url: string, cb: (json: any) => void) => {
  const xhr = new XMLHttpRequest();

  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';
  xhr.send();

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const data = inflate(xhr.response, { to: 'string' });
      const json = JSON.parse(data);

      cb(json);
    }
  };
};

interface Props {
  src: string,
  className?: string,
  autoplay?: boolean,
  loop?: boolean,
}

export default function tgs({ src, className, autoplay = false, loop = false }: Props) {
  let animation: AnimationItem & { currentFrame: number};

  const container = div({ className });

  if (typeof src === 'string') {
    load(src, (animationData: any) => {
      animation = lottiePlayer.loadAnimation({
        container,
        loop,
        animationData,
        renderer: 'canvas',
      }) as AnimationItem & { currentFrame: number};
    });
  }

  useOnUnmount(container, () => animation.stop());
  useOnMount(container, () => autoplay && animation && animation.play());

  return useInterface(container, {
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
