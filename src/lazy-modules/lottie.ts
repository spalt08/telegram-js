export default function loadLottie() {
  return import(/* webpackChunkName: "lottie" */ 'lottie-web').then((module) => module.default);
}
