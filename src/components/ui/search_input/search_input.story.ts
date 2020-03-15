/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { action } from '@storybook/addon-actions';
import { withKnobs, boolean as booleanKnob, number as numberKnob, text as textKnob } from '@storybook/addon-knobs';
import { withMountTrigger } from 'storybook/decorators';

import { div } from 'core/html';
import { getInterface } from 'core/hooks';
import searchInput from './search_input';

const stories = storiesOf('UI Elements | Search Input', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

stories.add('Common', () => {
  const value = textKnob('Initial value', 'A very long long long long text');
  const placeholder = textKnob('Placeholder', 'Search');
  const isLoading = booleanKnob('Loading', false);
  const width = numberKnob('Width (px)', 265, { min: 0 });

  const input = searchInput({
    placeholder,
    isLoading,
    onChange: action('change'),
    onFocus: action('focus'),
    onBlur: action('blur'),
  });
  getInterface(input).value = value;
  return div({
    style: { width: `${width}px` },
  }, input);
});
