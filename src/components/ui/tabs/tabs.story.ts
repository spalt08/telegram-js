/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, array, number } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';
import { div, text } from 'core/html';

import tabs from './tabs';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs);

stories.add('Tabs Container', () => {
  const tabsNames = array('Tabs', ['Tab 1', 'Tab 2']);
  const items: Record<string, HTMLElement> = {};

  for (let i = 0; i < tabs.length; i++) items[tabsNames[i]] = div({ style: { width: '100%' } }, text(tabsNames[i]));

  return div(
    { style: {
      width: `${number('Width', 300)}px`,
      height: `${number('Height', 300)}px`,
      border: '1px solid #dedfe2',
      borderRadius: '10px',
    } },
    tabs({}, items),
  );
});
