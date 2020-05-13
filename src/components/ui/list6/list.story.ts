/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withChatLayout } from 'storybook/decorators';
import { text } from 'core/html';
import { loremIpsum } from 'lorem-ipsum';
import { getInterface } from 'core/hooks';
import groupWithDate from './group_with_date';
import groupWithAvatar from './group_with_avatar';
import { bubble } from '..';
import list from './list';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(withChatLayout);

stories.add('List 6', () => {
  const l = list();
  let date = new Date().getTime();
  for (let k = 0; k < 10; k++) {
    const group = groupWithDate(date);
    const groupKey = Math.random();
    date += 24 * 60 * 60 * 1000;
    for (let i = 0; i < Math.round(Math.random() * 9 + 1); i++) {
      const avatarGroup = groupWithAvatar(1 + Math.round(Math.random() * 2));
      const avatarGroupKey = Math.random();
      const messagesCount = Math.round(Math.random() * 9 + 1);
      for (let j = 0; j < messagesCount; j++) {
        const itemKey = Math.random();
        const b = bubble({}, text(loremIpsum()));
        b.style.margin = '4px';
        b.style.width = 'fit-content';
        b.style.maxWidth = '500px';

        getInterface(b).updateBorders(j === 0, j === messagesCount - 1);
        getInterface(avatarGroup).addItem([itemKey], b);
      }
      getInterface(group).addItem([avatarGroupKey], avatarGroup);
    }
    getInterface(l).addItem([groupKey], group);
  }
  return l;
});
