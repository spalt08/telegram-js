/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { withMountTrigger, centered } from 'storybook/decorators';
import { div } from 'core/html';
import dialogs from './dialogs';

const stories = storiesOf('Layout | Sidebar', module)
  .addDecorator(centered)
  .addDecorator(withMountTrigger);

stories.add('Dailogs', () => div({ style: { width: '400px', height: '100%' } },
  dialogs({
    onNavigate: () => action('navigate'),
  }),
));
