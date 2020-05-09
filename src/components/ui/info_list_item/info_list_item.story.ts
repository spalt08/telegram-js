/* eslint-disable import/no-extraneous-dependencies */
import { storiesOf } from '@storybook/html';
import { withKnobs, text } from '@storybook/addon-knobs';
import { centered, withKnobWidth } from 'storybook/decorators';
import { info } from 'components/icons';
import infoListItem from './info_list_item';

const stories = storiesOf('Layout | UI Elements', module)
  .addDecorator(withKnobs)
  .addDecorator(withKnobWidth)
  .addDecorator(centered);

stories.add('Info List item', () => infoListItem({ icon: info, label: 'bio', value: text('Value', 'Some bio') }));
