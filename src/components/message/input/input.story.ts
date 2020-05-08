/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withChatLayout, centered, withMountTrigger } from 'storybook/decorators';
import { number, withKnobs, button } from '@storybook/addon-knobs';
import { div } from 'core/html';
import { mockMessage } from 'mocks/message';
import { me } from 'mocks/user';
import { message } from 'services';
import { messageCache } from 'cache';
import { messageToId } from 'helpers/api';
import messageInput from './input';

// Stories with text
const stories = storiesOf('Layout | Message Write', module)
  .addDecorator(centered)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(withChatLayout);

stories.add('Overall', () => {
  button('Set Reply', () => {
    const msg = mockMessage({ from_id: me.id, to_id: { _: 'peerUser', user_id: me.id } });
    messageCache.put(msg);
    message.setMessageForReply(messageToId(msg));
  });

  return div({ style: { width: `${number('Width', 500)}px`, maxWidth: '100%' } },
    messageInput(),
  );
});
