/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, color as colorKnob, number as numberKnob, button } from '@storybook/addon-knobs';
import { withMountTrigger, centered } from 'storybook/decorators';
import { BehaviorSubject } from 'rxjs';

import menuAndBack, { State } from './menu_and_back';

const stories = storiesOf('UI Elements | Icons', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

const state = new BehaviorSubject<State>('menu');
const element = menuAndBack({ state });


stories.add('Menu\'n\'Back', () => {
  button('Toggle State', () => state.next(state.value === 'menu' ? 'back' : 'menu'));

  const color = colorKnob('Color', '#4EA4F5');
  const duration = numberKnob('Transition duration (ms)', -1);
  const size = numberKnob('Size (px)', 24, { min: 1, max: 500 });

  element.style.color = color;
  element.style.width = `${size}px`;
  element.style.height = `${size}px`;
  element.style.transitionDuration = duration >= 0 ? `${duration}ms` : '';

  return element;
});
