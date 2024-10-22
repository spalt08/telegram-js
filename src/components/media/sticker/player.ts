/* eslint-disable no-param-reassign */
import { getCanvasKitWorker } from 'client/context';
import { file } from 'client/media';
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import { TaskQueue } from 'client/workers/extensions/queue';
import { useOnMount, useOnUnmount } from 'core/hooks';
import { getDocumentLocation } from 'helpers/files';
import { getPhotoLocation, getSize } from 'helpers/photo';
import { Document } from 'mtproto-js';
import { watchVisibility } from 'core/dom';

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
  contexts: CanvasRenderingContext2D[],
  isCaching?: boolean,
};

export const cacheRenderers = new Map<string, CacheRendererDescription>();
export const cacheFrameData = new Map<string, ImageData[]>();
export const cacheFrameBitmap = new Map<string, HTMLCanvasElement[]>();

let onCanvasWorkerResponse: (message: CanvasWorkerResponse) => void;


const cacheQuene = new TaskQueue<CacheRendererDescription>({
  process: (renderer) => {
    renderer.isCaching = true;
    // worker thread caching
    getCanvasKitWorker(onCanvasWorkerResponse)
      .postMessage({ type: 'cache_sticker', id: renderer.id, src: renderer.src, width: renderer.width } as CanvasWorkerRequest);
  },
});

function setImageData(context: CanvasRenderingContext2D, data: ImageData) {
  context.putImageData(data, 0, 0);
}

onCanvasWorkerResponse = (message: CanvasWorkerResponse) => {
  switch (message.type) {
    case 'cache_complete': {
      cacheQuene.complete();
      break;
    }

    case 'cached_frame': {
      const { id, frame, data, header } = message;
      const { width } = header;
      const sid = `${id}_${header.width}`;
      const renderer = cacheRenderers.get(sid);

      if (!renderer) {
        cacheQuene.complete();
        return;
      }

      if (!renderer.frameMult || !renderer.totalFrames) {
        renderer.frameMult = header.frameRate / 1000;
        renderer.totalFrames = header.totalFrames;
      }

      if (frame === 0) {
        if (renderer.thumb) {
          const parents = renderer.contexts.map((context) => context.canvas.parentElement);
          parents.forEach((element) => element && (element.style.backgroundImage = ''));
        }
      }

      const imageData = new ImageData(data, width, width);

      let frames = cacheFrameData.get(sid);
      if (!frames) cacheFrameData.set(sid, frames = new Array(header.totalFrames));
      frames[frame] = imageData;

      if (frame === renderer.currentFrame) {
        for (let i = 0; i < renderer.contexts.length; i++) setImageData(renderer.contexts[i], imageData);
      }

      if (frame === renderer.totalFrames - 1) renderer.isCaching = false;

      renderer.lastLoadedFrame = frame;

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

  // prepare thumbnail
  let thumb: string | undefined;
  if (sticker.thumbs && sticker.thumbs.length > 0) {
    const tsize = getSize(sticker.thumbs, width, width, 'contain');
    if (tsize) {
      thumb = file(getPhotoLocation(sticker, tsize.type), { mime_type: 'image/webp' });
      if (element.parentElement) element.parentElement.style.backgroundImage = `url(${thumb})`;
    }
  }

  watchVisibility(element, (isVisible) => {
    const renderer = cacheRenderers.get(sid);

    if (!renderer) return;

    if (isVisible) {
      if (!renderer.isCaching && !renderer.lastLoadedFrame) cacheQuene.register(renderer);
      renderer.currentFrame = 0;
      renderer.currentFrameRaw = 0;
    } else {
      cacheQuene.filter((item) => item.id !== id);
      // cacheFrameData.delete(sid);
      // renderer.lastLoadedFrame = undefined;
    }
  });

  useOnMount(element, () => {
    let renderer = cacheRenderers.get(sid);

    if (!renderer) {
      cacheRenderers.set(sid, renderer = { id, sid, src, thumb, currentFrame: 0, currentFrameRaw: 0, contexts: [], totalFrames: 0, width });
    }

    renderer.contexts.push(context);
  });

  useOnUnmount(element, () => {
    const renderer = cacheRenderers.get(sid);

    if (!renderer || renderer.contexts.length === 1) {
      cacheQuene.filter((item) => item.id !== id);
      cacheRenderers.delete(sid);
      cacheFrameData.delete(sid);
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

  const frames = cacheFrameData.get(renderer.sid);
  if (!frames || !frames[nextFrame]) return;

  renderer.currentFrame = nextFrame;
  for (let i = 0; i < renderer.contexts.length; i++) setImageData(renderer.contexts[i], frames[nextFrame]);
}

export function handleStickerRendering(time: number) {
  if (!prevTime) prevTime = time;

  nowTime = time;
  cacheRenderers.forEach(renderStickerFrame);
  prevTime = nowTime;

  requestAnimationFrame(handleStickerRendering);
}
