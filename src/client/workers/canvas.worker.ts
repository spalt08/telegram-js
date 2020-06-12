/* eslint-disable import/named, no-restricted-globals */
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import { STICKER_CACHE_NAME } from 'const';
import CanvasKitInit, { CanvasKit, SkAnimation, SkCanvas } from 'vendor/canvas-kit/canvaskit';
import { compress, decompress, Header } from './extensions/compression';
import Lottie, { AnimationItem } from 'vendor/lottie-5.6.10';

type StickerCacheTask = { id: string, src: string, width: number };
const ctx = self as DedicatedWorkerGlobalScope;
const cachePromise = caches.open(STICKER_CACHE_NAME);

let canvasKit: CanvasKit;
let fireInited: () => void;
const inited = new Promise((r) => {
  fireInited = r;
});

CanvasKitInit().then((kit) => {
  canvasKit = kit;
  fireInited();
});

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

const canvases = new Map<number, SkCanvas>();
function getCanvas(width: number) {
  let canvas = canvases.get(width);
  if (!canvas) {
    const surface = canvasKit.MakeSurface(width, width);
    canvas = surface.getCanvas();
  }
  return canvas;
}

/**
 * Render and manage each sticker frame via setTimeout
 */
function cacheStickerLoop(id: string, header: Header, animation: SkAnimation) {
  const { width, totalFrames } = header;
  const canvas = getCanvas(width);
  const start = performance.now();

  for (let i = 0; i < totalFrames; i++) {
    canvas.clear(0);
    animation.seekFrame(i);
    animation.render(canvas, { fLeft: 0, fTop: 0, fRight: width, fBottom: width });

    const pixels = canvas.readPixels(0, 0, width, width);

    const imageData = new Uint8ClampedArray(pixels.buffer);
    ctx.postMessage({
      type: 'cached_frame',
      id,
      frame: i,
      data: imageData,
      header,
    } as CanvasWorkerResponse);

    // if (header.width < 200) {
    //   saveFrame(id, i, imageData, header);
    // }
  }
  console.log('Sticker processing time', performance.now() - start, header.totalFrames, 'fps', (performance.now() - start) / totalFrames);
  ctx.postMessage({ type: 'cache_complete', id } as CanvasWorkerResponse);
}
/**
 * Render and manage each sticker frame via setTimeout
 */
function cacheStickerLoopLottie(id: string, header: Header, animation: AnimationItem, context: OffscreenCanvasRenderingContext2D) {
  const { width, totalFrames } = header;
  const start = performance.now();

  for (let i = 0; i < totalFrames; i++) {
    animation.renderer.renderFrame(i);
    // const imageData = context.getImageData(0, 0, width, width).data;
    const bitmap = context.canvas.transferToImageBitmap();
    // ctx.postMessage({
    //   type: 'cached_frame',
    //   id,
    //   frame: i,
    //   data: imageData,
    //   header,
    // } as CanvasWorkerResponse);

    // if (header.width < 200) {
    //   saveFrame(id, i, imageData, header);
    // }
  }
  console.log('Sticker processing time', performance.now() - start, header.totalFrames, 'fps', (performance.now() - start) / totalFrames);
  ctx.postMessage({ type: 'cache_complete', id } as CanvasWorkerResponse);
}

const jobs: (() => void)[] = [];

async function processJobLoop() {
  const job = jobs.pop();
  if (job) {
    job();
  }
  if (jobs.length > 0) {
    processJobLoop();
  }
}

function queueJob(job: () => void) {
  jobs.push(job);
  if (jobs.length === 1) {
    processJobLoop();
  }
}

/**
 * Cache sticker task entry point
 */
function cacheSticker({ id, src, width }: StickerCacheTask) {
  inited.then(() => {
    fetch(src)
      .then((response) => response.json())
      .then((animationData) => {
        // const animation = canvasKit.MakeManagedAnimation(animationData);
        // const frameCount = animation.fps() * animation.duration();

        // const header = {
        //   version: 1,
        //   totalFrames: Math.round(frameCount),
        //   frameRate: animation.fps(),
        //   width,
        // };

        // cacheStickerLoop(id, header, animation);
        // animation.delete();

        const start = performance.now();
        let canvas = new OffscreenCanvas(width, width);
        let context = canvas.getContext('2d')!;
        let animation = Lottie.loadAnimation({
          animationData,
          autoplay: false,
          loop: false,
          renderer: 'canvas',
          rendererSettings: {
            context,
          },
        });
        const header = {
          version: 1,
          totalFrames: animation.totalFrames,
          frameRate: animation.frameRate * animation.playSpeed,
          width,
        };

        console.log('Sticker loading time', performance.now() - start, header.totalFrames, 'fps', (performance.now() - start) / header.totalFrames);
        cacheStickerLoopLottie(id, header, animation, context);

        animation.destroy();
        canvas = undefined;
        context = undefined;
        animation = undefined;
      });
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

      if (width > 200) {
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
