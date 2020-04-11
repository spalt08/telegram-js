import { MaybeObservable } from 'core/types';
import { em, span } from 'core/html';
import { useMaybeObservable } from 'core/hooks';
import './menu_and_back.scss';

export type State = 'menu' | 'back';

interface Props extends Record<string, any> {
  state: MaybeObservable<State>;
  class?: string;
}

/**
 * And icon that can make an animated transition form "menu" to "back" and vise versa.
 *
 * To colorize, just set the `color` CSS property.
 * To change the transition duration or timing function, set the CSS properties directly to this element.
 * To change the size set the `font-size` CSS property.
 */
// eslint-disable-next-line quote-props
export default function menuAndBack({ state, className, 'class': _class, ...props }: Props) {
  const givenClassName = className || _class || '';
  const element = span`.menuAndBackIcon ${givenClassName}`(
    props,
    span(em(), em(), em()), // The HTML animation works much smoother than an SVG animation in the global search transition
  );
  let currentState: State | undefined;

  const stateToClass = (_state: State) => `-${_state}`;

  useMaybeObservable(element, state, (newState) => {
    if (newState !== currentState) {
      if (currentState) {
        element.classList.remove(stateToClass(currentState));
      }
      element.classList.add(stateToClass(newState));
      currentState = newState;
    }
  });

  return element;
}
