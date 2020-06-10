/* eslint-disable no-param-reassign */
import { Document } from 'mtproto-js';
import { getCanvasWorker } from 'client/context';
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import { useOnMount, useOnUnmount } from 'core/hooks';
import { getDocumentLocation } from 'helpers/files';
import { file } from 'client/media';
import { Header } from 'client/workers/extensions/compression';

type CacheRendererDescription = {
  id: string,
  src: string,
  currentFrame: number,
  currentFrameRaw: number,
  header?: Omit<Header, 'version'>,
  contexts: CanvasRenderingContext2D[],
  isCaching?: boolean,
};

const cacheRenderers = new Map<string, CacheRendererDescription>();
const cacheFrames = new Map<string, Uint8ClampedArray[]>();

let cacheSticker: (id: string, src: string) => void;
function onCanvasWorkerResponse(message: CanvasWorkerResponse) {
  switch (message.type) {
    case 'cached_frame_missing': {
      const renderer = cacheRenderers.get(message.id);

      if (renderer && !renderer.isCaching) {
        renderer.isCaching = true;
        cacheSticker(renderer.id, renderer.src);
      }
      break;
    }

    case 'cached_frame': {
      const { id, frame, data, header } = message;

      let frames = cacheFrames.get(id);
      if (!frames) cacheFrames.set(id, frames = new Array(header.totalFrames));

      frames[frame] = data;
      const renderer = cacheRenderers.get(id);
      if (renderer && !renderer.header) {
        renderer.header = header;
      }

      if (renderer && !renderer.isCaching && frame < frames.length - 1 && !frames[frame + 1]) {
        // load next frame
        getCanvasWorker(onCanvasWorkerResponse)
          .postMessage({ type: 'get_cached_frame', id, frame: frame + 1, width: header.width } as CanvasWorkerRequest);
      }
      break;
    }

    default:
  }
}

cacheSticker = (id: string, src: string) => {
  if ('OffscreenCanvas' in window) {
    getCanvasWorker(onCanvasWorkerResponse)
      .postMessage({ type: 'cache_sticker', id, src, width: 140 } as CanvasWorkerRequest);
  }
};

export function useCacheRenderer(element: HTMLCanvasElement, sticker: Document.document) {
  const { id } = sticker;
  const src = file(getDocumentLocation(sticker, ''), { size: sticker.size, dc_id: sticker.dc_id });
  const context = element.getContext('2d');
  if (!context) return;

  useOnMount(element, () => {
    let renderer = cacheRenderers.get(id);
    if (!renderer) {
      cacheRenderers.set(id, renderer = { id, src, currentFrame: 0, currentFrameRaw: 0, contexts: [] });
      getCanvasWorker(onCanvasWorkerResponse)
        .postMessage({ type: 'get_cached_frame', id, width: element.width, frame: 0 } as CanvasWorkerRequest);
    }

    renderer.contexts.push(context);
  });

  useOnUnmount(element, () => {
    const renderer = cacheRenderers.get(id);
    if (!renderer || renderer.contexts.length === 1) {
      cacheRenderers.delete(id);
      cacheFrames.delete(id);
    } else {
      const contextIndex = renderer.contexts.indexOf(context);
      if (contextIndex > -1) renderer.contexts = renderer.contexts.slice(0, contextIndex).concat(renderer.contexts.slice(contextIndex + 1));
    }
  });
}


export function handleStickerRendering() {
  cacheRenderers.forEach((renderer) => {
    if (!renderer.header || renderer.contexts.length === 0) return;

    renderer.currentFrameRaw += (renderer.header.frameRate / 60);
    const nextFrame = Math.floor(renderer.currentFrameRaw) % renderer.header.totalFrames;

    const frames = cacheFrames.get(renderer.id);
    if (!frames || !frames[nextFrame]) return;

    renderer.currentFrame = nextFrame;
    for (let i = 0; i < renderer.contexts.length; i++) {
      renderer.contexts[i].putImageData(new ImageData(frames[nextFrame], renderer.header.width, renderer.header.width), 0, 0);
    }
  });

  requestAnimationFrame(handleStickerRendering);
}
