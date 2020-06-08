/* eslint-disable import/named, no-restricted-globals */
import { ServiceNotification } from 'client/types';
import { loadAnimation } from 'components/ui/tgs/lottie';
import { STICKER_CACHED_SIZE } from 'const';
import { AnimationItem } from 'lottie-web';
import Lottie from 'vendor/lottie-5.6.10';
import * as c2a from './canvas2apng';
import { TaskQueue } from './extensions/quene';

const ctx = self as DedicatedWorkerGlobalScope;
const canvas = new OffscreenCanvas(STICKER_CACHED_SIZE * 2, STICKER_CACHED_SIZE * 2); // eslint-disable-line compat/compat
const rendererContext = canvas.getContext('2d');

async function convertToApng(animation: AnimationItem) {
  const delays = new Array(animation.totalFrames);
  const encoder = new c2a.APNGencoder(canvas);
  encoder.start();
  encoder.setDelay(2);
  encoder.setDispose(1);
  encoder.setBlend(1);

  for (let i = 0; i < animation.totalFrames; i++) {
    encoder.setDelay(1000 / animation.frameRate);

    // eslint-disable-next-line no-await-in-loop
    await encoder.addFrame();

    if (i < animation.totalFrames - 1) animation.goToAndStop(i + 1, true);
    else delays[i] = 0;
  }
  encoder.finish();
  animation.destroy();
  return new Uint8Array(encoder.stream()!);
}

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
            const time = Date.now();
            convertToApng(animation).then((bytes: ArrayBuffer) => {
              console.log('render', (Date.now() - time) / 1000);
              console.log('render + encode', (Date.now() - time) / 1000);

              caches.open('files')
                .then((cache) => {
                  cache.put(`/stickers/${id}.png`, new Response(bytes, { headers: { 'Content-Type': 'image/png' } }));
                  ctx.postMessage({ type: 'sticker_cached', payload: { id, src } } as ServiceNotification);
                  complete();
                });
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
