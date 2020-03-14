import { MaybeObservable } from 'core/types';
import { svgCodeToComponent } from 'core/factory';
import { useMaybeObservable } from 'core/hooks';
import iconCode from './menu_and_back.svg?raw';
import './menu_and_back.scss';

export type State = 'menu' | 'back';

interface Props extends Record<string, any> {
  state: MaybeObservable<State>;
  class?: string;
}

const iconSvg = /*#__PURE__*/svgCodeToComponent(iconCode); // eslint-disable-line spaced-comment

/**
 * And icon that can make an animated transition form "menu" to "back" and vise versa.
 *
 * To colorize, just set the `color` CSS property.
 * To change the transition duration or timing function, set the CSS properties directly to this element.
 */
// eslint-disable-next-line quote-props
export default function menuAndBack({ state, className, 'class': _class, ...props }: Props) {
  const givenClassName = className || _class || '';
  const svgElement = iconSvg({ class: `menuAndBackIcon ${givenClassName}`, ...props });
  let currentState: State | undefined;

  const stateToClass = (_state: State) => `-${_state}`;

  useMaybeObservable(svgElement, state, (newState) => {
    if (newState !== currentState) {
      if (currentState) {
        svgElement.classList.remove(stateToClass(currentState));
      }
      svgElement.classList.add(stateToClass(newState));
      currentState = newState;
    }
  });

  return svgElement;
}
