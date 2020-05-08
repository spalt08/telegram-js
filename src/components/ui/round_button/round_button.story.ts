/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { action } from '@storybook/addon-actions';
import { withKnobs, select } from '@storybook/addon-knobs';
import { centered, withMountTrigger } from 'storybook/decorators';
import * as icons from 'components/icons';
import roundButton from './round_button';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(withKnobs)
  .addDecorator(withMountTrigger)
  .addDecorator(centered);

stories.add('Round Button', () => {
  const selected = select('Icon', Object.keys(icons), 'back') as keyof typeof icons;
  return roundButton({ onClick: action('Click') }, icons[selected]({} as any));
});
