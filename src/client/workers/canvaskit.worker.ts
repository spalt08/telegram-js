/* eslint-disable import/named, no-restricted-globals */
import { CanvasWorkerRequest, CanvasWorkerResponse } from 'client/types';
import CanvasKitInit, { CanvasKit, SkCanvas } from 'vendor/canvas-kit/canvaskit';

type StickerCacheTask = { id: string, src: string, width: number };
const ctx = self as DedicatedWorkerGlobalScope;

let canvasKit: CanvasKit;
let fireInited: () => void;
const inited = new Promise((r) => {
  fireInited = r;
});

CanvasKitInit().then((kit) => {
  canvasKit = kit;
  fireInited();
});

const canvases = new Map<number, SkCanvas>();

function getCanvasKitContext(width: number) {
  let canvas = canvases.get(width);
  if (!canvas) {
    const surface = canvasKit.MakeSurface(width, width);
    canvas = surface.getCanvas();
  }
  return canvas;
}

/**
 * Cache sticker task entry point
 */
function cacheSticker({ id, src, width }: StickerCacheTask) {
  inited.then(() => {
    fetch(src)
      .then((response) => response.text())
      .then((animationData) => {
        const animation = canvasKit.MakeManagedAnimation(animationData);
        const frameCount = animation.fps() * animation.duration();

        const header = {
          version: 1,
          totalFrames: Math.round(frameCount),
          frameRate: animation.fps(),
          width,
        };

        const start = performance.now();
        const context = getCanvasKitContext(width);

        for (let i = 0; i < header.totalFrames; i++) {
          context.clear(0);
          animation.seekFrame(i);
          animation.render(context, { fLeft: 0, fTop: 0, fRight: header.width, fBottom: header.width });

          const pixels = context.readPixels(0, 0, width, width);

          ctx.postMessage({
            type: 'cached_frame',
            id,
            frame: i,
            data: new Uint8ClampedArray(pixels.buffer),
            header,
          } as CanvasWorkerResponse);
        }

        const time = performance.now() - start;
        ctx.postMessage({ type: 'cache_complete', id } as CanvasWorkerResponse);

        animation.delete();
      });
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
