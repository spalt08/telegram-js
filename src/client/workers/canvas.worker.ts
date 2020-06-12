/* eslint-disable import/named, no-restricted-globals */
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import { STICKER_CACHE_NAME } from 'const';
import Module, { lengthBytesUTF8, stringToUTF8 } from 'vendor/rlottie/rlottie-wasm';
import { compress, decompress, Header } from './extensions/compression';

type StickerCacheTask = { id: string, src: string, width: number };

const ctx = self as DedicatedWorkerGlobalScope;
const cachePromise = caches.open(STICKER_CACHE_NAME);
const obj: Record<string, any> = {};

let fireInit: () => void;
const inited = new Promise((r) => {
  fireInit = r;
});

Module.onRuntimeInitialized = () => {
  obj.Api = {
    init: Module.cwrap('lottie_init', '', []),
    destroy: Module.cwrap('lottie_destroy', '', ['number']),
    resize: Module.cwrap('lottie_resize', '', ['number', 'number', 'number']),
    buffer: Module.cwrap('lottie_buffer', 'number', ['number']),
    frameCount: Module.cwrap('lottie_frame_count', 'number', ['number']),
    render: Module.cwrap('lottie_render', '', ['number', 'number']),
    loadFromData: Module.cwrap('lottie_load_from_data', 'number', ['number', 'number']),
    malloc: Module.cwrap('malloc', 'number', ['number']),
    free: Module.cwrap('free', 'number', ['number']),
  };
  obj.lottieHandle = obj.Api.init();
  fireInit();
};

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
function cacheStickerLoop(id: string, header: Header) {
  const start = performance.now();
  obj.Api.resize(obj.lottieHandle, header.width, header.width);
  for (let i = 0; i < header.totalFrames; i++) {
    obj.Api.render(obj.lottieHandle, i);
    const bufferPointer = obj.Api.buffer(obj.lottieHandle);
    const imageData = new Uint8ClampedArray(Module.HEAP8.buffer, bufferPointer, header.width * header.width * 4);

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
  console.error('Done', performance.now() - start, header.totalFrames);
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
          const lengthBytes = lengthBytesUTF8(animationData) + 1;
          const stringOnWasmHeap = obj.Api.malloc(lengthBytes);
          stringToUTF8(animationData, stringOnWasmHeap, lengthBytes + 1);

          obj.Api.loadFromData(obj.lottieHandle, stringOnWasmHeap);
          const frameCount = obj.Api.frameCount(obj.lottieHandle);

          const header = {
            version: 1,
            totalFrames: frameCount,
            frameRate: 60,
            width,
          };

          cacheStickerLoop(id, header);
          obj.Api.free(stringOnWasmHeap);
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
