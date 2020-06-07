/* eslint-disable import/named, no-restricted-globals */
import Lottie, { AnimationItem } from 'vendor/lottie-5.6.10';
import { fetchAnimation } from './lottie';

const ctx = self as WorkerGlobalScope;
const animations = new Map<string, AnimationItem>();
const playingState = new Map<string, boolean>();

ctx.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;

  console.log(message);

  switch (message.type) {
    case 'init': {
      const { id, canvas, src, props } = message;

      if (animations.get(id)) return;

      fetchAnimation(src)
        .then((animationData) => {
          canvas.width = 400;
          canvas.height = 400;
          const context = (canvas as OffscreenCanvas).getContext('2d');

          if (!context) return;

          const animation = Lottie.loadAnimation({
            renderer: 'canvas',
            loop: props.loop,
            autoplay: false,
            animationData,
            rendererSettings: {
              context: canvas.getContext('2d'),
              clearCanvas: true,
            },
          });

          animations.set(id, animation);

          if (playingState.get(id) !== true) return;

          const frames = new Array<ImageData>(animation.totalFrames);

          for (let i = 0; i < animationData.op; i++) {
            animation.goToAndStop(i, true);
            frames[i] = context.getImageData(0, 0, canvas.width, canvas.height);
          }

          let frame = 0;
          const drawFrame = () => {
            context.putImageData(frames[frame], 0, 0);
            frame++;
            if (frame > animation.totalFrames - 1) frame = 0;
            requestAnimationFrame(drawFrame);
          };

          requestAnimationFrame(drawFrame);
          // if (playingState.get(id) === true) animation.play();
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
