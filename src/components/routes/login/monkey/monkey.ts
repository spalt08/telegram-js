import { inflate } from 'pako';
import lottiePlayer from 'lottie-web';
import { div } from 'core/html';
import tracking from './tracking.tgs';
import './monkey.scss';

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

export default function monkey() {
  const container = div`.monkey`();

  load(tracking, (animationData: any) => {
    lottiePlayer.loadAnimation({
      container,
      loop: true,
      autoplay: true,
      animationData,
    });
  });

  return container;
}
