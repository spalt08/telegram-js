import { inflate } from 'pako';
import lottiePlayer from 'lottie-web';
import { div } from 'core/html';

const load = (url: string, cb: (json: any) => void) => {
  const xhr = new XMLHttpRequest();

  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';
  xhr.send();

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
      const data = inflate(xhr.response, { to: 'string' });
      const json = JSON.parse(data);

      cb(json);
    }
  };
};

interface Props {
  src: string,
  className?: string,
}

export default function tgs({ src, className }: Props) {
  const container = div({ className });
  if (typeof src === 'string') {
    load(src, (animationData: any) => {
      lottiePlayer.loadAnimation({
        container,
        loop: true,
        autoplay: true,
        animationData,
      });
    });
  }

  return container;
}
