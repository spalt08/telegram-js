/* eslint-disable no-param-reassign */
import { Document } from 'mtproto-js';
import { getCanvasWorker } from 'client/context';
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import { getDocumentLocation } from 'helpers/files';
import { file } from 'client/media';
import { Header } from 'client/workers/extensions/compression';
import loadLottie, { LottiePlayer, AnimationItem } from 'lazy-modules/lottie';
import { watchVisibility } from 'core/dom';
import { TaskQueue } from 'client/workers/extensions/quene';
import { useOnUnmount, useOnMount } from 'core/hooks';
import { getSize, getPhotoLocation } from 'helpers/photo';

type CacheRendererDescription = {
  id: string,
  sid: string,
  src: string,
  thumb?: string,
  currentFrame: number,
  currentFrameRaw: number,
  frameMult?: number,
  totalFrames: number,
  width: number,
  lastLoadedFrame?: number,
  header?: Omit<Header, 'version'>,
  contexts: CanvasRenderingContext2D[],
  isCaching?: boolean,
  isLoaded?: boolean,
};

export const cacheRenderers = new Map<string, CacheRendererDescription>();
export const cacheFrames = new Map<string, ImageData[]>();

let onCanvasWorkerResponse: (message: CanvasWorkerResponse) => void;

function addCachedFrame(id: string, frame: number, data: ImageData, header: Omit<Header, 'version'>): CacheRendererDescription | undefined {
  const sid = `${id}_${header.width}`;
  const renderer = cacheRenderers.get(sid);

  if (!renderer) return undefined;

  if (!renderer.header) {
    renderer.header = header;
    renderer.frameMult = header.frameRate / 1000;
    renderer.totalFrames = header.totalFrames;
  }

  let frames = cacheFrames.get(sid);
  if (!frames) cacheFrames.set(sid, frames = new Array(header.totalFrames));
  frames[frame] = data;

  renderer.lastLoadedFrame = frame;

  if (frame === frames.length - 1) {
    renderer.isLoaded = true;
  }

  if (frame === renderer.currentFrame) {
    for (let i = 0; i < renderer.contexts.length; i++) renderer.contexts[i].putImageData(data, 0, 0);
  }

  if (frame === 0) {
    if (renderer.thumb) {
      const parents = renderer.contexts.map((context) => context.canvas.parentElement);
      parents.forEach((element) => element && (element.style.backgroundImage = ''));
    }
  }

  return renderer;
}

function cacheStickerLoop(context: CanvasRenderingContext2D, animation: AnimationItem, id: string, frame: number, header: Omit<Header, 'version'>,
  complete: () => void) {
  const imageData = context.getImageData(0, 0, header.width, header.width);

  addCachedFrame(id, frame, imageData, header);

  // cache only small stickers
  if (header.width < 200) {
    getCanvasWorker(onCanvasWorkerResponse)
      .postMessage({ type: 'set_cached_frame', id, frame, data: imageData.data, header } as CanvasWorkerRequest);
  }

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

const cacheQuene = new TaskQueue<CacheRendererDescription>({
  process: ({ id, src, width }, complete) => {
    // worker thread caching
    if ('OffscreenCanvas' in window) {
      getCanvasWorker(onCanvasWorkerResponse)
        .postMessage({ type: 'cache_sticker', id, src, width } as CanvasWorkerRequest);

    // main thread caching
    } else {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = width;
      canvas.height = width;

      Promise.all([
        loadLottie(),
        fetch(src).then((response) => response.json()),
      ]).then(([player, animationData]: [LottiePlayer, any]) => {
        if (!context) return;

        const animaton = player.loadAnimation({
          animationData,
          autoplay: false,
          loop: false,
          renderer: 'canvas',
          rendererSettings: {
            context,
          },
        } as any);

        (animaton as any).wrapper = {}; // lottie destory error fix

        cacheStickerLoop(context, animaton, id, 0, {
          frameRate: animaton.frameRate * animaton.playSpeed,
          totalFrames: animaton.totalFrames,
          width,
        }, complete);
      });
    }
  },
});

const loadQuene = new TaskQueue<CacheRendererDescription>({
  process: ({ id, lastLoadedFrame, totalFrames, isLoaded, isCaching, width }, complete) => {
    if (isCaching || isLoaded) {
      complete();
      return;
    }

    const worker = getCanvasWorker(onCanvasWorkerResponse);
    for (let i = lastLoadedFrame !== undefined ? lastLoadedFrame + 1 : 0; i < totalFrames; i++) {
      worker.postMessage({ type: 'get_cached_frame', id, frame: i, width } as CanvasWorkerRequest);
    }
  },
});

onCanvasWorkerResponse = (message: CanvasWorkerResponse) => {
  switch (message.type) {
    case 'cache_complete': {
      cacheQuene.complete();
      break;
    }

    case 'cached_frame_missing': {
      const sid = `${message.id}_${message.width}`;
      const renderer = cacheRenderers.get(sid);

      if (renderer && !renderer.isCaching) {
        renderer.isCaching = true;
        cacheQuene.register(renderer);
      }

      if (renderer && renderer.thumb) {
        const parents = renderer.contexts.map((context) => context.canvas.parentElement);
        parents.forEach((element) => element && (element.style.backgroundImage = `url(${renderer.thumb})`));
      }
      break;
    }

    case 'cached_frame': {
      const { id, frame, data, header } = message;
      const imageData = new ImageData(data, header.width, header.width);
      const renderer = addCachedFrame(id, frame, imageData, header);

      if (!renderer) {
        loadQuene.complete();
        return;
      }

      if (!renderer.isCaching && frame === 0) {
        loadQuene.register(renderer);
        // const worker = getCanvasWorker(onCanvasWorkerResponse);
        // for (let i = renderer.lastLoadedFrame !== undefined ? renderer.lastLoadedFrame + 1 : 0; i < renderer.totalFrames; i++) {
        //   worker.postMessage({ type: 'get_cached_frame', id, frame: i, width: renderer.width } as CanvasWorkerRequest);
        // }
      }

      if (!renderer.isCaching && frame === header.totalFrames - 1) {
        loadQuene.complete();
      }
      break;
    }

    default:
  }
};

/**
 * Canvas Hook
 */
export function useCacheRenderer(element: HTMLCanvasElement, sticker: Document.document, width = 140) {
  const { id } = sticker;
  const src = file(getDocumentLocation(sticker, ''), { size: sticker.size, dc_id: sticker.dc_id, mime_type: sticker.mime_type });
  const context = element.getContext('2d');
  const sid = `${id}_${width}`;
  if (!context) return;

  let thumb: string | undefined;

  // prepare thumbnail
  if (sticker.thumbs && sticker.thumbs.length > 0) {
    const tsize = getSize(sticker.thumbs, width, width, 'contain');
    if (tsize) thumb = file(getPhotoLocation(sticker, tsize.type), { mime_type: 'image/webp' });
  }

  // watchVisibility(element, (isVisible) => {
  //   const renderer = cacheRenderers.get(sid);

  //   if (!renderer) return;

  //   if (isVisible) {
  //     renderer.currentFrame = 0;
  //     renderer.currentFrameRaw = 0;
  //   } else {
  //   }
  // });

  useOnMount(element, () => {
    let renderer = cacheRenderers.get(sid);
    if (!renderer) {
      cacheRenderers.set(sid, renderer = { id, sid, src, thumb, currentFrame: 0, currentFrameRaw: 0, contexts: [], totalFrames: 0, width });
    }
    renderer.contexts.push(context);

    getCanvasWorker(onCanvasWorkerResponse)
      .postMessage({ type: 'get_cached_frame', id, width: element.width, frame: 0 } as CanvasWorkerRequest);
  });

  useOnUnmount(element, () => {
    const renderer = cacheRenderers.get(sid);

    if (renderer && renderer.isCaching) cacheQuene.filter((item) => item.id !== id);
    if (renderer && !renderer.isLoaded) loadQuene.filter((item) => item.id !== id);

    if (!renderer || renderer.contexts.length === 1) {
      cacheRenderers.delete(sid);
      cacheFrames.delete(sid);
    } else {
      const contextIndex = renderer.contexts.indexOf(context);
      if (contextIndex > -1) renderer.contexts = renderer.contexts.slice(0, contextIndex).concat(renderer.contexts.slice(contextIndex + 1));
    }
  });
}

/**
 * Rendering handler
 */
let prevTime = 0;
let nowTime = 0;
function renderStickerFrame(renderer: CacheRendererDescription) {
  if (renderer.lastLoadedFrame === 0 || !renderer.frameMult || renderer.contexts.length === 0) return;
  if (renderer.lastLoadedFrame === renderer.currentFrame && renderer.currentFrame < renderer.totalFrames - 1) return;

  renderer.currentFrameRaw += (nowTime - prevTime) * renderer.frameMult;
  const nextFrame = Math.floor(renderer.currentFrameRaw) % renderer.totalFrames;

  const frames = cacheFrames.get(renderer.sid);
  if (!frames || !frames[nextFrame]) return;

  renderer.currentFrame = nextFrame;
  for (let i = 0; i < renderer.contexts.length; i++) {
    renderer.contexts[i].putImageData(frames[nextFrame], 0, 0);
  }
}

export function handleStickerRendering(time: number) {
  if (!prevTime) prevTime = time;
  nowTime = time;

  cacheRenderers.forEach(renderStickerFrame);

  prevTime = nowTime;

  requestAnimationFrame(handleStickerRendering);
}

/**
 * Non-cached rendering
 */
export function useLottieRenderer(element: HTMLCanvasElement, sticker: Document.document, autoplay = true, loop = true) {
  const src = file(getDocumentLocation(sticker, ''), { size: sticker.size, dc_id: sticker.dc_id });
  const context = element.getContext('2d');
  if (!context) return;

  let animation: AnimationItem & { wrapper?: any } | undefined;
  let playing = autoplay;

  useOnMount(element, () => {
    Promise.all([
      loadLottie(),
      fetch(src).then((response) => response.json()),
    ]).then(([player, animationData]: [LottiePlayer, any]) => {
      if (!context) return;

      animation = player.loadAnimation({
        animationData,
        autoplay: playing,
        loop,
        renderer: 'canvas',
        rendererSettings: {
          context,
        },
      } as any);

      animation.wrapper = {};
    });
  });

  watchVisibility(element, (isVisible) => {
    playing = autoplay && isVisible;

    if (!animation) return;
    if (playing) animation.play();
    else animation.pause();
  });

  useOnUnmount(element, () => {
    if (!animation) return;
    animation.destroy();
  });
}
