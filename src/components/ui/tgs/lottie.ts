/* eslint-disable no-restricted-globals, no-param-reassign */
import type { LottiePlayer } from 'vendor/lottie-5.6.10';


export async function fetchAnimationData(src: string) {
  return fetch(src).then((response) => response.json());
}

export async function loadAnimation(
  player: LottiePlayer,
  context: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  src: string,
) {
  const data = await fetchAnimationData(src);
  return player.loadAnimation({
    renderer: 'canvas',
    loop: false,
    autoplay: false,
    animationData: data,
    rendererSettings: {
      context,
      clearCanvas: true,
    },
  });
}
