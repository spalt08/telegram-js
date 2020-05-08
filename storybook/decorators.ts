/* eslint-disable import/no-extraneous-dependencies */

import { StoryContext, StoryFn } from '@storybook/addons';
import { triggerMountRecursive, unmount, mount } from 'core/dom';
import { div } from 'core/html';
import chamomile from 'assets/chamomile-blurred.jpg';
import popup from 'components/popup/popup';
import 'components/routes/home/home.scss';
import { BehaviorSubject } from 'rxjs';
import { materialSpinner } from 'components/icons';

export function withMountTrigger(getStory: StoryFn<Node>, context: StoryContext) {
  const element = getStory(context);
  triggerMountRecursive(element);
  return element;
}

const centeredWrappers = new WeakMap<Node, Node>();

/**
 * Use it instead of @storybook/addon-centered/html when you need the story DOM to be not reattached on a knob change
 */
export function centered(getStory: StoryFn<Node>, context?: StoryContext) {
  const next = getStory(context);

  if (!centeredWrappers.has(next)) {
    centeredWrappers.set(next, div`.storybook__static-centered`(next));
  }

  return centeredWrappers.get(next)!;
}

export function withEmptyFileCache(creator: () => Node) {
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

export function behaviourRenderer<T>(subject: BehaviorSubject<T | null>, renderer: (next: T) => Node) {
  const loader = materialSpinner({});
  const container = div(loader);

  subject.subscribe((next) => {
    if (next !== null) {
      unmount(loader);
      mount(container, renderer(next));
    }
  });

  return container;
}
