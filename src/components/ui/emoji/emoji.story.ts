/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { text, withKnobs } from '@storybook/addon-knobs';

import emoji from './emoji';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Emoji', () => (
  emoji(text('Emoji', '🙂'))
));
