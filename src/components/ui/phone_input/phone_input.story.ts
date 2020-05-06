/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { array, text, withKnobs } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';
import { withMountTrigger } from 'storybook/decorators';
import phoneInput from './phone_input';

const stories = storiesOf('Layout | UI Elements / Inputs', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

stories.add('Phone', () => (
  phoneInput({
    label: text('Label', 'Phone'),
    prefix: text('Code', '+44'),
    formats: array('Formats', [9, 'dddd ddddd', 10, 'ddd ddd dddd'] as any),
    onChange: action('input-changed'),
  })
));
