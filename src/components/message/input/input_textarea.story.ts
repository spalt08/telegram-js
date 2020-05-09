/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { centered } from 'storybook/decorators';
import { action } from '@storybook/addon-actions';
import { number, withKnobs } from '@storybook/addon-knobs';
import { div } from 'core/html';
import messageTextarea from './input_textarea';

// Stories with text
const stories = storiesOf('Layout | History / Message Write', module)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Textarea', () => div(messageTextarea({
  onSend: action('send'),
  maxHeight: number('Max Height', 400),
})));
