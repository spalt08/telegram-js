/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { div } from 'core/html';
import { withKnobs, boolean, text, number } from '@storybook/addon-knobs';
import { centered } from 'storybook/decorators';
import button from './button';

const stories = storiesOf('Layout|UI Elements', module)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Button', () => div({ style: { width: `${number('Width', 400)}px` } },
  button({ label: text('Label', 'Button Action'), disabled: boolean('Disabled', false), loading: boolean('Loading', false) }),
));
