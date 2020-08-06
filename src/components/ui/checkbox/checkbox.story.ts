/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { action } from '@storybook/addon-actions';

import checkbox from './checkbox';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(centered);

stories.add('Checkbox', () => (
  checkbox({
    onChange: action('input-changed'),
  })
));
