/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { withMountTrigger, centered, withAuthorized } from 'storybook/decorators';
import { div } from 'core/html';
import dialogsScreen from './dialogs_screen';

const stories = storiesOf('Layout | Sidebar', module)
  .addDecorator(withAuthorized)
  .addDecorator(centered)
  .addDecorator(withMountTrigger);

stories.add('Dailogs', () => div({ style: { width: '400px', height: '100%' } },
  dialogsScreen({
    onNavigate: () => action('navigate'),
  }),
));
