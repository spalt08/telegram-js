/* eslint-disable import/named, no-restricted-globals */
import Lottie from 'vendor/lottie-5.6.10';
import { STICKER_CACHED_SIZE } from 'const';
import { loadAnimation } from 'components/ui/tgs/lottie';
import { TaskQueue } from './extensions/quene';
import { compress } from './extensions/compression';

const ctx = self as DedicatedWorkerGlobalScope;
const canvas = new OffscreenCanvas(STICKER_CACHED_SIZE * 2, STICKER_CACHED_SIZE * 2); // eslint-disable-line compat/compat
const rendererContext = canvas.getContext('2d');

let cache: Cache | undefined;
function putCache(path: string, data: ArrayBuffer) {
  if (cache) return cache.put(path, new Response(data));

  return caches.open('animation').then((opened) => {
    cache = opened;
    opened.put(path, new Response(data, { headers: { 'Content-Type': 'application/octet-stream' } }));
  });
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
            const { id } = message;

            const header = {
              version: 1,
              totalFrames: animation.totalFrames,
              frameRate: animation.frameRate,
              width: size,
            };

            // const imageData = rendererContext.getImageData(0, 0, size, size);
            // console.log(size, imageData);
            // const compressed = compress(imageData.data, header);
            // console.log(compressed);
            // console.log(decompress(compressed));

            // const imageData = rendererContext.getImageData(0, 0, size, size);
            // const compressed = compress(imageData.data, header);
            // console.log(compressed);
            // //console.log(decompress(compressed));
            // putCache(`/frames/${id}_${0}`, compressed);

            for (let i = 0; i < animation.totalFrames; i++) {
              const imageData = rendererContext.getImageData(0, 0, size, size);
              putCache(`/frames/${id}/${i}`, compress(imageData.data, header));
              if (i < animation.totalFrames - 1) animation.renderer.renderFrame(i + 1);
            }

            animation.destroy();
            complete();
            // caches.open('files')
            //   .then((cache) => {
            //     // cache.put(`/stickers/${id}.png`, new Response(bytes, { headers: { 'Content-Type': 'image/png' } }));
            //     // ctx.postMessage({ type: 'sticker_cached', payload: { id, src } } as ServiceNotification);
            //     complete();
            //   });
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
