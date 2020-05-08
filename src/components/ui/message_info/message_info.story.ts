/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, number, boolean, text, optionsKnob } from '@storybook/addon-knobs';
import { mockMessage } from 'mocks/message';
import messageInfo from './message_info';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Message Info', () => {
  const msg = mockMessage({ from_id: 0, to_id: { _: 'peerUser', user_id: 0 }, message: boolean('Only Media', false) ? '' : 'some text' });

  msg.views = number('Views', 135600);
  msg.post_author = text('Post Author', 'Walter White');
  msg.out = boolean('Out', false);

  const status = optionsKnob('Status', { Sending: 'sending', Unread: 'unread', Read: 'read', Error: 'error' }, 'unread', { display: 'inline-radio' });

  if (boolean('Edited', false)) {
    msg.edit_date = msg.date + 10000;
  }

  const messageInfoControl = messageInfo({ status }, msg);
  const maxWidth = number('Max width (px)', 300, { range: true, min: 1, max: 500 });

  if (maxWidth > 0) {
    messageInfoControl.style.maxWidth = `${maxWidth}px`;
  }

  return messageInfoControl;
});
