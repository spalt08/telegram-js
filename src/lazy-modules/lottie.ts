// Don't use "import ... from 'lottie-web';" otherwise the module wan't be lazy
export default function loadLottie() {
  return import(/* webpackChunkName: "lottie" */ 'vendor/lottie-5.6.10').then((module) => module.default);
}
