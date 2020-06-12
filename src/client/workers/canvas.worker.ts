/* eslint-disable import/named, no-restricted-globals */
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import { STICKER_CACHE_NAME } from 'const';
import CanvasKitInit, { CanvasKit, SkAnimation, SkCanvas } from 'vendor/canvas-kit/canvaskit';
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

const canvases = new Map<number, {
  canvasGl: OffscreenCanvas,
  sc: SkCanvas }>();

/**
 * Render and manage each sticker frame via setTimeout
 */
function cacheStickerLoop(id: string, header: Header, animation: SkAnimation) {
  let cc = canvases.get(header.width);
  if (!cc) {
    // eslint-disable-next-line compat/compat
    const canvasGl = new OffscreenCanvas(header.width, header.width) as any;
    canvasGl.tagName = 'CANVAS';
    const surface = canvasKit.MakeCanvasSurface(canvasGl);
    const canvas = surface.getCanvas();
    cc = { canvasGl, sc: canvas };
    canvases.set(header.width, cc);
  }
  const cv = cc.sc;
  const start = performance.now();
  for (let i = 0; i < header.totalFrames; i++) {
    cv.clear(0);
    animation.seekFrame(i);
    animation.render(cv, { fLeft: 0, fTop: 0, fRight: header.width, fBottom: header.width });
    cv.flush();
    // ctx.postMessage({
    //   type: 'cached_frame',
    //   id,
    //   frame: i,
    //   data: cc.canvasGl.transferToImageBitmap(),
    //   header,
    // } as CanvasWorkerResponse);

    // if (header.width < 200) {
    //   saveFrame(id, i, imageData.data, header);
    // }
  }
  const time = performance.now() - start;
  console.log('Sticker processing time', time, header.totalFrames, 'fps', time / header.totalFrames);
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
