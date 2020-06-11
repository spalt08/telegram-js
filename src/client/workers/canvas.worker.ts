/* eslint-disable import/named, no-restricted-globals */
import Lottie, { AnimationItem } from 'vendor/lottie-5.6.10';
import { STICKER_CACHE_NAME } from 'const';
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import { compress, decompress, Header } from './extensions/compression';

type StickerCacheTask = { id: string, src: string, width: number };

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
function cacheStickerLoop(context: OffscreenCanvasRenderingContext2D, animation: AnimationItem, id: string, frame: number, header: Header) {
  const imageData = context.getImageData(0, 0, header.width, header.width);

  ctx.postMessage({
    type: 'cached_frame',
    id,
    frame,
    data: imageData.data,
    header,
  } as CanvasWorkerResponse);

  if (header.width < 200) {
    saveFrame(id, frame, imageData.data, header);
  }

  if (frame < header.totalFrames - 1) {
    setTimeout(() => {
      animation.renderer.renderFrame(frame + 1);
      cacheStickerLoop(context, animation, id, frame + 1, header);
    });
  } else {
    animation.destroy();
    ctx.postMessage({ type: 'cache_complete', id } as CanvasWorkerResponse);
  }
}

/**
 * Cache sticker task entry point
 */
function cacheSticker({ id, src, width }: StickerCacheTask) {
  const canvas = new OffscreenCanvas(width, width); // eslint-disable-line compat/compat
  const context = canvas.getContext('2d');

  if (!context) return;

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
        frameRate: animation.frameRate * animation.playSpeed,
        width,
      };

      cacheStickerLoop(context, animation, id, 0, header);
    });
}

function missingNotification(id: string, frame: number, width: number) {
  ctx.postMessage({
    type: 'cached_frame_missing',
    id,
    frame,
    width,
  } as CanvasWorkerResponse);
}
/**
 * Window messages (tasks)
 */
ctx.addEventListener('message', async (event: MessageEvent) => {
  const message = event.data as CanvasWorkerRequest;

  switch (message.type) {
    case 'cache_sticker': {
      const { id, src, width } = message;
      cacheSticker({ id, src, width });
      break;
    }

    case 'set_cached_frame': {
      const { id, frame, data, header } = message;
      if (header.width < 200) saveFrame(id, frame, data, { ...header, version: 1 });
      break;
    }

    case 'get_cached_frame': {
      const { id, frame, width } = message;

      if (width < 200) {
        missingNotification(id, frame, width);
        return;
      }

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
        missingNotification(id, frame, width);
      }

      break;
    }

    default:
  }
});
