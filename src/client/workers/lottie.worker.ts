/* eslint-disable import/named, no-restricted-globals */
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import Lottie from 'vendor/lottie-5.6.10';

type StickerCacheTask = { id: string, src: string, width: number };
const ctx = self as DedicatedWorkerGlobalScope;
const canvases = new Map<number, OffscreenCanvasRenderingContext2D>();

function getCanvasContext(width: number) {
  let context = canvases.get(width);
  if (!context) {
    // eslint-disable-next-line compat/compat
    context = new OffscreenCanvas(width, width).getContext('2d')!;
    canvases.set(width, context);
  }
  return context;
}

/**
 * Cache sticker task entry point
 */
function cacheSticker({ id, src, width }: StickerCacheTask) {
  fetch(src)
    .then((response) => response.json())
    .then((animationData) => {
      const start = performance.now();
      const context = getCanvasContext(width);
      const animation = Lottie.loadAnimation({
        animationData,
        autoplay: false,
        loop: false,
        renderer: 'canvas',
        rendererSettings: {
          context,
        },
      });

      const { totalFrames, frameRate, playSpeed } = animation;
      for (let i = 0; i < totalFrames; i++) {
        animation.renderer.renderFrame(i);
        const data = context.canvas.transferToImageBitmap();

        ctx.postMessage({
          type: 'cached_frame',
          id,
          frame: i,
          data,
          header: { totalFrames, width, frameRate: frameRate * playSpeed },
        } as CanvasWorkerResponse, [data]);
      }

      animation.destroy();

      console.log('Sticker processing time', performance.now() - start, totalFrames, (performance.now() - start) / totalFrames);
    });
}

/**
 * Window messages (tasks)
 */
ctx.addEventListener('message', async (event: MessageEvent) => {
  const message = event.data as CanvasWorkerRequest;

  if (message.type === 'cache_sticker') {
    const { id, src, width } = message;
    cacheSticker({ id, src, width });
  }
});
