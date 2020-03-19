/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { centered } from 'storybook/decorators';
import * as knobs from '@storybook/addon-knobs';

import { div } from 'core/html';
import materialSpinner from './material_spinner';

const stories = storiesOf('UI Elements | Icons', module)
  .addDecorator(knobs.withKnobs)
  .addDecorator(centered);

const icon = materialSpinner();
const element = div(icon);

stories.add('Material spinner', () => {
  const color = knobs.color('Color', '#4EA4F5');
  const size = knobs.number('Size (px)', 44, { min: 1, max: 500 });

  element.style.color = color; // Important to set the color on a parent to check that the color is inherited
  icon.style.width = `${size}px`;
  icon.style.height = `${size}px`;

  return element;
});
