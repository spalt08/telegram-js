/* eslint-disable import/no-extraneous-dependencies */
import { configure, addParameters } from '@storybook/html';
import { create } from '@storybook/theming';
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
  requirePackages.keys().forEach(requirePackages);
}

configure(loadStories, module);
