
/* eslint-disable import/no-webpack-loader-syntax */
import Worker from 'worker-loader!./lottie.worker';
import loadLottie, { AnimationItem, LottiePlayer } from 'lazy-modules/lottie';
import { canvas } from 'core/html';
import { fetchAnimation } from './lottie';

type AnimationProps = {
  paused?: boolean,
  loop?: boolean,
  offscreen?: boolean,
  width: number,
  height: number,
  onLoad?: () => void,
};

/**
 * Worker for offscreen canvas rendering
 */
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
  animation?: AnimationItem;
  transfered?: boolean;
  destroyed?: boolean;

  constructor(src: string, props: AnimationProps) {
    this.id = (count++).toString();
    this.src = src;
    this.state = props;
    this.element = createElement();

    this.element.width = props.width * window.devicePixelRatio;
    this.element.height = props.height * window.devicePixelRatio;
  }

  load() {
    // pass control to worker thread
    if (typeof this.element.transferControlToOffscreen === 'function' && this.state.offscreen) {
      const context = this.element.transferControlToOffscreen();

      getWorker().postMessage({
        id: this.id,
        type: 'init',
        canvas: context,
        src: this.src,
        props: {
          loop: this.state.loop,
          paused: this.state.paused,
          width: this.element.width,
          height: this.element.height,
        },
      }, [context]);

      this.transfered = true;

    // pass control to main thread
    } else {
      Promise.all([
        loadLottie(),
        fetchAnimation(this.src),
      ]).then(([Lottie, animationData]: [LottiePlayer, any]) => {
        if (this.destroyed) return;

        const context = this.element.getContext('2d');
        if (!context) return;

        this.animation = Lottie.loadAnimation({
          renderer: 'canvas',
          loop: this.state.loop,
          autoplay: !this.state.paused,
          animationData,
          rendererSettings: {
            context,
            clearCanvas: true,
          },
        } as any);
      });
    }
  }

  play() {
    // pass control to worker thread
    if (typeof this.element.transferControlToOffscreen === 'function' && this.state.offscreen) {
      getWorker().postMessage({
        id: this.id,
        type: 'play',
      });

      if (!this.transfered) this.load();

    // load animation inside main thread
    } else if (!this.animation) {
      this.state.paused = false;
      this.load();

    // play animation inside main thread
    } else {
      this.animation.play();
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
      this.animation.pause();
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
      this.animation.destroy();
    }
  }

  goTo(value: number, animate: boolean = false) {
    // pass control to worker thread
    if (typeof this.element.transferControlToOffscreen === 'function' && this.state.offscreen) {
      if (!this.transfered) this.load();

      getWorker().postMessage({
        id: this.id,
        type: 'goto',
        value,
        animate,
      });

    // destroy animation inside main thread
    } else if (this.animation) {
      if (this.animation.currentFrame === 0) {
        this.animation.playSegments([0, value + 1], true);
      } else if (value === 0) {
        this.animation.playSegments([this.animation.currentFrame, 0], true);
      } else if (animate) {
        this.animation.playSegments([this.animation.currentFrame, value], true);
      } else {
        this.animation.goToAndStop(value, true);
      }
    }
  }
}
