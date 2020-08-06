/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { boolean, withKnobs } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';
import monkey from 'assets/monkey_peeking.tgs';

import tgs from './tgs';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs);

stories.add('TGS Player', () => tgs({
  src: monkey,
  autoplay: boolean('Autoplay', true),
  loop: boolean('Loop', true),
}));
