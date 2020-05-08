/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, text } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';
import { centered } from 'storybook/decorators';
import { div } from 'core/html';
import heading from './heading';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Heading', () => div(
  heading({ title: text('Title', 'Heading'), onClick: action('Click') }),
));
