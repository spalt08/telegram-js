/* eslint-disable no-param-reassign */
import { BehaviorSubject } from 'rxjs';
import { decompress } from 'client/workers/extensions/compression';
import { getCanvasWorker, listenMessage } from 'client/context';

let _cache: Promise<Cache>;
async function getCache(): Promise<Cache> {
  if (!_cache) _cache = caches.open('animation');
  return _cache;
}

type Animation = {
  id: string,
  context: CanvasRenderingContext2D,
  totalFrames: number,
  frameRate: number,
  currentFrame: number,
  loaded: boolean,
  frames?: ArrayBuffer[],
};

let counter = 0;
const animations = new Map<string, Animation>();
const readySubject = new Map<string, BehaviorSubject<boolean>>();

function cacheSticker(id: string, src: string) {
  let subject = readySubject.get(id);
  if (subject) return subject;

  readySubject.set(id, subject = new BehaviorSubject(false));

  if ('OffscreenCanvas' in window) {
    getCanvasWorker().postMessage({ type: 'cache_sticker', id, src, pixelRatio: window.devicePixelRatio });
  }

  return subject;
}

listenMessage('sticker_cached', ({ src }) => {
  const subject = readySubject.get(src);
  if (subject) {
    subject.next(true);
    subject.complete();
  }
});

export function loadStickerFrames(animation: Animation) {
  if (animation.loaded) return;

  // getCache()
  //   .then((cache) => cache.matchAll(`/frames/${animation.id}/`))
  //   .then((response) => {

  //     console.log('frames', `/frames/${animation.id}/`, response);
  //     response.forEach((frame, index) => frame.arrayBuffer().then((raw) => animation.frames![index] = raw));
  //     animation.loaded = true;
  //   });

  getCache()
    .then((cache) => {
      for (let i = 0; i < animation.totalFrames; i++) {
        cache.match(`/frames/${animation.id}/${i}`)
          .then((response) => response && response.arrayBuffer())
          .then((raw) => animation.frames![i] = raw as ArrayBuffer);
      }
      animation.loaded = true;
    });
}

export function loadSticker(id: string, src: string, context: CanvasRenderingContext2D): string {
  const aid = (counter++).toString();
  const animation: Animation = {
    id,
    context,
    totalFrames: 0,
    frameRate: 0,
    loaded: false,
    currentFrame: 0,
  };

  animations.set(aid, animation);

  getCache()
    .then((cache) => cache.match(`/frames/${id}/0`))
    .then((firstFrame) => {
      if (!firstFrame) cacheSticker(id, src).subscribe(() => loadStickerFrames(animation));
      else {
        firstFrame.arrayBuffer().then((raw) => {
          const { rgba, header } = decompress(raw);
          context.putImageData(new ImageData(rgba, header.width, header.width), 0, 0);

          animation.totalFrames = header.totalFrames;
          animation.frameRate = header.frameRate;
          animation.frames = new Array(header.totalFrames);

          loadStickerFrames(animation);
        });
      }
    });

  return aid;
}

export function handleStickerRendering() {
  animations.forEach((animation) => {
    if (animation.loaded && animation.frames) {
      animation.currentFrame++;
      if (animation.currentFrame >= animation.totalFrames) animation.currentFrame = 0;

      if (animation.frames[animation.currentFrame]) {
        const frame = decompress(animation.frames[animation.currentFrame]);
        animation.context.putImageData(new ImageData(frame.rgba, frame.header.width, frame.header.width), 0, 0);

        if (!animation.totalFrames) animation.totalFrames = frame.header.totalFrames;
        if (!animation.frameRate) animation.totalFrames = frame.header.frameRate;
      }
    }
  });

  requestAnimationFrame(handleStickerRendering);
}
