/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, text } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';
import { centered, withKnobWidth } from 'storybook/decorators';
import * as icons from 'components/icons';
import { div } from 'core/html';
import heading from './heading';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(withKnobs)
  .addDecorator(withKnobWidth)
  .addDecorator(centered);

stories.add('Heading', () => div(
  heading({
    title: text('Title', 'Heading'),
    buttons: [
      { icon: icons.back, position: 'left', onClick: action('back') },
      { icon: icons.edit, position: 'right', onClick: action('edit') },
      { icon: icons.more, position: 'right', onClick: action('more') },
    ],
  }),
));
