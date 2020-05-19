/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { number, withKnobs } from '@storybook/addon-knobs';
import { withChatLayout, withMountTrigger } from 'storybook/decorators';
import { text, div, button } from 'core/html';
import { mount } from 'core/dom';
import { loremIpsum } from 'lorem-ipsum';
import { getInterface } from 'core/hooks';
import groupWithDate from './group_with_date';
import groupWithAvatar from './group_with_avatar';
import bubble from '../bubble/bubble';
import list from './list';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs)
  .addDecorator(withChatLayout);

function createBubble(first: boolean, last: boolean) {
  const b = bubble({}, div({ style: { padding: '4px' } }, text(loremIpsum())));
  b.style.width = 'fit-content';
  b.style.maxWidth = '500px';
  const item = div(b);
  item.style.padding = '2px';
  getInterface(b).updateBorders(first, last);
  return item;
}

function createAvatarGroup(userId: number, messageCount: number) {
  const avatarGroup = groupWithAvatar(1 + Math.round(Math.random() * 2));
  const messages: Element[] = [];
  for (let j = 0; j < messageCount; j++) {
    messages.push(createBubble(j === 0, j === messageCount - 1));
  }
  getInterface(avatarGroup).insert(0, ...messages);
  return avatarGroup;
}

function createDateGroup(date: number, avatarGroupCount: number, messageCount: number) {
  const group = groupWithDate(date);
  const avatarGroups: Element[] = [];
  for (let i = 0; i < avatarGroupCount; i++) {
    avatarGroups.push(createAvatarGroup(1 + Math.round(Math.random() * 2), messageCount));
  }
  getInterface(group).insert(0, ...avatarGroups);
  return group;
}

stories.add('List 6', () => {
  const l = list();
  let date = new Date().getTime();
  const days = number('Days', 10);
  const messageGroups = number('Message Groups per Day', 10);
  const messagesPerGroup = number('Messages per Group', 10);
  for (let k = 0; k < days; k++) {
    getInterface(l).insert(k, createDateGroup(date, messageGroups, messagesPerGroup));
    date += 24 * 60 * 60 * 1000;
  }
  const addTopGroupButton = button(text('Add Top Group'));

  addTopGroupButton.onmousedown = () => {
    const start = performance.now();
    getInterface(l).insert(0, createDateGroup(date, messageGroups, messagesPerGroup));
    date += 24 * 60 * 60 * 1000;
    const end = performance.now();
    console.log('Elapsed', end - start);
  };

  const addBottomGroupButton = button(text('Add Bottom Group'));

  addBottomGroupButton.onmousedown = () => {
    const start = performance.now();
    getInterface(l).insert(getInterface(l).size(), createDateGroup(date, messageGroups, messagesPerGroup));
    date += 24 * 60 * 60 * 1000;
    const end = performance.now();
    console.log('Elapsed', end - start);
  };

  const result = div(
    {
      style: {
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
      },
    },
    div(addTopGroupButton),
    div(addBottomGroupButton),
  );
  setTimeout(() => {
    mount(result, l);
  });

  return result;
});
