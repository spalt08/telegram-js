/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, color as colorKnob, number as numberKnob } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';
import { BehaviorSubject } from 'rxjs';

import { button, div, text } from 'core/html';
import menuAndBack, { State } from './menu_and_back';

const stories = storiesOf('UI Elements | Icons', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

const iconState = new BehaviorSubject<State>('menu');

stories.add('Menu\'n\'Back', () => {
  const color = colorKnob('Color', '#4EA4F5');
  const size = numberKnob('Size (px)', 24, {
    min: 1,
    max: 500,
  });
  const transitionDuration = numberKnob('Transition duration (ms)', -1);

  const icon = menuAndBack({
    state: iconState,
    style: {
      width: `${size}px`,
      height: `${size}px`,
      transitionDuration: transitionDuration >= 0 ? `${transitionDuration}ms` : '',
    },
  });

  return div(
    {
      style: {
        color,
        textAlign: 'center',
      },
    },
    div(icon),
    // todo: Move to a knob when Storybook is updated to version 6: https://github.com/storybookjs/storybook/issues/6705
    button({
      onClick() {
        iconState.next(iconState.value === 'menu' ? 'back' : 'menu');
      },
    }, text('Toggle state')),
  );
});
