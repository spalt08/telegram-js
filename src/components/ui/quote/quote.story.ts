/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, text } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';

import quote from './quote';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

stories.add('Quote', () => (
  quote(
    text('Title', 'Mark Ronson'),
    text('Content', 'Example text goes here'),
  )
));
