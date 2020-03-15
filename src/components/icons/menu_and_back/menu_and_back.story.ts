/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, color as colorKnob, number as numberKnob } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { button, div, text } from 'core/html';
import menuAndBack from './menu_and_back';

const stories = storiesOf('UI Elements | Icons', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

const iconState = new BehaviorSubject(false);

stories.add('Menu\'n\'Back', () => {
  const color = colorKnob('Color', '#4EA4F5');
  const size = numberKnob('Size (px)', 24, {
    min: 1,
    max: 500,
  });
  const transitionDuration = numberKnob('Transition duration (ms)', -1);
  const iconStyle = {
    width: `${size}px`,
    height: `${size}px`,
    transitionDuration: transitionDuration >= 0 ? `${transitionDuration}ms` : '',
    margin: '0 5px 10px',
  };

  return div(
    {
      style: {
        color,
        textAlign: 'center',
      },
    },
    menuAndBack({
      state: iconState.pipe(map((value) => value ? 'back' : 'menu')),
      style: iconStyle,
    }),
    menuAndBack({
      state: iconState.pipe(map((value) => value ? 'menu' : 'back')),
      style: iconStyle,
    }),
    // todo: Move to a knob when Storybook is updated to version 6: https://github.com/storybookjs/storybook/issues/6705
    div(
      button({
        onClick() {
          iconState.next(!iconState.value);
        },
      }, text('Toggle state')),
    ),
  );
});
