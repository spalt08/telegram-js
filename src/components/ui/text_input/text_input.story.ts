/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';

import { withKnobs, text } from '@storybook/addon-knobs';

import textInput from './text_input';

const stories = storiesOf('UI Elements | Text Input', module)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Common Usage', () => (
  textInput({ label: text('Label', 'First Name') })
));
