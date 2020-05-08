/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { centered, withMountTrigger } from 'storybook/decorators';
import { div } from 'core/html';
import * as icons from 'components/icons';
import { withContextMenu, useContextMenu } from './global_context_menu';

const stories = storiesOf('Layout | Other', module)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

stories.add('Global Context Menu', () => {
  const left = div({ style: { width: '50%', height: '100%', background: 'rgb(227, 222, 251)' } });
  const right = div({ style: { width: '50%', height: '100%', background: 'rgb(207, 255, 220)' } });

  useContextMenu(left, [
    { icon: icons.group, label: 'New Group', onClick: action('left-click') },
    { icon: icons.user, label: 'Contacts', onClick: action('left-click') },
  ]);

  useContextMenu(right, [
    { icon: icons.archive, label: 'Archived', onClick: action('right-click') },
    { icon: icons.savedmessages, label: 'Saved', onClick: action('right-click') },
  ]);

  return withContextMenu(
    div({ style: { width: '100%', height: '100%', display: 'flex', flexWrap: 'wrap' } },
      left,
      right,
    ),
  );
});
