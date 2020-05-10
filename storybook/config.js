/* eslint-disable import/no-extraneous-dependencies */
import { configure, addParameters } from '@storybook/html';
import { create } from '@storybook/theming';
import { userCache, chatCache } from 'cache';
import { users } from 'mocks/user';
import { chats } from 'mocks/chat';
import { channels } from 'mocks/channel';
import 'styles/global.scss';
import './styles.scss';

addParameters({
  options: {
    theme: create({
      base: 'light',
      brandTitle: 'Telegram Web',
    }),
    panelPosition: 'bottom',
    showPanel: true,
  },
});

const requirePackages = require.context('../src/', true, /\.story\.ts$/);

requirePackages.keys().forEach(requirePackages);

function loadStories() {
  userCache.put(users);
  chatCache.put(chats);
  chatCache.put(channels);

  requirePackages.keys().forEach(requirePackages);
}

configure(loadStories, module);
