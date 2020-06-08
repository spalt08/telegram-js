/* eslint-disable import/named, no-restricted-globals */
import Lottie from 'vendor/lottie-5.6.10';
import UPNG from 'upng-js';
import { play, pause, destroy, handleFrame, fetchAnimationData } from './lottie';

const ctx = self as WorkerGlobalScope;

const size = 400;
const rendererCanvas = new OffscreenCanvas(size, size); // eslint-disable-line compat/compat
const spriteCanvas = new OffscreenCanvas(size, size); // eslint-disable-line compat/compat
const rendererContext = rendererCanvas.getContext('2d');
const spriteContext = spriteCanvas.getContext('2d');

let c = 0;
ctx.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;
  console.log(message);

  switch (message.type) {
    case 'init': {
      const { id, canvas, src } = message;

      // const context = (canvas as OffscreenCanvas).getContext('2d');
      // if (!context) return;
      c++;
      if (c > 1) return;
      // loadAnimation(Lottie, context, id, src, canvas.width);
      fetchAnimationData(src)
        .then((data) => {
          if (!rendererContext) return;
          if (!spriteContext) return;

          const animation = Lottie.loadAnimation({
            renderer: 'canvas',
            loop: false,
            autoplay: false,
            animationData: data,
            rendererSettings: {
              context: rendererContext,
              clearCanvas: true,
            },
          });

          console.log(animation.totalFrames);

          const countX = 10;
          const countY = Math.ceil(animation.totalFrames / countX);
          const time = Date.now();
          // spriteCanvas.width = countX * size;
          // spriteCanvas.height = countY * size;
          // for (let i = 0; i < animation.totalFrames; i++) {
          //   const imageData = rendererContext.getImageData(0, 0, size, size);
          //   spriteContext.putImageData(imageData, (i % countX) * size, Math.floor(i / countX) * size);
          // }

          // spriteCanvas.convertToBlob({ quality: 0.95, type: 'image/png' })
          //   .then((blob) => {
          //     console.log((Date.now() - time) / 1000);
          //     caches.open('files').then((cache) => cache.put(`/documents/sprite_${id}.png`, new Response(blob)));
          //   });

          const frames = new Array(animation.totalFrames);
          const milisecs = new Array(animation.totalFrames);
          for (let i = 0; i < animation.totalFrames; i++) {
            const imageData = rendererContext.getImageData(0, 0, size, size);
            frames[i] = imageData.data.buffer;
            milisecs[i] = 16;
            if (i < animation.totalFrames - 1) animation.goToAndStop(i + 1, true);
          }
          console.log((Date.now() - time) / 1000);
          const apng = UPNG.encode(frames, size, size, 0, milisecs);
          // const blob = new Blob(apng, { type: 'image/png' });
          caches.open('files').then((cache) => cache.put(`/documents/apng_${id}.png`, new Response(apng, { headers: { 'Content-Type': 'image/png' } })));
        });
      break;
    }

    case 'play': {
      play(message.id);
      break;
    }

    case 'pause': {
      pause(message.id);
      break;
    }

    case 'destory': {
      destroy(message.id);
      break;
    }

    default:
  }
});

handleFrame();
