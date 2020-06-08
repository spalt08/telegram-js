/* eslint-disable import/named, no-restricted-globals */
import Lottie from 'vendor/lottie-5.6.10';
import { STICKER_CACHED_SIZE } from 'const';
import { loadAnimation } from 'components/ui/tgs/lottie';
import { ServiceNotification } from 'client/types';
import { TaskQueue } from './extensions/quene';
import { encodeAPNG } from './extensions/encoder';

const ctx = self as DedicatedWorkerGlobalScope;
const canvas = new OffscreenCanvas(STICKER_CACHED_SIZE * 2, STICKER_CACHED_SIZE * 2); // eslint-disable-line compat/compat
const rendererContext = canvas.getContext('2d');

function processWorkerTask(message: any, complete: () => void) {
  switch (message.type) {
    case 'cache_sticker': {
      if (!rendererContext) break;

      const size = STICKER_CACHED_SIZE * (message.pixelRatio || 1);

      canvas.width = size;
      canvas.height = size;

      try {
        loadAnimation(Lottie, rendererContext, message.src)
          .then((animation) => {
            const { id, src } = message;
            const frames = new Array(animation.totalFrames);
            const delays = new Array(animation.totalFrames);

            const time = Date.now();

            for (let i = 0; i < animation.totalFrames; i++) {
              const imageData = rendererContext.getImageData(0, 0, size, size);
              frames[i] = imageData.data.buffer;
              delays[i] = 1000 / animation.frameRate;

              if (i < animation.totalFrames - 1) animation.goToAndStop(i + 1, true);
              else delays[i] = 0;
            }
            console.log('render', (Date.now() - time) / 1000);

            const bytes = encodeAPNG(frames, size, size, delays);
            console.log('render + encode', (Date.now() - time) / 1000);

            caches.open('files')
              .then((cache) => {
                cache.put(`/stickers/${id}.png`, new Response(bytes, { headers: { 'Content-Type': 'image/png' } }));
                ctx.postMessage({ type: 'sticker_cached', payload: { id, src } } as ServiceNotification);
                complete();
              });
          });
      } catch (e) {
        complete();
      }

      break;
    }

    default:
      complete();
  }
}

const queue = new TaskQueue({
  compare: (left, right) => (left.priority || 0) - (right.priority || 0),
  process: processWorkerTask,
});

ctx.addEventListener('message', (event: MessageEvent) => {
  queue.register(event.data);
});
