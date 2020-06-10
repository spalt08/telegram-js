/* eslint-disable import/named, no-restricted-globals */
import Lottie, { AnimationItem } from 'vendor/lottie-5.6.10';
import { STICKER_CACHE_NAME } from 'const';
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import { TaskQueue } from './extensions/quene';
import { compress, decompress, Header } from './extensions/compression';

type StickerCacheTask = { id: string, src: string, width: number, priority?: number };

const ctx = self as DedicatedWorkerGlobalScope;
const cachePromise = caches.open(STICKER_CACHE_NAME);

/**
 * Compress RGBA pixels and save to persistent cache
 */
function saveFrame(id: string, frame: number, data: Uint8ClampedArray, header: Header) {
  return cachePromise.then((cache) => {
    cache.put(
      `/frames/${id}/${frame}`,
      new Response(
        compress(data, header),
        { headers: { 'Content-Type': 'image/x-rgba' } },
      ),
    );
  });
}

/**
 * Restore RGBA pixels from persistent cache
 */
function loadFrame(id: string, frame: number) {
  return cachePromise
    .then((cache) => cache.match(`/frames/${id}/${frame}`))
    .then((response) => response && response.arrayBuffer())
    .then((raw) => raw && decompress(raw));
}

/**
 * Render and manage each sticker frame vie setTimeout
 */
function cacheStickerLoop(context: OffscreenCanvasRenderingContext2D, animation: AnimationItem, id: string, frame: number, header: Header,
  complete: () => void) {
  const imageData = context.getImageData(0, 0, header.width, header.width);

  ctx.postMessage({
    type: 'cached_frame',
    id,
    frame,
    data: imageData.data,
    header,
  } as CanvasWorkerResponse);

  saveFrame(id, frame, imageData.data, header);

  if (frame < header.totalFrames - 1) {
    setTimeout(() => {
      animation.renderer.renderFrame(frame + 1);
      cacheStickerLoop(context, animation, id, frame + 1, header, complete);
    });
  } else {
    animation.destroy();
    complete();
  }
}

/**
 * Cache sticker task entry point
 */
function cacheSticker({ id, src, width }: StickerCacheTask, complete: () => void) {
  const canvas = new OffscreenCanvas(width, width); // eslint-disable-line compat/compat
  const context = canvas.getContext('2d');

  if (!context) {
    complete();
    return;
  }

  try {
    fetch(src)
      .then((response) => response.json())
      .then((animationData) => {
        const animation = Lottie.loadAnimation({
          renderer: 'canvas',
          loop: false,
          autoplay: false,
          animationData,
          rendererSettings: {
            context,
            clearCanvas: true,
          },
        });

        const header = {
          version: 1,
          totalFrames: animation.totalFrames,
          frameRate: animation.frameRate,
          width,
        };

        cacheStickerLoop(context, animation, id, 0, header, complete);
      });
  } catch (e) {
    complete();
  }
}

/**
 * Cache sticker task quene
 */
const renderQueue = new TaskQueue<StickerCacheTask>({
  compare: (left, right) => (left.priority || 0) - (right.priority || 0),
  process: cacheSticker,
});


/**
 * Window messages (tasks)
 */
ctx.addEventListener('message', async (event: MessageEvent) => {
  const message = event.data as CanvasWorkerRequest;

  switch (message.type) {
    case 'cache_sticker': {
      const { id, src, priority, width } = message;
      renderQueue.register({ id, src, priority, width });
      break;
    }

    case 'set_cached_frame': {
      const { id, frame, data, header } = message;
      saveFrame(id, frame, data, { ...header, version: 1 });
      break;
    }

    case 'get_cached_frame': {
      const { id, frame } = message;
      const frameData = await loadFrame(id, frame);

      if (frameData) {
        ctx.postMessage({
          type: 'cached_frame',
          id,
          frame,
          data: frameData.rgba,
          header: frameData.header,
        } as CanvasWorkerResponse);
      } else {
        ctx.postMessage({
          type: 'cached_frame_missing',
          id,
          frame,
        } as CanvasWorkerResponse);
      }

      break;
    }

    default:
  }
});
