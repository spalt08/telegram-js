import { triggerMountRecursive } from 'core/dom';
import { div } from 'core/html';
import chamomile from 'assets/chamomile-blurred.jpg';
import { emptyCache } from 'client/media';
import 'components/routes/home/home.scss';

export function withMountTrigger(creator: () => Node) {
  const element = creator();
  triggerMountRecursive(element);
  return element;
}

export function withEmptyFileCache(creator: () => Node) {
  emptyCache();
  return creator();
}

export function withChamomileBackground(creator: () => Node) {
  const el = document.createElement('div');
  el.style.background = `url(${chamomile})`;
  el.style.backgroundSize = 'cover';
  el.style.backgroundPosition = 'center center';
  el.appendChild(creator());
  return el;
}

export function withChatLayout(creator: () => Node) {
  return (
    div`.home`(
      div`.messages`(
        div`.messages__history`(
          creator(),
        ),
      ),
    )
  );
}
