
/* eslint-disable import/no-webpack-loader-syntax */
import Worker from 'worker-loader!./lottie.worker';
import loadLottie from 'lazy-modules/lottie';
import { canvas } from 'core/html';
import { Animation, DEFAULT_FRAME_SIZE, loadAnimation, play, pause, destroy, handleFrame } from './lottie';

type AnimationProps = {
  paused?: boolean,
  loop?: boolean,
  offscreen?: boolean,
  onLoad?: () => void,
};

/**
 * Worker for offscreen canvas rendering
 */
let isRendering = false;
let count = 0;
let worker: Worker;
function getWorker() {
  if (worker) return worker;

  worker = new Worker();
  worker.addEventListener('message', () => {});

  return worker;
}

function createElement() {
  return canvas`.tgs__canvas`();
}

export class TGSManager {
  id: string;
  src: string;
  state: AnimationProps;
  element: HTMLCanvasElement;
  animation?: Animation;
  transfered?: boolean;
  destroyed?: boolean;

  constructor(src: string, props: AnimationProps) {
    this.id = (count++).toString();
    this.src = src;
    this.state = props;
    this.element = createElement();

    this.element.width = DEFAULT_FRAME_SIZE * window.devicePixelRatio;
    this.element.height = DEFAULT_FRAME_SIZE * window.devicePixelRatio;
  }

  load() {
    // pass control to worker thread
    // if (typeof this.element.transferControlToOffscreen === 'function' && this.state.offscreen) {
    //   const context = this.element.transferControlToOffscreen();

    //   getWorker().postMessage({
    //     id: this.id,
    //     type: 'init',
    //     canvas: context,
    //     src: this.src,
    //     props: {
    //       loop: this.state.loop,
    //       paused: this.state.paused,
    //     },
    //   }, [context]);

    //   this.transfered = true;

    // // pass control to main thread
    // } else {
    //   const context = this.element.getContext('2d');
    //   if (!context) return;

    //   loadLottie()
    //     .then((player) => loadAnimation(player, context, this.id, this.src));

    //   if (!isRendering) {
    //     isRendering = true;
    //     handleFrame();
    //   }
    // }
  }

  play() {
    // pass control to worker thread
    if (typeof this.element.transferControlToOffscreen === 'function' && this.state.offscreen) {
      if (!this.transfered) this.load();

      getWorker().postMessage({
        id: this.id,
        type: 'play',
      });

    // load animation inside main thread
    } else if (!this.animation) {
      this.load();
      play(this.id);

    // play animation inside main thread
    } else {
      play(this.id);
    }
  }

  pause() {
    // pass control to worker thread
    if (typeof this.element.transferControlToOffscreen === 'function' && this.state.offscreen) {
      if (!this.transfered) this.load();

      getWorker().postMessage({
        id: this.id,
        type: 'pause',
      });

    // pause animation inside main thread
    } else if (this.animation) {
      pause(this.id);
    }
  }

  destroy() {
    this.destroyed = true;

    // pass control to worker thread
    if (typeof this.element.transferControlToOffscreen === 'function' && this.state.offscreen) {
      if (!this.transfered) this.load();

      getWorker().postMessage({
        id: this.id,
        type: 'destroy',
      });

    // destroy animation inside main thread
    } else if (this.animation) {
      destroy(this.id);
    }
  }

  goTo(_value: number, _animate: boolean = false) {}
}
