import { MaybeObservable } from 'core/types';
import { div, img } from 'core/html';
import { useMaybeObservable } from 'core/hooks';
import { setAttribute, setStyle } from 'core/dom';

import idleSrc from './monkey_idle@2x.png';
import trackingSrc from './monkey_tracking@2x.png';
import closeSrc from './monkey_close@2x.png';
import closeAndPeekSrc from './monkey_close_and_peek@2x.png';
import './monkey.scss';

// todo: Replace the PNGs with the TGSs

const states = {
  idle: {
    src: idleSrc,
    width: 135,
  },
  tracking: {
    src: trackingSrc,
    width: 132,
  },
  close: {
    src: closeSrc,
    width: 133,
  },
  closeAndPeek: {
    src: closeAndPeekSrc,
    width: 134,
  },
};

export type State = keyof typeof states;

interface Props {
  state: MaybeObservable<State>;
  className?: string;
}

export default function monkey({ state, className = '' }: Props) {
  const image = img();
  const element = div`.authMonkey ${className}`(image);

  let lastState: State | undefined;

  useMaybeObservable(element, state, (newState) => {
    if (newState === lastState) {
      return;
    }

    lastState = newState;
    const { src, width } = states[newState];
    setAttribute(image, 'src', src);
    setStyle(image, { width: `${width}px` });
  });

  return element;
}
