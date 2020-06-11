// Don't use "import ... from 'lottie-web';" otherwise the module wan't be lazy
export type LottiePlayer = typeof import('lottie-web/build/player/lottie_canvas').default;
export type AnimationItem = import('lottie-web/build/player/lottie_canvas').AnimationItem;

export default function loadLottie() {
  return import(/* webpackChunkName: "lottie" */ 'lottie-web/build/player/lottie_canvas').then((module) => module.default);
}
