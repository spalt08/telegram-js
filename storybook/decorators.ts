/* eslint-disable import/no-extraneous-dependencies */

import { StoryContext, StoryFn } from '@storybook/addons';
import { triggerMountRecursive } from 'core/dom';
import { div } from 'core/html';
import chamomile from 'assets/chamomile-blurred.jpg';
import { emptyCache } from 'client/media';
import popup from 'components/popup/popup';
import 'components/routes/home/home.scss';

export function withMountTrigger(getStory: StoryFn<Node>, context: StoryContext) {
  const element = getStory(context);
  triggerMountRecursive(element);
  return element;
}

const centeredWrappers: Record<string, Node> = {};

export function centered(getStory: StoryFn<Node>, context?: StoryContext) {
  const next = getStory(context);

  if (!context) return '';
  if (!centeredWrappers[context.id] || centeredWrappers[context.id].firstChild !== next) {
    centeredWrappers[context.id] = div`.storybook__static-centered`(next);
  }

  return centeredWrappers[context.id];
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

const popupEl = popup();
triggerMountRecursive(popupEl);

export function withChatLayout(creator: () => Node) {
  return (
    div`.home`(
      div`.messages`(
        div`.messages__history`(
          creator(),
        ),
      ),
      popupEl,
    )
  );
}
