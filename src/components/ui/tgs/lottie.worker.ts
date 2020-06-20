/* eslint-disable import/named, no-restricted-globals */
import Lottie, { AnimationItem } from 'vendor/lottie-5.6.10';
import { fetchAnimation } from './lottie';

const ctx = self as WorkerGlobalScope;
const animations = new Map<string, AnimationItem>();
const playingState = new Map<string, boolean>();

ctx.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;

  switch (message.type) {
    case 'init': {
      const { id, canvas, src, props } = message;

      if (animations.get(id)) return;

      fetchAnimation(src)
        .then((animationData) => {
          canvas.width = props.width;
          canvas.height = props.height;
          const context = (canvas as OffscreenCanvas).getContext('2d');

          if (!context) return;

          const animation = Lottie.loadAnimation({
            renderer: 'canvas',
            loop: props.loop,
            autoplay: playingState.get(id),
            animationData,
            rendererSettings: {
              context: canvas.getContext('2d'),
              clearCanvas: true,
            },
          });

          animations.set(id, animation);
        });

      break;
    }

    case 'play': {
      playingState.set(message.id, true);

      const animation = animations.get(message.id);
      if (animation) animation.play();
      break;
    }

    case 'pause': {
      playingState.set(message.id, false);

      const animation = animations.get(message.id);
      if (animation) animation.pause();
      break;
    }

    case 'destory': {
      const animation = animations.get(message.id);

      if (animation) {
        animation.destroy();
        animations.delete(message.id);
      }
      break;
    }

    default:
  }
});
