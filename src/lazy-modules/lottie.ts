// Don't import the Lottie types here otherwise the module wan't be lazy
export type LottiePlayer = typeof import('lottie-web').default & { freeze(): void, unfreeze(): void };

export default function loadLottie() {
  return import(/* webpackChunkName: "lottie" */ 'lottie-web/build/player/lottie_canvas').then((module) => module.default as LottiePlayer);
}
