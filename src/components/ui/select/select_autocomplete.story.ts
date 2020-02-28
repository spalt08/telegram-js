/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { array, text, withKnobs } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';

import selectAutoComplete from './select_autocomplete';

const stories = storiesOf('II. UI Elements | Select', module)
  .addDecorator(withKnobs)
  .addDecorator(centered);

stories.add('Common Usage', () => (
  selectAutoComplete({
    label: text('Label', 'Select fruit'),
    selected: 0,
    options: array('Options', ['Orange', 'Apple', 'Pineapple']),
    onChange: action('input-changed'),
  })
));
