/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import * as knobs from '@storybook/addon-knobs';
import { withMountTrigger, centered } from 'storybook/decorators';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { div } from 'core/html';
import menuAndBack from './menu_and_back';

const stories = storiesOf('Layout | UI Elements / Icons', module)
  .addDecorator(knobs.withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

const iconState = new BehaviorSubject(false);
const icons = [
  menuAndBack({
    state: iconState.pipe(map((value) => value ? 'back' : 'menu')),
    style: {
      marginInlineEnd: '10px',
    },
  }),
  menuAndBack({
    state: iconState.pipe(map((value) => value ? 'menu' : 'back')),
  }),
];
const element = div(...icons);

stories.add('Menu\'n\'Back', () => {
  const toggleState = knobs.boolean('Toggle state', false); // button knob isn't used because it gives an animation lag a moment after a click
  const color = knobs.color('Color', '#4EA4F5');
  const duration = knobs.number('Transition duration (ms)', -1);

  iconState.next(toggleState);
  element.style.color = color; // Important to set the color on a parent to check that the color is inherited
  icons.forEach((icon) => {
    // eslint-disable-next-line no-param-reassign
    icon.style.transitionDuration = duration >= 0 ? `${duration}ms` : '';
  });

  return element;
});
