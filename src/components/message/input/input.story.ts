/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withChatLayout, centered, withMountTrigger } from 'storybook/decorators';
import { number, withKnobs } from '@storybook/addon-knobs';
import { div } from 'core/html';
import messageInput from './input';

// Stories with text
const stories = storiesOf('Layout | Message Write', module)
  .addDecorator(centered)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout);

stories.add('Overall', () => (
  div({ style: { width: `${number('Width', 500)}px`, maxWidth: '100%' } },
    messageInput(),
  )
));
