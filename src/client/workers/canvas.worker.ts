/* eslint-disable import/named, no-restricted-globals */
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import { STICKER_CACHE_NAME } from 'const';
import CanvasKitInit, { CanvasKit, SkAnimation } from 'vendor/canvas-kit/canvaskit';
import { compress, decompress, Header } from './extensions/compression';

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

/**
 * Render and manage each sticker frame via setTimeout
 */
function cacheStickerLoop(id: string, header: Header, animation: SkAnimation) {
  const surface = canvasKit.MakeSurface(header.width, header.width);
  const canvas = surface.getCanvas();
  const start = performance.now();
  for (let i = 1; i < header.totalFrames; i++) {
    canvas.clear(0);
    animation.seekFrame(i);
    animation.render(canvas, { fLeft: 0, fTop: 0, fRight: header.width, fBottom: header.width });
    canvas.flush();
    const pixels = canvas.readPixels(0, 0, header.width, header.width);
    const imageData = new Uint8ClampedArray(pixels.buffer);
    ctx.postMessage({
      type: 'cached_frame',
      id,
      frame: i,
      data: imageData,
      header,
    } as CanvasWorkerResponse);

    if (header.width < 200) {
      saveFrame(id, i, imageData, header);
    }
  }
  surface.delete();
  console.log('Sticker processing time', performance.now() - start, header.totalFrames);
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
      .then((response) => response.text())
      .then((animationData) => {
        queueJob(() => {
          const animation = canvasKit.MakeManagedAnimation(animationData);
          const frameCount = animation.fps() * animation.duration();

          const header = {
            version: 1,
            totalFrames: Math.round(frameCount),
            frameRate: animation.fps(),
            width,
          };

          cacheStickerLoop(id, header, animation);
          animation.delete();
        });
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
