/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import selectAutoComplete from './select_autocomplete';

const stories = storiesOf('UI Elements | Select', module)
  .addDecorator(centered);

stories.add('Common Usage', () => (
  selectAutoComplete({
    label: 'Select fruit',
    name: 'Fruits',
    selected: 0,
    options: ['Orange', 'Apple', 'Pineapple'],
  })
));
