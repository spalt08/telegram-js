/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { centered, withMountTrigger } from 'storybook/decorators';
import { withKnobs, button } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';
import { getInterface } from 'core/hooks';
import recordSendButton from './button';

// Stories with text
const stories = storiesOf('Layout | History / Message Write', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs);

const element = recordSendButton({
  onMessage: action('message'),
  onAudio: action('audio'),
});

stories.add('Record Button', () => {
  button('Message', () => getInterface(element).message());
  button('Audio', () => getInterface(element).audio());

  return element;
});
