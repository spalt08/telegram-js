/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { number, boolean, withKnobs } from '@storybook/addon-knobs';

import datetime from './datetime';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Datetime', () => (
  datetime({
    timestamp: number('Timestamp', Math.floor(Date.now() / 1000)),
    date: boolean('Date', false),
    full: boolean('Full', true),
  })
));
