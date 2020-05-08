/* eslint-disable import/no-extraneous-dependencies,no-console */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { centered } from 'storybook/decorators';
import { div } from 'core/html';
import { getInterface } from 'core/hooks';
import { number, withKnobs } from '@storybook/addon-knobs';
import audioSeekbar from './audio_seekbar';

const stories = storiesOf('Layout|UI Elements/Audio', module)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('SeekBar', () => {
  const element = audioSeekbar(action('seek'));

  getInterface(element).updateProgress(number('Progress', 0.5));

  return div({ style: { width: 300 } }, element);
});
