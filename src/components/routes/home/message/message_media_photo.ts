import { hex } from 'mtproto-js';
import { Photo } from 'cache/types';
import { text, div, img } from 'core/html';
import { materialSpinner } from 'components/icons';
import { mount } from 'core/dom';
import { strippedToBlob } from 'helpers/photo';
import { blobToUrl } from 'helpers/files';

export default function messageMediaPhoto(photo: Photo) {
  console.log(photo);

  if (photo._ === 'photo') {
    const container = div`.media`(
      materialSpinner({ className: 'media__loader' }),
    );

    for (let i = 0; i < photo.sizes.length; i += 1) {
      const size = photo.sizes[i];
      if (size._ === 'photoStrippedSize') {
        const thumbnail = div`.media__thumbnail${size.type}`();
        mount(container, thumbnail);

        const blob = strippedToBlob(size.bytes);
        const src = blobToUrl(blob);

        mount(thumbnail, img({ src }));
      }
    }

    return container;
  }
  return text('');
}
