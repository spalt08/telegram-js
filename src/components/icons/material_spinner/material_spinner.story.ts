/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import centered from '@storybook/addon-centered/html';
import { withKnobs, color as colorKnob, number as numberKnob } from '@storybook/addon-knobs';

import { div } from 'core/html';
import materialSpinner from './material_spinner';

const stories = storiesOf('UI Elements | Icons', module)
  .addDecorator(withKnobs)
  .addDecorator(centered);

stories.add('Material spinner', () => {
  const color = colorKnob('Color', '#4EA4F5');
  const size = numberKnob('Size (px)', 44, {
    min: 1,
    max: 500,
  });

  return div(
    {
      style: { color },
    },
    materialSpinner({
      style: {
        width: `${size}px`,
        height: `${size}px`,
      },
    }),
  );
});
