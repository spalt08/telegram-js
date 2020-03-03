import { triggerMount } from '../src/core/hooks';
import chamomile from '../src/assets/chamomile-blurred.jpg';

export function withMountTrigger(creator: () => Node) {
  const element = creator();
  triggerMount(element);
  return element;
}

export function withChamomileBackground(creator: () => Node) {
  const div = document.createElement('div');
  div.style.background = `url(${chamomile})`;
  div.style.backgroundSize = 'cover';
  div.style.backgroundPosition = 'center center';
  div.appendChild(creator());
  return div;
}
