/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { array, text, withKnobs } from '@storybook/addon-knobs';
import { action } from '@storybook/addon-actions';

import country, { Country } from 'const/country';
import { div, text as textNode } from 'core/html';
import emoji from '../emoji/emoji';
import selectAutoComplete from './select_autocomplete';

const stories = storiesOf('UI Elements | Select', module)
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

const countryOptionRenderer = ({ phone, label: countryLabel, emoji: emojiStr }: Country) => (
  div`.logincountry`(
    emoji(emojiStr, { className: 'logincountry__flag', lazy: true }),
    div`.logincountry__label`(textNode(countryLabel)),
    div`.logincountry__phone`(textNode(phone)),
  )
);

stories.add('Custom Renderer', () => (
  selectAutoComplete({
    label: 'Country',
    selected: 0,
    options: country,
    optionRenderer: countryOptionRenderer,
    optionLabeler: (data) => data.label,
  })
));
