/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withMountTrigger } from 'storybook/decorators';
import { button, withKnobs } from '@storybook/addon-knobs';
import { getInterface } from 'core/hooks';
import monkey from './monkey';

const stories = storiesOf('Login | Monkey', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs)
  .addDecorator(centered);

const element = monkey();
const elInterface = getInterface(element);

stories.add('Interactive', () => {
  button('Peek', elInterface.peek);
  button('Un peek', elInterface.unpeek);
  button('Close Eyes', elInterface.closeEyes);

  return element;
});
