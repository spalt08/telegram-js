/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import * as knobs from '@storybook/addon-knobs';
import { centered, withMountTrigger } from 'storybook/decorators';
import { BehaviorSubject } from 'rxjs';
import { div } from 'core/html';
import { getInterface } from 'core/hooks';
import searchInput from './search_input';

const stories = storiesOf('UI Elements | Search Input', module)
  .addDecorator(knobs.withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

const placeholder = new BehaviorSubject('');
const isLoading = new BehaviorSubject(false);
const input = searchInput({
  placeholder,
  isLoading,
  onChange: action('change'),
  onFocus: action('focus'),
  onBlur: action('blur'),
});
const element = div(input);

stories.add('Common', () => {
  getInterface(input).value = knobs.text('Initial value', 'A very long long long long text');
  placeholder.next(knobs.text('Placeholder', 'Search'));
  isLoading.next(knobs.boolean('Loading', false));
  element.style.width = `${knobs.number('Width (px)', 265, { min: 0 })}px`;

  return element;
});
