/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { button, withKnobs } from '@storybook/addon-knobs';
import { centered, withMountTrigger } from 'storybook/decorators';
import { settings, archive, group, user, savedmessages, help } from 'components/icons';
import { getInterface } from 'core/hooks';
import contextMenu from './context_menu';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(withMountTrigger)
  .addDecorator(withKnobs)
  .addDecorator(centered);

const element = contextMenu({
  opened: true,
  onClose: action('close'),
  options: [
    { icon: group, label: 'New Group', onClick: action('group-click') },
    { icon: user, label: 'Contacts', onClick: action('contacts-click') },
    { icon: archive, label: 'Archived', onClick: action('archived-click') },
    { icon: savedmessages, label: 'Saved', onClick: action('saved-click') },
    { icon: settings, label: 'Settings', onClick: action('settings-click') },
    { icon: help, label: 'Help', onClick: action('help-click') },
  ],
});

stories.add('Context Menu', () => {
  button('Open', getInterface(element).open);
  button('Close', getInterface(element).close);

  return element;
});
