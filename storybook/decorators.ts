/* eslint-disable import/no-extraneous-dependencies */

import { StoryContext, StoryFn } from '@storybook/addons';
import { number, select } from '@storybook/addon-knobs';
import { mount, triggerMountRecursive, triggerUnmountRecursive, unmount } from 'core/dom';
import { div } from 'core/html';
import chamomile from 'assets/chamomile-blurred.jpg';
import popup from 'components/popup/popup';
import { BehaviorSubject } from 'rxjs';
import { materialSpinner } from 'components/icons';
import { peers } from 'mocks/peer';
import { peerIdToPeer, peerToId } from 'helpers/api';
import { auth, AuthStage, message } from 'services';
import 'components/home.scss';
import 'styles/global.scss';

export function withMountTrigger(getStory: StoryFn<Node>, context: StoryContext) {
  const element = getStory(context);
  triggerUnmountRecursive(element);
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

export function fullscreen(getStory: StoryFn<Node>, context?: StoryContext) {
  const next = getStory(context);

  if (!centeredWrappers.has(next)) {
    centeredWrappers.set(next, div`.storybook__static-full`(next));
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
      div`.history`(
        creator(),
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

export function withKnobWidth(creator: () => Node) {
  return div({ style: { width: `${number('Width', 400)}px` } }, creator());
}

export function withKnobPeer(creator: () => Node) {
  const peerIds = peers.map(peerToId);
  const peer = select('Peer', peerIds, peerIds[0]);

  message.activePeer.next(peerIdToPeer(peer));

  return creator();
}

export function withAuthorized(creator: () => Node) {
  auth.state.next(AuthStage.Authorized);
  return creator();
}
