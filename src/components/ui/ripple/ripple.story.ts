/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { withKnobs, text, number } from '@storybook/addon-knobs';
import { centered, withMountTrigger } from 'storybook/decorators';
import ripple from './ripple';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

stories.add('Ripple', () => (
  ripple({
    tag: text('Tag', 'div') as any,
    onClick: action('click'),
    style: {
      width: `${number('Width', 300)}px`,
      height: `${number('Height', 80)}px`,
    },
  })
));
