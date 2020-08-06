/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, array, number, select } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';
import { div, text } from 'core/html';

import tabs from './tabs';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs);

stories.add('Tabs Container', () => {
  const tabsNames = array('Tabs', ['Tab 1', 'Tab 2 (4)', 'Tab 3']);
  const items = tabsNames.map((name, index) => {
    const badgeMatch = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(name);
    return {
      key: `tab_${index}`,
      title: badgeMatch ? badgeMatch[1] : name,
      badge: badgeMatch ? badgeMatch[2] : undefined,
      content: () => div({ style: { width: '100%' } }, text(name)),
    };
  });

  return div(
    { style: {
      width: `${number('Width', 300)}px`,
      height: `${number('Height', 300)}px`,
      border: '1px solid #dedfe2',
      borderRadius: '10px',
    } },
    tabs({
      headerAlign: select('Align', { Center: 'center', 'Space between': 'space-between', Stretch: 'stretch' }, 'center'),
    }, items),
  );
});
