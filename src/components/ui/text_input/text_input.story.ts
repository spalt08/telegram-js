/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, text } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';

import textInput from './text_input';

const stories = storiesOf('Layout | UI Elements / Inputs', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs);

stories.add('Text', () => (
  textInput({ label: text('Label', 'First Name') })
));
