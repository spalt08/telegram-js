import { triggerMount } from 'core/hooks';
import chamomile from 'assets/chamomile-blurred.jpg';
import { fileCache } from 'cache';

export function withMountTrigger(creator: () => Node) {
  const element = creator();
  triggerMount(element);
  return element;
}

export function withEmptyFileCache(creator: () => Node) {
  fileCache.empty();
  return creator();
}

export function withChamomileBackground(creator: () => Node) {
  const div = document.createElement('div');
  div.style.background = `url(${chamomile})`;
  div.style.backgroundSize = 'cover';
  div.style.backgroundPosition = 'center center';
  div.appendChild(creator());
  return div;
}
