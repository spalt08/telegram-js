/* eslint-disable import/no-extraneous-dependencies */
import { Photo } from 'mtproto-js';
import { storiesOf } from '@storybook/html';
import { number, select, withKnobs } from '@storybook/addon-knobs';
import { MockedPhotos } from 'mocks/storybook';
import { withMountTrigger, behaviourRenderer, centered } from 'storybook/decorators';
import photoRenderer from './photo';
import photoRenderer2 from './photo2';


const stories = storiesOf('Layout | Media / Photo', module)
  .addDecorator(withMountTrigger)
  .addDecorator(centered)
  .addDecorator(withKnobs);

stories.add('Square', () => {
  const fit = select('Fit Mode', ['cover', 'contain'], 'cover');
  const width = number('Width', 320);
  const height = number('Height', 320);

  return behaviourRenderer<Photo.photo>(MockedPhotos.Square.subject, (photo) => photoRenderer(photo, { fit, width, height }));
});

stories.add('Landscape', () => {
  const fit = select('Fit Mode', ['cover', 'contain'], 'contain');
  const width = number('Width', 320);
  const height = number('Height', 320);

  return behaviourRenderer<Photo.photo>(MockedPhotos.Landscape.subject, (photo) => photoRenderer(photo, { fit, width, minHeight: height }));
});

stories.add('Portrait', () => {
  const fit = select('Fit Mode', ['cover', 'contain'], 'contain');
  const width = number('Width', 320);
  const height = number('Height', 320);

  return behaviourRenderer<Photo.photo>(MockedPhotos.Portrait.subject, (photo) => photoRenderer(photo, { fit, minWidth: width, height }));
});

stories.add('Photo2', () => {
  const fit = select('Fit Mode', ['cover', 'contain'], 'contain');
  const width = number('Width', 320);
  const height = number('Height', 320);

  return behaviourRenderer<Photo.photo>(MockedPhotos.Portrait.subject, (photo) => photoRenderer2(photo, { fit, minWidth: width, height }));
});
